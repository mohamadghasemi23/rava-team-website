-- Manual inventory control: manager freedom without losing auditability.
-- Variant hardening supersedes the legacy product-level uniqueness so one product can hold multiple size/color balances per location.
alter table public.inventory_balances drop constraint if exists inventory_balances_location_id_product_id_key;
create unique index if not exists inventory_balances_location_variant_uq on public.inventory_balances(location_id,variant_id) where variant_id is not null;

create table if not exists public.inventory_manual_adjustments(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,
 location_id uuid not null references public.inventory_locations(id) on delete restrict,variant_id uuid not null references public.product_variants(id) on delete restrict,
 quantity_delta integer not null check(quantity_delta<>0),reason text not null check(length(trim(reason))>=3),reference_type text,reference_id uuid,
 actor_user_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
alter table public.inventory_manual_adjustments enable row level security;
create policy inventory_manual_adjustments_admin on public.inventory_manual_adjustments for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.manual_adjust_inventory(p_tenant uuid,p_location uuid,p_variant uuid,p_delta integer,p_reason text,p_actor uuid default null,p_reference_type text default 'manual',p_reference_id uuid default null) returns integer language plpgsql security definer set search_path=public as $$
declare b public.inventory_balances; product_id uuid; new_on_hand integer;
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 if not public.has_entitlement(p_tenant,'inventory.pro') then raise exception 'inventory_pro_required';end if;
 if p_delta=0 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'invalid_adjustment';end if;
 if not exists(select 1 from public.inventory_locations where id=p_location and tenant_id=p_tenant) then raise exception 'invalid_location';end if;
 select pv.product_id into product_id from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=p_variant and pv.tenant_id=p_tenant and p.tenant_id=p_tenant;
 if product_id is null then raise exception 'invalid_variant';end if;
 insert into public.inventory_balances(tenant_id,location_id,product_id,variant_id,on_hand,reserved,reorder_point)
 values(p_tenant,p_location,product_id,p_variant,0,0,0)
 on conflict(location_id,variant_id) where variant_id is not null do nothing;
 select * into b from public.inventory_balances where tenant_id=p_tenant and location_id=p_location and variant_id=p_variant for update;
 if b.id is null then raise exception 'inventory_balance_unavailable';end if;
 new_on_hand:=b.on_hand+p_delta;if new_on_hand<0 then raise exception 'insufficient_on_hand';end if;
 update public.inventory_balances set on_hand=new_on_hand,updated_at=now() where id=b.id;
 insert into public.inventory_ledger(tenant_id,location_id,product_id,variant_id,movement_type,quantity_delta,reason,reference_type,reference_id,actor_user_id)
 values(p_tenant,p_location,product_id,p_variant,'adjustment',p_delta,left(trim(p_reason),500),left(coalesce(p_reference_type,'manual'),80),p_reference_id,p_actor);
 insert into public.inventory_manual_adjustments(tenant_id,location_id,variant_id,quantity_delta,reason,reference_type,reference_id,actor_user_id)
 values(p_tenant,p_location,p_variant,p_delta,left(trim(p_reason),500),left(coalesce(p_reference_type,'manual'),80),p_reference_id,p_actor);
 return new_on_hand;
end$$;
revoke all on function public.manual_adjust_inventory(uuid,uuid,uuid,integer,text,uuid,text,uuid) from public,anon;
grant execute on function public.manual_adjust_inventory(uuid,uuid,uuid,integer,text,uuid,text,uuid) to authenticated;

create or replace function public.release_order_inventory_manual(p_tenant uuid,p_order uuid,p_reason text,p_actor uuid default null) returns integer language plpgsql security definer set search_path=public as $$declare r record;n integer:=0;begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 if not public.has_entitlement(p_tenant,'inventory.pro') then raise exception 'inventory_pro_required';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason_required';end if;
 if not exists(select 1 from public.orders where id=p_order and tenant_id=p_tenant) then raise exception 'order_not_found';end if;
 for r in select * from public.order_inventory_reservations where tenant_id=p_tenant and order_id=p_order and status='active' for update loop
  update public.order_inventory_reservations set status='released' where id=r.id; n:=n+1;
 end loop;
 insert into public.event_logs(tenant_id,category,event_name,actor_user_id,summary_fa,metadata)
 values(p_tenant,'audit','inventory.order_reservation.manual_release',p_actor,'رزرو موجودی سفارش به‌صورت دستی آزاد شد.',jsonb_build_object('order_id',p_order,'reason',left(trim(p_reason),500),'released_rows',n));
 return n;
end$$;
revoke all on function public.release_order_inventory_manual(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.release_order_inventory_manual(uuid,uuid,text,uuid) to authenticated;
