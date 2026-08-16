-- Return -> Restock -> Refund reconciliation. Manual controls remain auditable and tenant-safe.
create table if not exists public.order_return_item_reconciliations(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,
 return_id uuid not null references public.order_returns(id) on delete restrict,order_id uuid not null references public.orders(id) on delete restrict,
 order_item_id bigint not null references public.order_items(id) on delete restrict,variant_id uuid references public.product_variants(id) on delete set null,
 location_id uuid references public.inventory_locations(id) on delete restrict,good_quantity int not null default 0 check(good_quantity>=0),damaged_quantity int not null default 0 check(damaged_quantity>=0),
 reason text not null,actor_user_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),check(good_quantity+damaged_quantity>0)
);
create index if not exists return_reconcile_lookup_idx on public.order_return_item_reconciliations(tenant_id,return_id,order_item_id,created_at);

create table if not exists public.order_refund_reconciliations(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,
 return_id uuid references public.order_returns(id) on delete set null,order_id uuid not null references public.orders(id) on delete restrict,
 source text not null default 'manual' check(source in('manual','gateway','external')),status text not null default 'planned' check(status in('planned','requested','processing','succeeded','failed','cancelled')),
 amount numeric(20,4) not null check(amount>0),currency text not null,provider_reference text,note text not null default '',actor_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists refund_reconcile_order_idx on public.order_refund_reconciliations(tenant_id,order_id,created_at desc);
alter table public.order_return_item_reconciliations enable row level security;alter table public.order_refund_reconciliations enable row level security;
create policy return_item_reconcile_admin on public.order_return_item_reconciliations for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy refund_reconcile_admin on public.order_refund_reconciliations for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.reconcile_return_inventory(p_tenant uuid,p_return uuid,p_order_item bigint,p_location uuid,p_good int,p_damaged int,p_reason text,p_actor uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare r public.order_returns;oi public.order_items;pv public.product_variants;processed int;bal public.inventory_balances;rid uuid:=gen_random_uuid();
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 if not public.has_entitlement(p_tenant,'inventory.pro') then raise exception 'inventory_pro_required';end if;
 if coalesce(p_good,0)<0 or coalesce(p_damaged,0)<0 or coalesce(p_good,0)+coalesce(p_damaged,0)<=0 then raise exception 'invalid_return_quantities';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason_required';end if;
 select * into r from public.order_returns where id=p_return and tenant_id=p_tenant for update;if r.id is null then raise exception 'return_not_found';end if;
 select * into oi from public.order_items where id=p_order_item and order_id=r.order_id and tenant_id=p_tenant;if oi.id is null then raise exception 'order_item_not_found';end if;
 select coalesce(sum(good_quantity+damaged_quantity),0) into processed from public.order_return_item_reconciliations where tenant_id=p_tenant and return_id=p_return and order_item_id=p_order_item;
 if processed+p_good+p_damaged>oi.quantity then raise exception 'return_quantity_exceeds_ordered';end if;
 if p_good>0 then
  if oi.variant_id is null or p_location is null then raise exception 'restock_requires_variant_and_location';end if;
  if not exists(select 1 from public.inventory_locations where id=p_location and tenant_id=p_tenant and active=true) then raise exception 'invalid_location';end if;
  select * into pv from public.product_variants where id=oi.variant_id and tenant_id=p_tenant;if pv.id is null then raise exception 'variant_not_found';end if;
  insert into public.inventory_balances(tenant_id,location_id,product_id,variant_id,on_hand,reserved,reorder_point) values(p_tenant,p_location,pv.product_id,pv.id,0,0,0) on conflict(location_id,variant_id) where variant_id is not null do nothing;
  select * into bal from public.inventory_balances where tenant_id=p_tenant and location_id=p_location and variant_id=pv.id for update;
  update public.inventory_balances set on_hand=on_hand+p_good,updated_at=now() where id=bal.id;
  insert into public.inventory_ledger(tenant_id,location_id,product_id,variant_id,movement_type,quantity_delta,reference_type,reference_id,reason,actor_user_id) values(p_tenant,p_location,pv.product_id,pv.id,'return',p_good,'order_return',p_return,left(trim(p_reason),500),p_actor);
 end if;
 insert into public.order_return_item_reconciliations(id,tenant_id,return_id,order_id,order_item_id,variant_id,location_id,good_quantity,damaged_quantity,reason,actor_user_id) values(rid,p_tenant,p_return,r.order_id,p_order_item,oi.variant_id,p_location,p_good,p_damaged,left(trim(p_reason),500),p_actor);
 update public.order_returns set status='received',updated_at=now(),note=coalesce(note,'')||case when coalesce(note,'')='' then '' else E'\n' end||'Inventory reconciliation: good='||p_good||', damaged='||p_damaged where id=p_return;
 return rid;
end$$;
revoke all on function public.reconcile_return_inventory(uuid,uuid,bigint,uuid,integer,integer,text,uuid) from public,anon;grant execute on function public.reconcile_return_inventory(uuid,uuid,bigint,uuid,integer,integer,text,uuid) to authenticated;

create or replace function public.record_refund_reconciliation(p_tenant uuid,p_order uuid,p_return uuid,p_source text,p_status text,p_amount numeric,p_currency text,p_reference text,p_note text,p_actor uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.orders;successful numeric(20,4);rid uuid:=gen_random_uuid();
begin
 if not public.can_access_tenant(p_tenant,null) then raise exception 'forbidden';end if;
 if p_source not in('manual','gateway','external') or p_status not in('planned','requested','processing','succeeded','failed','cancelled') then raise exception 'invalid_refund_state';end if;
 if p_amount is null or p_amount<=0 or length(trim(coalesce(p_note,'')))<3 then raise exception 'invalid_refund';end if;
 select * into o from public.orders where id=p_order and tenant_id=p_tenant for update;if o.id is null then raise exception 'order_not_found';end if;
 if upper(p_currency)<>upper(o.currency) then raise exception 'refund_currency_mismatch';end if;
 if p_return is not null and not exists(select 1 from public.order_returns where id=p_return and order_id=p_order and tenant_id=p_tenant) then raise exception 'return_order_mismatch';end if;
 select coalesce(sum(amount),0) into successful from public.order_refund_reconciliations where tenant_id=p_tenant and order_id=p_order and status='succeeded';
 if p_status='succeeded' and successful+p_amount>o.grand_total then raise exception 'refund_exceeds_order_total';end if;
 insert into public.order_refund_reconciliations(id,tenant_id,return_id,order_id,source,status,amount,currency,provider_reference,note,actor_user_id) values(rid,p_tenant,p_return,p_order,p_source,p_status,p_amount,upper(p_currency),nullif(left(trim(coalesce(p_reference,'')),200),''),left(trim(p_note),1000),p_actor);
 if p_status='succeeded' then
  successful:=successful+p_amount;
  update public.orders set payment_status=case when successful>=grand_total then 'refunded' else 'partially_refunded' end,updated_at=now() where id=p_order;
  if p_return is not null then update public.order_returns set status='refunded',refund_amount=successful,currency=o.currency,updated_at=now() where id=p_return;end if;
 end if;
 return rid;
end$$;
revoke all on function public.record_refund_reconciliation(uuid,uuid,uuid,text,text,numeric,text,text,text,uuid) from public,anon;grant execute on function public.record_refund_reconciliation(uuid,uuid,uuid,text,text,numeric,text,text,text,uuid) to authenticated;
