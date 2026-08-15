-- Commerce hardening: public callers may read checkout schema, but order creation is service-only.
-- Inventory is reserved atomically at order creation to prevent overselling under concurrent checkout.

create table if not exists public.order_inventory_reservations(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete restrict,
 order_id uuid not null references public.orders(id) on delete cascade,
 variant_id uuid not null references public.product_variants(id) on delete restrict,
 quantity int not null check(quantity>0),
 status text not null default 'active' check(status in('active','committed','released','expired')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(order_id,variant_id)
);
create index if not exists order_inventory_reservations_variant_idx on public.order_inventory_reservations(tenant_id,variant_id,status,expires_at);
alter table public.order_inventory_reservations enable row level security;
create policy order_inventory_reservations_admin_read on public.order_inventory_reservations for select to authenticated using(public.can_access_tenant(tenant_id,null));

-- Revoke the legacy direct public RPC. Browser requests must use the trusted Next.js checkout endpoint.
revoke all on function public.create_storefront_order(uuid,jsonb,jsonb,text) from public;
revoke all on function public.create_storefront_order(uuid,jsonb,jsonb,text) from anon;
revoke all on function public.create_storefront_order(uuid,jsonb,jsonb,text) from authenticated;

create or replace function public.create_storefront_order(p_tenant uuid,p_items jsonb,p_customer jsonb,p_ip_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_order uuid;v_currency text;v_subtotal numeric(18,2):=0;v_item jsonb;v_variant record;v_qty int;v_count int;v_required record;v_value text;v_reserved bigint;v_expires timestamptz:=now()+interval '15 minutes';
begin
 if not public.has_entitlement(p_tenant,'commerce.core') or not exists(select 1 from tenants where id=p_tenant and status='active') then raise exception 'commerce_unavailable';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'invalid_items';end if;
 if jsonb_typeof(p_customer)<>'object' then raise exception 'invalid_customer';end if;
 if p_ip_hash is null or length(p_ip_hash)<32 or length(p_ip_hash)>128 then raise exception 'invalid_request_fingerprint';end if;
 select count(*) into v_count from checkout_attempts where tenant_id=p_tenant and ip_hash=p_ip_hash and created_at>now()-interval '10 minutes';
 if v_count>=10 then insert into checkout_attempts(tenant_id,session_hash,ip_hash,user_agent_hash,status,rejection_code) values(p_tenant,'server',p_ip_hash,'server','rate_limited','too_many_attempts');raise exception 'rate_limited';end if;
 for v_required in select field_key,max_length from checkout_fields where tenant_id=p_tenant and enabled=true and required=true loop
   v_value=trim(coalesce(p_customer->>v_required.field_key,''));if v_value='' or length(v_value)>coalesce(v_required.max_length,2000) then raise exception 'invalid_required_field:%',v_required.field_key;end if;
 end loop;
 insert into orders(tenant_id,status,payment_status,currency,subtotal,discount_total,shipping_total,tax_total,grand_total,customer_snapshot,shipping_address,metadata)
 values(p_tenant,'pending','unpaid','IRR',0,0,0,0,0,p_customer,p_customer,jsonb_build_object('inventory_reserved_until',v_expires)) returning id into v_order;
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
 insert into checkout_attempts(tenant_id,session_hash,ip_hash,user_agent_hash,status) values(p_tenant,'server',p_ip_hash,'server','order_created');
 return jsonb_build_object('order_id',v_order,'subtotal',v_subtotal,'total',v_subtotal,'currency',coalesce(v_currency,'IRR'),'payment_status','unpaid','reservation_expires_at',v_expires);
exception when others then
 if v_order is not null then delete from orders where id=v_order and tenant_id=p_tenant;end if;raise;
end $$;
revoke all on function public.create_storefront_order(uuid,jsonb,jsonb,text) from public;
-- No anon/authenticated grant. Service role only.

-- Verified payment atomically consumes the reserved stock and finalizes the order.
create or replace function public.commit_verified_payment(p_transaction uuid,p_provider_reference text,p_provider_status text,p_verified_at timestamptz default now()) returns void language plpgsql security definer set search_path=public as $$
declare t public.payment_transactions%rowtype;o public.orders%rowtype;r record;v public.product_variants%rowtype;
begin
 select * into t from public.payment_transactions where id=p_transaction for update;if not found then raise exception 'transaction_not_found';end if;
 if t.status='paid' then return;end if;if t.status not in('created','redirected','callback_received','verifying') then raise exception 'invalid_payment_state';end if;
 select * into o from public.orders where id=t.order_id and tenant_id=t.tenant_id for update;if not found then raise exception 'order_not_found';end if;
 if o.payment_status='paid' then update public.payment_transactions set status='paid',provider_reference=coalesce(provider_reference,p_provider_reference),provider_status=p_provider_status,verified_at=coalesce(verified_at,p_verified_at),updated_at=now() where id=t.id;return;end if;
 if o.grand_total<>t.amount or o.currency<>t.currency then raise exception 'payment_amount_mismatch';end if;
 for r in select * from order_inventory_reservations where order_id=o.id and tenant_id=o.tenant_id and status='active' order by variant_id for update loop
   if r.expires_at<=now() then raise exception 'inventory_reservation_expired';end if;
   select * into v from product_variants where id=r.variant_id and tenant_id=o.tenant_id for update;
   if not found then raise exception 'inventory_variant_missing';end if;
   if v.track_inventory and not v.allow_backorder and v.inventory_quantity<r.quantity then raise exception 'inventory_changed';end if;
   if v.track_inventory then update product_variants set inventory_quantity=inventory_quantity-r.quantity,updated_at=now() where id=v.id and tenant_id=o.tenant_id;end if;
   update order_inventory_reservations set status='committed',updated_at=now() where id=r.id;
 end loop;
 update public.payment_transactions set status='paid',provider_reference=p_provider_reference,provider_status=p_provider_status,verified_at=p_verified_at,updated_at=now() where id=t.id;
 update public.orders set payment_status='paid',status=case when status='pending' then 'confirmed' else status end,paid_at=coalesce(paid_at,p_verified_at),updated_at=now() where id=o.id and tenant_id=o.tenant_id;
 insert into public.payment_events(tenant_id,transaction_id,event_type,payload) values(t.tenant_id,t.id,'payment.verified',jsonb_build_object('order_id',o.id,'amount',t.amount,'currency',t.currency));
end$$;
revoke all on function public.commit_verified_payment(uuid,text,text,timestamptz) from public;

-- International-safe promotion monetary columns: do not assume integer-only currencies.
alter table public.promotions alter column min_subtotal type numeric(18,2) using min_subtotal::numeric;
alter table public.promotions alter column max_discount_amount type numeric(18,2) using max_discount_amount::numeric;
alter table public.promotion_redemptions alter column discount_amount type numeric(18,2) using discount_amount::numeric;
alter table public.order_discounts alter column amount type numeric(18,2) using amount::numeric;
