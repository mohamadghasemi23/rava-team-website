-- Traceable Smart Start demo data for Commerce/Inventory/Procurement.
create table if not exists public.starter_demo_batches(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 kind text not null check(kind in('commerce','inventory','procurement')),status text not null default 'active' check(status in('active','cleaned')),
 created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),cleaned_at timestamptz,
 unique(tenant_id,kind,status)
);
alter table public.starter_demo_batches enable row level security;
create policy starter_demo_batches_read on public.starter_demo_batches for select to authenticated using(public.can_access_tenant(tenant_id,null));

alter table public.product_categories add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.products add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.product_variants add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.orders add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.order_items add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.product_reviews add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.inventory_locations add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.inventory_balances add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.inventory_ledger add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.suppliers add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.purchase_orders add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.purchase_order_items add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;

-- Analytics/reporting code can exclude demo rows with demo_batch_id is not null.
create index if not exists products_demo_batch_idx on public.products(tenant_id,demo_batch_id);
create index if not exists orders_demo_batch_idx on public.orders(tenant_id,demo_batch_id);
create index if not exists inventory_demo_batch_idx on public.inventory_balances(tenant_id,demo_batch_id);
create index if not exists suppliers_demo_batch_idx on public.suppliers(tenant_id,demo_batch_id);
