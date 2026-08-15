-- RAVA Commerce Domain Foundation
-- Commerce is modular, tenant-scoped and marketplace-ready without forcing multi-vendor UI today.
create table if not exists public.commerce_stores(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null unique references public.tenants(id) on delete cascade,
 currency text not null default 'IRR', locale text not null default 'fa-IR', status text not null default 'active' check(status in('active','read_only','disabled')),
 settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.commerce_vendors(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 name text not null, slug text not null, status text not null default 'active' check(status in('active','suspended','archived')),
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table if not exists public.product_categories(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 parent_id uuid references public.product_categories(id) on delete set null, name text not null, slug text not null, sort_order int not null default 0,
 metadata jsonb not null default '{}'::jsonb, unique(tenant_id,slug)
);
create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 vendor_id uuid references public.commerce_vendors(id) on delete set null, category_id uuid references public.product_categories(id) on delete set null,
 name text not null, slug text not null, description text not null default '', status text not null default 'draft' check(status in('draft','active','archived')),
 product_type text not null default 'physical' check(product_type in('physical','digital','service')),
 seo_title text, seo_description text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table if not exists public.product_variants(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade,
 sku text, title text not null default 'Default', price numeric(18,2) not null default 0 check(price>=0), compare_at_price numeric(18,2), currency text not null default 'IRR',
 track_inventory boolean not null default true, inventory_quantity bigint not null default 0, allow_backorder boolean not null default false,
 attributes jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,sku)
);
create table if not exists public.commerce_customers(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 auth_user_id uuid references auth.users(id) on delete set null, email text, phone text, full_name text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.carts(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, customer_id uuid references public.commerce_customers(id) on delete set null,
 session_key text, status text not null default 'open' check(status in('open','converted','abandoned','expired')), currency text not null default 'IRR', metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cart_items(
 id bigint generated always as identity primary key, tenant_id uuid not null references public.tenants(id) on delete cascade, cart_id uuid not null references public.carts(id) on delete cascade,
 variant_id uuid not null references public.product_variants(id) on delete cascade, quantity int not null check(quantity>0), unit_price numeric(18,2) not null check(unit_price>=0), snapshot jsonb not null default '{}'::jsonb,
 unique(cart_id,variant_id)
);
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict, customer_id uuid references public.commerce_customers(id) on delete set null,
 order_number bigint generated always as identity, status text not null default 'pending' check(status in('pending','confirmed','processing','fulfilled','cancelled','refunded')),
 payment_status text not null default 'unpaid' check(payment_status in('unpaid','pending','paid','partially_refunded','refunded','failed')),
 fulfillment_status text not null default 'unfulfilled' check(fulfillment_status in('unfulfilled','partial','fulfilled','returned')),
 currency text not null default 'IRR', subtotal numeric(18,2) not null default 0, discount_total numeric(18,2) not null default 0, shipping_total numeric(18,2) not null default 0, tax_total numeric(18,2) not null default 0, grand_total numeric(18,2) not null default 0,
 customer_snapshot jsonb not null default '{}'::jsonb, billing_address jsonb not null default '{}'::jsonb, shipping_address jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,order_number)
);
create table if not exists public.order_items(
 id bigint generated always as identity primary key, tenant_id uuid not null references public.tenants(id) on delete restrict, order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null, variant_id uuid references public.product_variants(id) on delete set null,
 title text not null, sku text, quantity int not null check(quantity>0), unit_price numeric(18,2) not null, line_total numeric(18,2) not null, snapshot jsonb not null default '{}'::jsonb
);
create table if not exists public.payment_transactions(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict, order_id uuid not null references public.orders(id) on delete restrict,
 provider text not null, provider_transaction_id text, idempotency_key text not null, kind text not null default 'payment' check(kind in('payment','refund','void')),
 status text not null default 'pending' check(status in('pending','authorized','succeeded','failed','refunded','voided')),
 amount numeric(18,2) not null check(amount>=0), currency text not null default 'IRR', safe_response jsonb not null default '{}'::jsonb, verified_at timestamptz, created_at timestamptz not null default now(),
 unique(tenant_id,idempotency_key), unique(provider,provider_transaction_id)
);
create table if not exists public.discount_codes(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, code text not null,
 type text not null check(type in('percent','fixed')), value numeric(18,2) not null check(value>=0), starts_at timestamptz, ends_at timestamptz, usage_limit int, usage_count int not null default 0,
 status text not null default 'active' check(status in('active','disabled')), rules jsonb not null default '{}'::jsonb, unique(tenant_id,code)
);
create table if not exists public.shipping_methods(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, name text not null, code text not null,
 status text not null default 'active' check(status in('active','disabled')), pricing jsonb not null default '{}'::jsonb, rules jsonb not null default '{}'::jsonb, unique(tenant_id,code)
);
create index if not exists products_tenant_status_idx on public.products(tenant_id,status);
create index if not exists variants_tenant_product_idx on public.product_variants(tenant_id,product_id);
create index if not exists orders_tenant_created_idx on public.orders(tenant_id,created_at desc);
create index if not exists payments_tenant_order_idx on public.payment_transactions(tenant_id,order_id);

-- Tenant isolation is enforced for authenticated management. Public catalog access will be exposed later through narrowly scoped read paths/RPCs.
do $$ declare t text; begin foreach t in array array['commerce_stores','commerce_vendors','product_categories','products','product_variants','commerce_customers','carts','cart_items','orders','order_items','payment_transactions','discount_codes','shipping_methods'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy %I on public.%I for select to authenticated using(public.can_access_tenant(tenant_id,null))',t||'_read',t); execute format('create policy %I on public.%I for all to authenticated using(public.can_access_tenant(tenant_id,array[''super_admin'',''admin'']::public.role_key[])) with check(public.can_access_tenant(tenant_id,array[''super_admin'',''admin'']::public.role_key[]))',t||'_manage',t); end loop; end $$;

-- Security invariant: payment secrets/card data/CVV must never be persisted in these tables. Provider callbacks must be server-verified and idempotent.
