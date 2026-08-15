-- Trusted daily rollups. Public/admin clients cannot execute these directly.
create or replace function public.rollup_commerce_day(p_tenant uuid,p_day date)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.product_metrics_daily where tenant_id=p_tenant and metric_date=p_day;
  insert into public.product_metrics_daily(tenant_id,product_id,metric_date,views,unique_view_sessions,add_to_carts,checkout_starts,orders,units_sold,gross_revenue,discount_amount,refund_amount,cancellations,review_count,rating_sum)
  select p_tenant,p.id,p_day,
    coalesce((select count(*) from public.commerce_events e where e.tenant_id=p_tenant and e.product_id=p.id and e.event_type='product_view' and e.occurred_at>=p_day::timestamptz and e.occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(distinct e.session_hash) from public.commerce_events e where e.tenant_id=p_tenant and e.product_id=p.id and e.event_type='product_view' and e.session_hash is not null and e.occurred_at>=p_day::timestamptz and e.occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.commerce_events e where e.tenant_id=p_tenant and e.product_id=p.id and e.event_type='add_to_cart' and e.occurred_at>=p_day::timestamptz and e.occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.commerce_events e where e.tenant_id=p_tenant and e.product_id=p.id and e.event_type='checkout_started' and e.occurred_at>=p_day::timestamptz and e.occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(distinct oi.order_id) from public.order_items oi join public.orders o on o.id=oi.order_id where o.tenant_id=p_tenant and oi.product_id=p.id and o.created_at>=p_day::timestamptz and o.created_at<(p_day+1)::timestamptz and o.status not in('cancelled','refunded')),0),
    coalesce((select sum(oi.quantity) from public.order_items oi join public.orders o on o.id=oi.order_id where o.tenant_id=p_tenant and oi.product_id=p.id and o.created_at>=p_day::timestamptz and o.created_at<(p_day+1)::timestamptz and o.status not in('cancelled','refunded')),0),
    coalesce((select sum(oi.line_total) from public.order_items oi join public.orders o on o.id=oi.order_id where o.tenant_id=p_tenant and oi.product_id=p.id and o.created_at>=p_day::timestamptz and o.created_at<(p_day+1)::timestamptz and o.status not in('cancelled','refunded')),0),0,
    coalesce((select sum(e.amount) from public.commerce_events e where e.tenant_id=p_tenant and e.product_id=p.id and e.event_type='refund_created' and e.occurred_at>=p_day::timestamptz and e.occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.commerce_events e where e.tenant_id=p_tenant and e.product_id=p.id and e.event_type='order_cancelled' and e.occurred_at>=p_day::timestamptz and e.occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.product_reviews r where r.tenant_id=p_tenant and r.product_id=p.id and r.status='published' and r.created_at>=p_day::timestamptz and r.created_at<(p_day+1)::timestamptz),0),
    coalesce((select sum(r.rating) from public.product_reviews r where r.tenant_id=p_tenant and r.product_id=p.id and r.status='published' and r.created_at>=p_day::timestamptz and r.created_at<(p_day+1)::timestamptz),0)
  from public.products p where p.tenant_id=p_tenant;
  delete from public.commerce_metrics_daily where tenant_id=p_tenant and metric_date=p_day;
  insert into public.commerce_metrics_daily(tenant_id,metric_date,sessions,product_views,add_to_carts,checkout_starts,orders,paid_orders,units_sold,gross_revenue,discount_amount,shipping_revenue,refund_amount,cancelled_orders,new_customers,returning_customers)
  select p_tenant,p_day,
    coalesce((select count(distinct session_hash) from public.commerce_events where tenant_id=p_tenant and session_hash is not null and occurred_at>=p_day::timestamptz and occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.commerce_events where tenant_id=p_tenant and event_type='product_view' and occurred_at>=p_day::timestamptz and occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.commerce_events where tenant_id=p_tenant and event_type='add_to_cart' and occurred_at>=p_day::timestamptz and occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.commerce_events where tenant_id=p_tenant and event_type='checkout_started' and occurred_at>=p_day::timestamptz and occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.orders where tenant_id=p_tenant and created_at>=p_day::timestamptz and created_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.orders where tenant_id=p_tenant and payment_status='paid' and paid_at>=p_day::timestamptz and paid_at<(p_day+1)::timestamptz),0),
    coalesce((select sum(oi.quantity) from public.order_items oi join public.orders o on o.id=oi.order_id where o.tenant_id=p_tenant and o.created_at>=p_day::timestamptz and o.created_at<(p_day+1)::timestamptz and o.status not in('cancelled','refunded')),0),
    coalesce((select sum(grand_total) from public.orders where tenant_id=p_tenant and payment_status='paid' and paid_at>=p_day::timestamptz and paid_at<(p_day+1)::timestamptz),0),
    coalesce((select sum(discount_total) from public.orders where tenant_id=p_tenant and created_at>=p_day::timestamptz and created_at<(p_day+1)::timestamptz),0),
    coalesce((select sum(shipping_total) from public.orders where tenant_id=p_tenant and payment_status='paid' and paid_at>=p_day::timestamptz and paid_at<(p_day+1)::timestamptz),0),
    coalesce((select sum(amount) from public.commerce_events where tenant_id=p_tenant and event_type='refund_created' and occurred_at>=p_day::timestamptz and occurred_at<(p_day+1)::timestamptz),0),
    coalesce((select count(*) from public.orders where tenant_id=p_tenant and status='cancelled' and updated_at>=p_day::timestamptz and updated_at<(p_day+1)::timestamptz),0),0,0;
end $$;
revoke all on function public.rollup_commerce_day(uuid,date) from public,authenticated,anon;
grant execute on function public.rollup_commerce_day(uuid,date) to service_role;
