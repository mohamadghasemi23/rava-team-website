create or replace view public.product_commerce_summary with (security_invoker=true) as
select p.tenant_id,p.id as product_id,p.name,p.slug,p.status,
 coalesce((select sum(v.inventory_quantity) from public.product_variants v where v.tenant_id=p.tenant_id and v.product_id=p.id),0)::bigint as stock_quantity,
 coalesce(sum(m.views),0)::bigint as views,
 coalesce(sum(m.add_to_carts),0)::bigint as add_to_carts,
 coalesce(sum(m.checkout_starts),0)::bigint as checkout_starts,
 coalesce(sum(m.orders),0)::bigint as orders,
 coalesce(sum(m.units_sold),0)::bigint as units_sold,
 coalesce(sum(m.gross_revenue),0)::bigint as gross_revenue,
 coalesce(sum(m.refund_amount),0)::bigint as refund_amount,
 case when coalesce(sum(m.views),0)>0 then round((sum(m.orders)::numeric/sum(m.views)::numeric)*100,2) else 0 end as view_to_order_rate,
 case when coalesce(sum(m.add_to_carts),0)>0 then round((sum(m.orders)::numeric/sum(m.add_to_carts)::numeric)*100,2) else 0 end as cart_to_order_rate,
 case when coalesce(sum(m.review_count),0)>0 then round(sum(m.rating_sum)::numeric/sum(m.review_count)::numeric,2) else null end as avg_rating
from public.products p left join public.product_metrics_daily m on m.tenant_id=p.tenant_id and m.product_id=p.id
group by p.tenant_id,p.id,p.name,p.slug,p.status;
