-- Commercial catalog entries for inventory/procurement. Grants remain platform-owner only.
insert into public.feature_catalog(key,label_fa,label_en,category,commercial,description_fa,description_en) values
 ('inventory.pro','انبارداری حرفه‌ای','Inventory Pro','commerce',true,'چندانباره، رزرو موجودی، تاریخچه تغییرات و هشدار موجودی','Multi-location inventory, reservations, stock ledger and low-stock controls'),
 ('procurement.pro','تأمین و خرید حرفه‌ای','Procurement Pro','commerce',true,'تأمین‌کننده، سفارش خرید، دریافت محموله، قیمت خرید و مرجوعی تأمین‌کننده','Suppliers, purchase orders, goods receipts, landed cost foundations and supplier returns')
on conflict(key) do update set label_fa=excluded.label_fa,label_en=excluded.label_en,category=excluded.category,commercial=excluded.commercial,description_fa=excluded.description_fa,description_en=excluded.description_en;

-- Snapshot cost at sale time so later supplier price changes never rewrite historical profit.
alter table public.order_items add column if not exists unit_cost_basis bigint check(unit_cost_basis is null or unit_cost_basis>=0);
alter table public.order_items add column if not exists cost_source text check(cost_source is null or cost_source in('fifo','weighted_average','manual','unknown'));

-- Current weighted inventory cost is useful for planning; realized profit must use order_items.unit_cost_basis.
create or replace view public.current_product_cost_summary with (security_invoker=true) as
select p.tenant_id,p.id as product_id,p.name,
 coalesce(sum(l.quantity_remaining),0)::bigint as costed_units_remaining,
 case when coalesce(sum(l.quantity_remaining),0)>0 then round(sum(l.quantity_remaining::numeric*l.unit_cost::numeric)/sum(l.quantity_remaining)::numeric,0) else null end as weighted_average_unit_cost,
 min(l.unit_cost) filter(where l.quantity_remaining>0) as min_remaining_unit_cost,
 max(l.unit_cost) filter(where l.quantity_remaining>0) as max_remaining_unit_cost
from public.products p left join public.inventory_cost_layers l on l.tenant_id=p.tenant_id and l.product_id=p.id and l.quantity_remaining>0
group by p.tenant_id,p.id,p.name;

create or replace view public.realized_product_profit_summary with (security_invoker=true) as
select o.tenant_id,oi.product_id,p.name,
 coalesce(sum(oi.quantity),0)::bigint as units_sold,
 coalesce(sum(oi.line_total),0)::numeric as revenue,
 coalesce(sum(case when oi.unit_cost_basis is not null then oi.unit_cost_basis*oi.quantity else 0 end),0)::numeric as known_cost,
 count(*) filter(where oi.unit_cost_basis is null)::bigint as lines_missing_cost,
 coalesce(sum(oi.line_total)-sum(case when oi.unit_cost_basis is not null then oi.unit_cost_basis*oi.quantity else 0 end),0)::numeric as gross_profit_before_order_level_adjustments
from public.order_items oi join public.orders o on o.id=oi.order_id left join public.products p on p.id=oi.product_id
where o.status not in('cancelled','refunded')
group by o.tenant_id,oi.product_id,p.name;
