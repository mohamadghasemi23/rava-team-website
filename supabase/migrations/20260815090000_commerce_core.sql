-- RAVA Commerce Core V1 compatibility layer.
-- The canonical commerce tables were created in 20260815043000_commerce_domain_foundation.sql.
-- This migration extends that model for the admin/storefront UI instead of redefining the same tables.
alter table public.product_categories add column if not exists status text not null default 'active' check(status in('active','hidden'));
alter table public.product_categories add column if not exists created_at timestamptz not null default now();
alter table public.product_categories add column if not exists updated_at timestamptz not null default now();

alter table public.products add column if not exists summary text not null default '';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists cover_url text;
alter table public.products add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists published_at timestamptz;

alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists notes text not null default '';

create index if not exists products_tenant_status_created_idx on public.products(tenant_id,status,created_at desc);
create index if not exists orders_tenant_status_created_idx on public.orders(tenant_id,status,created_at desc);
create index if not exists carts_tenant_session_idx on public.carts(tenant_id,session_key);

-- Price, SKU and inventory remain canonical on product_variants. Orders keep immutable snapshots.
-- Cart/order public mutations intentionally have no direct browser write path; trusted server actions recalculate price, discount, shipping and stock.
