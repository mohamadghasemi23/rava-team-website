-- Inventory Pro must track variants (size/color/SKU), not only parent products.
alter table public.inventory_balances add column if not exists variant_id uuid references public.product_variants(id) on delete cascade;
alter table public.inventory_ledger add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.inventory_reservations add column if not exists variant_id uuid references public.product_variants(id) on delete cascade;
alter table public.inventory_transfer_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;

-- Backfill legacy product-level rows to the oldest/default variant when one exists.
update public.inventory_balances b set variant_id=(select v.id from public.product_variants v where v.tenant_id=b.tenant_id and v.product_id=b.product_id order by v.created_at,v.id limit 1) where b.variant_id is null;
update public.inventory_ledger l set variant_id=(select v.id from public.product_variants v where v.tenant_id=l.tenant_id and v.product_id=l.product_id order by v.created_at,v.id limit 1) where l.variant_id is null;
update public.inventory_reservations r set variant_id=(select v.id from public.product_variants v where v.tenant_id=r.tenant_id and v.product_id=r.product_id order by v.created_at,v.id limit 1) where r.variant_id is null;

create unique index if not exists inventory_balances_location_variant_uq on public.inventory_balances(location_id,variant_id) where variant_id is not null;
create index if not exists inventory_balances_tenant_variant_idx on public.inventory_balances(tenant_id,variant_id);
create index if not exists inventory_ledger_variant_idx on public.inventory_ledger(tenant_id,variant_id,created_at desc);
create index if not exists inventory_reservations_variant_idx on public.inventory_reservations(tenant_id,variant_id,status,expires_at);

-- Prevent cross-tenant references even if trusted server code has a bug.
create or replace function public.guard_inventory_variant_tenant() returns trigger language plpgsql set search_path=public as $$
declare v_tenant uuid;v_product uuid;l_tenant uuid;
begin
 if new.variant_id is not null then select tenant_id,product_id into v_tenant,v_product from product_variants where id=new.variant_id;if v_tenant is null or v_tenant<>new.tenant_id then raise exception 'inventory_variant_tenant_mismatch';end if;if new.product_id is not null and new.product_id<>v_product then raise exception 'inventory_product_variant_mismatch';end if;end if;
 if tg_table_name in('inventory_balances','inventory_reservations','inventory_ledger') then select tenant_id into l_tenant from inventory_locations where id=new.location_id;if l_tenant is null or l_tenant<>new.tenant_id then raise exception 'inventory_location_tenant_mismatch';end if;end if;
 return new;
end$$;
drop trigger if exists inventory_balances_tenant_guard on public.inventory_balances;create trigger inventory_balances_tenant_guard before insert or update on public.inventory_balances for each row execute function public.guard_inventory_variant_tenant();
drop trigger if exists inventory_ledger_tenant_guard on public.inventory_ledger;create trigger inventory_ledger_tenant_guard before insert or update on public.inventory_ledger for each row execute function public.guard_inventory_variant_tenant();
drop trigger if exists inventory_reservations_tenant_guard on public.inventory_reservations;create trigger inventory_reservations_tenant_guard before insert or update on public.inventory_reservations for each row execute function public.guard_inventory_variant_tenant();

-- Inventory Pro availability per variant/location. Checkout reservations remain separately visible until location allocation is chosen.
create or replace view public.inventory_pro_variant_summary with (security_invoker=true) as
select b.tenant_id,b.location_id,b.variant_id,b.product_id,b.on_hand,b.reserved,(b.on_hand-b.reserved) available,b.reorder_point,b.updated_at,
 pv.sku,pv.title variant_title,p.name product_name,l.name location_name,l.code location_code
from public.inventory_balances b
join public.inventory_locations l on l.id=b.location_id and l.tenant_id=b.tenant_id
left join public.product_variants pv on pv.id=b.variant_id and pv.tenant_id=b.tenant_id
join public.products p on p.id=b.product_id and p.tenant_id=b.tenant_id;
