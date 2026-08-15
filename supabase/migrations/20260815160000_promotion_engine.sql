-- RAVA Promotion Engine V1: server-authoritative, tenant-isolated, concurrency-safe usage accounting.
create table if not exists public.promotions(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,name text not null,code text,
 status text not null default 'draft' check(status in('draft','active','paused','expired','archived')),kind text not null check(kind in('percentage','fixed_amount','free_shipping')),
 value numeric(18,4) not null default 0 check(value>=0),currency text,min_subtotal numeric(18,4) not null default 0 check(min_subtotal>=0),max_discount numeric(18,4),
 starts_at timestamptz,ends_at timestamptz,usage_limit int check(usage_limit is null or usage_limit>0),per_customer_limit int check(per_customer_limit is null or per_customer_limit>0),
 priority int not null default 100,stackable boolean not null default false,automatic boolean not null default false,customer_eligibility jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at is null or starts_at is null or ends_at>starts_at),check(kind<>'percentage' or value<=100)
);
create unique index if not exists promotions_tenant_code_unique on public.promotions(tenant_id,lower(code)) where code is not null;
create index if not exists promotions_active_idx on public.promotions(tenant_id,status,starts_at,ends_at,priority);
create table if not exists public.promotion_targets(id uuid primary key default gen_random_uuid(),promotion_id uuid not null references public.promotions(id) on delete cascade,tenant_id uuid not null references public.tenants(id) on delete cascade,target_type text not null check(target_type in('all','product','variant','category')),target_id uuid,created_at timestamptz not null default now(),unique(promotion_id,target_type,target_id));
create table if not exists public.promotion_redemptions(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,promotion_id uuid not null references public.promotions(id) on delete restrict,order_id uuid not null references public.orders(id) on delete restrict,customer_key text,discount_amount numeric(18,4) not null check(discount_amount>=0),currency text not null,created_at timestamptz not null default now(),unique(promotion_id,order_id));
create index if not exists promotion_redemptions_usage_idx on public.promotion_redemptions(tenant_id,promotion_id,created_at);
create index if not exists promotion_redemptions_customer_idx on public.promotion_redemptions(tenant_id,promotion_id,customer_key) where customer_key is not null;
alter table public.promotions enable row level security;alter table public.promotion_targets enable row level security;alter table public.promotion_redemptions enable row level security;
create policy promotions_admin on public.promotions for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy promotion_targets_admin on public.promotion_targets for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy promotion_redemptions_admin_read on public.promotion_redemptions for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- Redemption writes intentionally have no browser policy. Checkout/service code owns evaluation and writes.
