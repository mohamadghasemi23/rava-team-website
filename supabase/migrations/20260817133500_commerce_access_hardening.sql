-- Harden Commerce RLS behind one authenticated database gate.
-- This wrapper is SECURITY DEFINER only to read private entitlement helpers; it validates auth.uid(),
-- derives organization from the site, and never accepts organization identity from the caller.

create or replace function public.has_commerce_access(p_site_id uuid,p_permission text)
returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare v_org uuid; v_ent record;
begin
  if auth.uid() is null then return false; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null then return false; end if;
  if not public.has_permission(p_permission,v_org,p_site_id) then return false; end if;
  select * into v_ent from private.resolve_site_entitlement(p_site_id,'commerce',now()) limit 1;
  return coalesce(v_ent.allowed,false);
end;
$$;

revoke all on function public.has_commerce_access(uuid,text) from public,anon;
grant execute on function public.has_commerce_access(uuid,text) to authenticated;

-- Replace policies created by the Commerce Core migration with the hardened public gate.
drop policy if exists commerce_products_read on public.commerce_products;
drop policy if exists commerce_products_manage on public.commerce_products;
create policy commerce_products_read on public.commerce_products for select to authenticated
using(public.has_commerce_access(site_id,'commerce.view') or public.has_commerce_access(site_id,'commerce.products.manage') or public.has_commerce_access(site_id,'commerce.manage'));
create policy commerce_products_manage on public.commerce_products for all to authenticated
using(public.has_commerce_access(site_id,'commerce.products.manage') or public.has_commerce_access(site_id,'commerce.manage'))
with check(public.has_commerce_access(site_id,'commerce.products.manage') or public.has_commerce_access(site_id,'commerce.manage'));

drop policy if exists commerce_variants_read on public.commerce_variants;
drop policy if exists commerce_variants_manage on public.commerce_variants;
create policy commerce_variants_read on public.commerce_variants for select to authenticated
using(public.has_commerce_access(site_id,'commerce.view') or public.has_commerce_access(site_id,'commerce.products.manage') or public.has_commerce_access(site_id,'commerce.manage'));
create policy commerce_variants_manage on public.commerce_variants for all to authenticated
using(public.has_commerce_access(site_id,'commerce.products.manage') or public.has_commerce_access(site_id,'commerce.manage'))
with check(public.has_commerce_access(site_id,'commerce.products.manage') or public.has_commerce_access(site_id,'commerce.manage'));

drop policy if exists commerce_prices_read on public.commerce_prices;
drop policy if exists commerce_prices_manage on public.commerce_prices;
create policy commerce_prices_read on public.commerce_prices for select to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and (public.has_commerce_access(v.site_id,'commerce.view') or public.has_commerce_access(v.site_id,'commerce.products.manage') or public.has_commerce_access(v.site_id,'commerce.manage'))));
create policy commerce_prices_manage on public.commerce_prices for all to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and (public.has_commerce_access(v.site_id,'commerce.products.manage') or public.has_commerce_access(v.site_id,'commerce.manage'))))
with check(exists(select 1 from public.commerce_variants v where v.id=variant_id and (public.has_commerce_access(v.site_id,'commerce.products.manage') or public.has_commerce_access(v.site_id,'commerce.manage'))));

drop policy if exists inventory_locations_read on public.inventory_locations;
drop policy if exists inventory_locations_manage on public.inventory_locations;
create policy inventory_locations_read on public.inventory_locations for select to authenticated
using(public.has_commerce_access(site_id,'commerce.view') or public.has_commerce_access(site_id,'commerce.inventory.manage') or public.has_commerce_access(site_id,'commerce.manage'));
create policy inventory_locations_manage on public.inventory_locations for all to authenticated
using(public.has_commerce_access(site_id,'commerce.inventory.manage') or public.has_commerce_access(site_id,'commerce.manage'))
with check(public.has_commerce_access(site_id,'commerce.inventory.manage') or public.has_commerce_access(site_id,'commerce.manage'));

drop policy if exists inventory_levels_read on public.inventory_levels;
drop policy if exists inventory_levels_manage on public.inventory_levels;
create policy inventory_levels_read on public.inventory_levels for select to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and (public.has_commerce_access(v.site_id,'commerce.view') or public.has_commerce_access(v.site_id,'commerce.inventory.manage') or public.has_commerce_access(v.site_id,'commerce.manage'))));
create policy inventory_levels_manage on public.inventory_levels for all to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and (public.has_commerce_access(v.site_id,'commerce.inventory.manage') or public.has_commerce_access(v.site_id,'commerce.manage'))))
with check(exists(select 1 from public.commerce_variants v where v.id=variant_id and (public.has_commerce_access(v.site_id,'commerce.inventory.manage') or public.has_commerce_access(v.site_id,'commerce.manage'))));

drop policy if exists inventory_movements_read on public.inventory_movements;
create policy inventory_movements_read on public.inventory_movements for select to authenticated
using(public.has_commerce_access(site_id,'commerce.view') or public.has_commerce_access(site_id,'commerce.inventory.manage') or public.has_commerce_access(site_id,'commerce.manage'));

drop policy if exists commerce_orders_read on public.commerce_orders;
drop policy if exists commerce_orders_manage on public.commerce_orders;
create policy commerce_orders_read on public.commerce_orders for select to authenticated
using(public.has_commerce_access(site_id,'commerce.orders.view') or public.has_commerce_access(site_id,'commerce.orders.manage') or public.has_commerce_access(site_id,'commerce.manage'));
create policy commerce_orders_manage on public.commerce_orders for all to authenticated
using(public.has_commerce_access(site_id,'commerce.orders.manage') or public.has_commerce_access(site_id,'commerce.manage'))
with check(public.has_commerce_access(site_id,'commerce.orders.manage') or public.has_commerce_access(site_id,'commerce.manage'));

drop policy if exists commerce_order_items_read on public.commerce_order_items;
drop policy if exists commerce_order_items_manage on public.commerce_order_items;
create policy commerce_order_items_read on public.commerce_order_items for select to authenticated
using(exists(select 1 from public.commerce_orders o where o.id=order_id and (public.has_commerce_access(o.site_id,'commerce.orders.view') or public.has_commerce_access(o.site_id,'commerce.orders.manage') or public.has_commerce_access(o.site_id,'commerce.manage'))));
create policy commerce_order_items_manage on public.commerce_order_items for all to authenticated
using(exists(select 1 from public.commerce_orders o where o.id=order_id and (public.has_commerce_access(o.site_id,'commerce.orders.manage') or public.has_commerce_access(o.site_id,'commerce.manage'))))
with check(exists(select 1 from public.commerce_orders o where o.id=order_id and (public.has_commerce_access(o.site_id,'commerce.orders.manage') or public.has_commerce_access(o.site_id,'commerce.manage'))));
