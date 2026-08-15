-- RAVA Commerce Analytics V1
-- Store raw business events with limited payloads, then aggregate per product/day for fast dashboards.
create table if not exists public.commerce_events(
 id bigint generated always as identity primary key,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 order_id uuid references public.orders(id) on delete set null,
 session_hash text,
 event_type text not null check(event_type in('product_view','add_to_cart','remove_from_cart','checkout_started','checkout_completed','order_created','order_paid','order_cancelled','refund_created','review_created','wishlist_added')),
 quantity int not null default 0,
 amount bigint not null default 0,
 currency text,
 source text,
 metadata jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create index if not exists commerce_events_tenant_time_idx on public.commerce_events(tenant_id,occurred_at desc);
create index if not exists commerce_events_product_time_idx on public.commerce_events(tenant_id,product_id,occurred_at desc);
create index if not exists commerce_events_type_time_idx on public.commerce_events(tenant_id,event_type,occurred_at desc);

create table if not exists public.product_metrics_daily(
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 metric_date date not null,
 views bigint not null default 0,
 unique_view_sessions bigint not null default 0,
 add_to_carts bigint not null default 0,
 checkout_starts bigint not null default 0,
 orders bigint not null default 0,
 units_sold bigint not null default 0,
 gross_revenue bigint not null default 0,
 discount_amount bigint not null default 0,
 refund_amount bigint not null default 0,
 cancellations bigint not null default 0,
 review_count bigint not null default 0,
 rating_sum bigint not null default 0,
 primary key(tenant_id,product_id,metric_date)
);
create index if not exists product_metrics_daily_tenant_date_idx on public.product_metrics_daily(tenant_id,metric_date desc);

create table if not exists public.commerce_metrics_daily(
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 metric_date date not null,
 sessions bigint not null default 0,
 product_views bigint not null default 0,
 add_to_carts bigint not null default 0,
 checkout_starts bigint not null default 0,
 orders bigint not null default 0,
 paid_orders bigint not null default 0,
 units_sold bigint not null default 0,
 gross_revenue bigint not null default 0,
 discount_amount bigint not null default 0,
 shipping_revenue bigint not null default 0,
 refund_amount bigint not null default 0,
 cancelled_orders bigint not null default 0,
 new_customers bigint not null default 0,
 returning_customers bigint not null default 0,
 primary key(tenant_id,metric_date)
);

alter table public.commerce_events enable row level security;
alter table public.product_metrics_daily enable row level security;
alter table public.commerce_metrics_daily enable row level security;
create policy commerce_events_admin_read on public.commerce_events for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy product_metrics_admin_read on public.product_metrics_daily for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy commerce_metrics_admin_read on public.commerce_metrics_daily for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- No direct browser INSERT policy. Public storefront events must enter through trusted server endpoints with rate limits and payload allowlists.

create or replace view public.product_commerce_summary as
select p.tenant_id,p.id as product_id,p.name,p.slug,p.status,p.stock_quantity,
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
group by p.tenant_id,p.id,p.name,p.slug,p.status,p.stock_quantity;
