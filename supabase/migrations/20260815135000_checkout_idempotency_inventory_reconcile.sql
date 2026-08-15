-- Checkout V2: server-only, tenant-bound, idempotent order creation.
create table if not exists public.checkout_order_requests(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 request_key uuid not null,ip_hash text not null,status text not null default 'processing' check(status in('processing','completed','failed')),
 order_id uuid references public.orders(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(tenant_id,request_key)
);
alter table public.checkout_order_requests enable row level security;
create policy checkout_order_requests_admin_read on public.checkout_order_requests for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.create_storefront_order_v2(p_tenant uuid,p_items jsonb,p_customer jsonb,p_ip_hash text,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_req public.checkout_order_requests%rowtype;v_order uuid;v_currency text;v_subtotal numeric(18,2):=0;v_item jsonb;v_variant record;v_qty int;v_count int;v_required record;v_value text;v_reserved bigint;v_expires timestamptz:=now()+interval '15 minutes';
begin
 if p_request_key is null then raise exception 'request_key_required';end if;
 if not public.has_entitlement(p_tenant,'commerce.core') or not exists(select 1 from tenants where id=p_tenant and status='active') then raise exception 'commerce_unavailable';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'invalid_items';end if;
 if jsonb_typeof(p_customer)<>'object' then raise exception 'invalid_customer';end if;
 if p_ip_hash is null or length(p_ip_hash)<32 or length(p_ip_hash)>128 then raise exception 'invalid_request_fingerprint';end if;

 insert into checkout_order_requests(tenant_id,request_key,ip_hash) values(p_tenant,p_request_key,p_ip_hash)
 on conflict(tenant_id,request_key) do nothing;
 select * into v_req from checkout_order_requests where tenant_id=p_tenant and request_key=p_request_key for update;
 if v_req.ip_hash<>p_ip_hash then raise exception 'request_key_mismatch';end if;
 if v_req.status='completed' and v_req.order_id is not null then
   select jsonb_build_object('order_id',o.id,'subtotal',o.subtotal,'total',o.grand_total,'currency',o.currency,'payment_status',o.payment_status,'reservation_expires_at',o.metadata->>'inventory_reserved_until','idempotent_replay',true)
   into v_item from orders o where o.id=v_req.order_id and o.tenant_id=p_tenant;
   if v_item is not null then return v_item;end if;
 end if;
 if v_req.status='processing' and v_req.created_at<now()-interval '5 minutes' then update checkout_order_requests set created_at=now(),updated_at=now() where id=v_req.id;end if;

 select count(*) into v_count from checkout_attempts where tenant_id=p_tenant and ip_hash=p_ip_hash and created_at>now()-interval '10 minutes';
 if v_count>=10 then insert into checkout_attempts(tenant_id,session_hash,ip_hash,user_agent_hash,status,rejection_code) values(p_tenant,'server',p_ip_hash,'server','rate_limited','too_many_attempts');raise exception 'rate_limited';end if;
 for v_required in select field_key,max_length from checkout_fields where tenant_id=p_tenant and enabled=true and required=true loop
   v_value=trim(coalesce(p_customer->>v_required.field_key,''));if v_value='' or length(v_value)>coalesce(v_required.max_length,2000) then raise exception 'invalid_required_field:%',v_required.field_key;end if;
 end loop;
 insert into orders(tenant_id,status,payment_status,currency,subtotal,discount_total,shipping_total,tax_total,grand_total,customer_snapshot,shipping_address,metadata)
 values(p_tenant,'pending','unpaid','IRR',0,0,0,0,0,p_customer,p_customer,jsonb_build_object('inventory_reserved_until',v_expires,'checkout_request_key',p_request_key)) returning id into v_order;

 for v_item in select * from jsonb_array_elements(p_items) loop
   begin v_qty=(v_item->>'quantity')::int;exception when others then raise exception 'invalid_quantity';end;
   if v_qty<1 or v_qty>99 then raise exception 'invalid_quantity';end if;
   select pv.id,pv.product_id,pv.sku,pv.title,pv.price,pv.currency,pv.inventory_quantity,pv.track_inventory,pv.allow_backorder,p.name
   into v_variant from product_variants pv join products p on p.id=pv.product_id and p.tenant_id=p_tenant and p.status='active'
   where pv.tenant_id=p_tenant and pv.id=(v_item->>'variantId')::uuid for update of pv;
   if not found then raise exception 'invalid_variant';end if;
   if v_currency is null then v_currency=v_variant.currency;elsif v_currency<>v_variant.currency then raise exception 'mixed_currency';end if;
   if v_variant.track_inventory and not v_variant.allow_backorder then
     update order_inventory_reservations set status='expired',updated_at=now() where tenant_id=p_tenant and variant_id=v_variant.id and status='active' and expires_at<=now();
     select coalesce(sum(quantity),0) into v_reserved from order_inventory_reservations where tenant_id=p_tenant and variant_id=v_variant.id and status='active' and expires_at>now();
     if v_variant.inventory_quantity-v_reserved<v_qty then raise exception 'insufficient_stock';end if;
     insert into order_inventory_reservations(tenant_id,order_id,variant_id,quantity,expires_at) values(p_tenant,v_order,v_variant.id,v_qty,v_expires);
   end if;
   v_subtotal=v_subtotal+(v_variant.price*v_qty);
   insert into order_items(tenant_id,order_id,product_id,variant_id,title,sku,quantity,unit_price,line_total,snapshot)
   values(p_tenant,v_order,v_variant.product_id,v_variant.id,v_variant.name,v_variant.sku,v_qty,v_variant.price,v_variant.price*v_qty,jsonb_build_object('variant_title',v_variant.title,'currency',v_variant.currency));
 end loop;
 update orders set currency=coalesce(v_currency,'IRR'),subtotal=v_subtotal,grand_total=v_subtotal,updated_at=now() where id=v_order and tenant_id=p_tenant;
 update checkout_order_requests set status='completed',order_id=v_order,updated_at=now() where id=v_req.id;
 insert into checkout_attempts(tenant_id,session_hash,ip_hash,user_agent_hash,status) values(p_tenant,'server',p_ip_hash,'server','order_created');
 return jsonb_build_object('order_id',v_order,'subtotal',v_subtotal,'total',v_subtotal,'currency',coalesce(v_currency,'IRR'),'payment_status','unpaid','reservation_expires_at',v_expires,'idempotent_replay',false);
exception when others then
 if v_order is not null then delete from orders where id=v_order and tenant_id=p_tenant;end if;
 update checkout_order_requests set status='failed',updated_at=now() where tenant_id=p_tenant and request_key=p_request_key and order_id is null;
 raise;
end $$;
revoke all on function public.create_storefront_order_v2(uuid,jsonb,jsonb,text,uuid) from public;
revoke all on function public.create_storefront_order_v2(uuid,jsonb,jsonb,text,uuid) from anon;
revoke all on function public.create_storefront_order_v2(uuid,jsonb,jsonb,text,uuid) from authenticated;

-- Unified admin view: simple variant stock minus active checkout reservations.
create or replace view public.variant_sellable_inventory with (security_invoker=true) as
select pv.tenant_id,pv.id variant_id,pv.product_id,pv.inventory_quantity on_hand,
 coalesce((select sum(r.quantity) from public.order_inventory_reservations r where r.tenant_id=pv.tenant_id and r.variant_id=pv.id and r.status='active' and r.expires_at>now()),0)::bigint reserved,
 case when pv.allow_backorder then null else pv.inventory_quantity-coalesce((select sum(r.quantity) from public.order_inventory_reservations r where r.tenant_id=pv.tenant_id and r.variant_id=pv.id and r.status='active' and r.expires_at>now()),0) end::bigint available,
 pv.track_inventory,pv.allow_backorder
from public.product_variants pv;
