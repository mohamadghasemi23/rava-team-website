-- Profitability, attribution and inventory movement foundations.
alter table public.product_variants add column if not exists cost_price numeric(18,2) not null default 0 check(cost_price>=0);
alter table public.order_items add column if not exists unit_cost numeric(18,2) not null default 0 check(unit_cost>=0);
alter table public.product_metrics_daily add column if not exists cost_of_goods bigint not null default 0;
alter table public.product_metrics_daily add column if not exists gross_profit bigint not null default 0;
alter table public.commerce_metrics_daily add column if not exists cost_of_goods bigint not null default 0;
alter table public.commerce_metrics_daily add column if not exists gross_profit bigint not null default 0;

create table if not exists public.order_attribution(
 order_id uuid primary key references public.orders(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 channel text,
 source text,
 medium text,
 campaign text,
 content text,
 term text,
 referrer_host text,
 landing_path text,
 device_class text check(device_class is null or device_class in('mobile','tablet','desktop','other')),
 country_code text,
 created_at timestamptz not null default now()
);
create index if not exists order_attribution_tenant_source_idx on public.order_attribution(tenant_id,source,created_at desc);
alter table public.order_attribution enable row level security;
create policy order_attribution_admin_read on public.order_attribution for select to authenticated using(public.can_access_tenant(tenant_id,null));

create table if not exists public.inventory_movements(
 id bigint generated always as identity primary key,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 variant_id uuid not null references public.product_variants(id) on delete cascade,
 order_id uuid references public.orders(id) on delete set null,
 movement_type text not null check(movement_type in('initial','purchase','sale','return','refund','adjustment','damage','reservation','release')),
 quantity_delta bigint not null,
 balance_after bigint,
 unit_cost numeric(18,2),
 note text,
 actor_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists inventory_movements_variant_time_idx on public.inventory_movements(tenant_id,variant_id,created_at desc);
alter table public.inventory_movements enable row level security;
create policy inventory_movements_admin_read on public.inventory_movements for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- Inventory changes are written only through trusted inventory/order services; no direct public write policy.
