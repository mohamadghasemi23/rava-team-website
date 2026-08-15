-- RAVA Procurement Pro. Application/server actions must require entitlement procurement.pro.
create table if not exists public.suppliers(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 name text not null, code text, contact_name text, phone text, email text, address jsonb not null default '{}'::jsonb,
 tax_id text, payment_terms text, status text not null default 'active' check(status in('active','inactive','blocked')),
 notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,name)
);
create table if not exists public.purchase_orders(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 supplier_id uuid not null references public.suppliers(id) on delete restrict, location_id uuid references public.inventory_locations(id) on delete restrict,
 po_number bigint generated always as identity, status text not null default 'draft' check(status in('draft','submitted','partially_received','received','cancelled')),
 currency text not null default 'IRR', subtotal bigint not null default 0, discount_total bigint not null default 0, shipping_total bigint not null default 0, tax_total bigint not null default 0, grand_total bigint not null default 0,
 ordered_at timestamptz, expected_at timestamptz, notes text not null default '', created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,po_number)
);
create table if not exists public.purchase_order_items(
 id uuid primary key default gen_random_uuid(), purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id) on delete cascade, product_id uuid not null references public.products(id) on delete restrict,
 ordered_quantity int not null check(ordered_quantity>0), received_quantity int not null default 0 check(received_quantity>=0), damaged_quantity int not null default 0 check(damaged_quantity>=0),
 unit_cost bigint not null check(unit_cost>=0), line_total bigint not null check(line_total>=0), notes text not null default '',
 check(received_quantity+damaged_quantity<=ordered_quantity)
);
create table if not exists public.goods_receipts(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict, location_id uuid not null references public.inventory_locations(id) on delete restrict,
 receipt_number bigint generated always as identity, received_at timestamptz not null default now(), received_by uuid references auth.users(id) on delete set null,
 notes text not null default '', unique(tenant_id,receipt_number)
);
create table if not exists public.goods_receipt_items(
 id uuid primary key default gen_random_uuid(), receipt_id uuid not null references public.goods_receipts(id) on delete cascade,
 purchase_order_item_id uuid not null references public.purchase_order_items(id) on delete restrict, product_id uuid not null references public.products(id) on delete restrict,
 accepted_quantity int not null default 0 check(accepted_quantity>=0), damaged_quantity int not null default 0 check(damaged_quantity>=0), shortage_quantity int not null default 0 check(shortage_quantity>=0),
 unit_cost bigint not null check(unit_cost>=0), batch_code text, expiry_date date, notes text not null default ''
);
create table if not exists public.inventory_cost_layers(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade, location_id uuid not null references public.inventory_locations(id) on delete cascade,
 receipt_item_id uuid references public.goods_receipt_items(id) on delete set null, quantity_received int not null check(quantity_received>0), quantity_remaining int not null check(quantity_remaining>=0),
 unit_cost bigint not null check(unit_cost>=0), received_at timestamptz not null default now(), check(quantity_remaining<=quantity_received)
);
create table if not exists public.supplier_returns(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 supplier_id uuid not null references public.suppliers(id) on delete restrict, purchase_order_id uuid references public.purchase_orders(id) on delete set null,
 location_id uuid not null references public.inventory_locations(id) on delete restrict, status text not null default 'draft' check(status in('draft','sent','completed','cancelled')),
 notes text not null default '', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.supplier_return_items(
 id uuid primary key default gen_random_uuid(), supplier_return_id uuid not null references public.supplier_returns(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict, quantity int not null check(quantity>0), unit_cost bigint not null check(unit_cost>=0), reason text not null default ''
);
create index if not exists suppliers_tenant_status_idx on public.suppliers(tenant_id,status,name);
create index if not exists purchase_orders_tenant_status_idx on public.purchase_orders(tenant_id,status,created_at desc);
create index if not exists cost_layers_product_idx on public.inventory_cost_layers(tenant_id,product_id,received_at desc);

alter table public.suppliers enable row level security;alter table public.purchase_orders enable row level security;alter table public.purchase_order_items enable row level security;alter table public.goods_receipts enable row level security;alter table public.goods_receipt_items enable row level security;alter table public.inventory_cost_layers enable row level security;alter table public.supplier_returns enable row level security;alter table public.supplier_return_items enable row level security;
create policy suppliers_admin_read on public.suppliers for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy purchase_orders_admin_read on public.purchase_orders for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy purchase_order_items_admin_read on public.purchase_order_items for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy goods_receipts_admin_read on public.goods_receipts for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy cost_layers_admin_read on public.inventory_cost_layers for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy supplier_returns_admin_read on public.supplier_returns for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- Writes intentionally go through trusted server actions that require procurement.pro + inventory.pro where stock is mutated, validate quantities and write audit/inventory ledger atomically.
