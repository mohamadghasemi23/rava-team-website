insert into public.feature_catalog(key,label_fa,label_en,category,commercial,description_fa,description_en) values
('inventory.pro','انبارداری حرفه‌ای','Inventory Pro','commerce',true,'چندانباره، رزرو موجودی، گردش موجودی، انتقال و هشدارهای انبار','Multi-location inventory, reservations, stock ledger, transfers and inventory alerts'),
('procurement.pro','تأمین و خرید حرفه‌ای','Procurement Pro','commerce',true,'تأمین‌کننده، سفارش خرید، دریافت محموله، بهای خرید و مرجوعی تأمین‌کننده','Suppliers, purchase orders, goods receipts, costing and supplier returns')
on conflict(key) do update set label_fa=excluded.label_fa,label_en=excluded.label_en,category=excluded.category,commercial=excluded.commercial,description_fa=excluded.description_fa,description_en=excluded.description_en;

-- Procurement mutates warehouse/cost state and therefore must never operate without both paid capabilities.
create or replace function public.has_procurement_access(p_tenant uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.has_entitlement(p_tenant,'commerce.core') and public.has_entitlement(p_tenant,'inventory.pro') and public.has_entitlement(p_tenant,'procurement.pro');
$$;
revoke all on function public.has_procurement_access(uuid) from public;
grant execute on function public.has_procurement_access(uuid) to authenticated;
