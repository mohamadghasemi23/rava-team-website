-- RAVA Commerce Core
-- Product/variant/pricing/inventory/order foundations with tenant isolation,
-- entitlement enforcement and audited transactional RPCs.
-- Code-only migration. Not applied to production by this PR.

create type public.commerce_product_status as enum ('draft','active','archived');
create type public.commerce_order_status as enum ('draft','pending','confirmed','processing','fulfilled','cancelled','refunded');
create type public.commerce_payment_state as enum ('unpaid','authorized','partially_paid','paid','partially_refunded','refunded','failed');
create type public.inventory_movement_type as enum ('adjustment','receipt','sale','return','reservation','release','transfer_in','transfer_out');

insert into public.permissions(key,module_key,name_fa,name_en,risk_level) values
  ('commerce.view','commerce','مشاهده فروشگاه','View commerce','normal'),
  ('commerce.products.manage','commerce','مدیریت محصولات','Manage products','high'),
  ('commerce.inventory.manage','commerce','مدیریت موجودی','Manage inventory','high'),
  ('commerce.orders.view','commerce','مشاهده سفارش‌ها','View orders','normal'),
  ('commerce.orders.manage','commerce','مدیریت سفارش‌ها','Manage orders','high'),
  ('commerce.orders.refund','commerce','بازپرداخت سفارش','Refund orders','critical')
on conflict(key) do nothing;

create table public.commerce_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  title text not null,
  slug text not null,
  description text not null default '',
  status public.commerce_product_status not null default 'draft',
  product_type text not null default 'physical',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id,slug),
  constraint commerce_products_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint commerce_products_type_check check (product_type in ('physical','digital','service'))
);

create table public.commerce_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  sku text not null,
  title text not null default 'Default',
  barcode text,
  attributes jsonb not null default '{}'::jsonb,
  track_inventory boolean not null default true,
  allow_backorder boolean not null default false,
  active boolean not null default true,
  weight_grams integer check(weight_grams is null or weight_grams>=0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id,sku),
  constraint commerce_variants_sku_format check (length(trim(sku)) between 1 and 100)
);

create table public.commerce_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.commerce_variants(id) on delete cascade,
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check(amount_minor>=0),
  compare_at_minor bigint check(compare_at_minor is null or compare_at_minor>=amount_minor),
  min_quantity integer not null default 1 check(min_quantity>0),
  customer_segment text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint commerce_prices_dates check(ends_at is null or starts_at is null or ends_at>starts_at)
);

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  code text not null,
  active boolean not null default true,
  address jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id,code)
);

create table public.inventory_levels (
  variant_id uuid not null references public.commerce_variants(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  on_hand integer not null default 0,
  reserved integer not null default 0 check(reserved>=0),
  updated_at timestamptz not null default now(),
  primary key(variant_id,location_id),
  constraint inventory_available_shape check(reserved<=greatest(on_hand,reserved))
);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  variant_id uuid not null references public.commerce_variants(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null check(quantity_delta<>0),
  reference_type text,
  reference_id text,
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  order_number text not null,
  status public.commerce_order_status not null default 'draft',
  payment_state public.commerce_payment_state not null default 'unpaid',
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  customer_email text,
  customer_name text,
  subtotal_minor bigint not null default 0 check(subtotal_minor>=0),
  discount_minor bigint not null default 0 check(discount_minor>=0),
  shipping_minor bigint not null default 0 check(shipping_minor>=0),
  tax_minor bigint not null default 0 check(tax_minor>=0),
  total_minor bigint not null default 0 check(total_minor>=0),
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id,order_number),
  constraint commerce_orders_total_check check(total_minor=greatest(0,subtotal_minor-discount_minor+shipping_minor+tax_minor))
);

create table public.commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  variant_id uuid references public.commerce_variants(id) on delete set null,
  sku text not null,
  title text not null,
  quantity integer not null check(quantity>0),
  unit_price_minor bigint not null check(unit_price_minor>=0),
  discount_minor bigint not null default 0 check(discount_minor>=0),
  tax_minor bigint not null default 0 check(tax_minor>=0),
  line_total_minor bigint not null check(line_total_minor>=0),
  metadata jsonb not null default '{}'::jsonb,
  constraint commerce_order_items_total_check check(line_total_minor=greatest(0,(quantity*unit_price_minor)-discount_minor+tax_minor))
);

create index commerce_products_site_status_idx on public.commerce_products(site_id,status,updated_at desc);
create index commerce_variants_product_idx on public.commerce_variants(product_id,active);
create index commerce_prices_variant_active_idx on public.commerce_prices(variant_id,currency,active,starts_at,ends_at);
create index inventory_levels_location_idx on public.inventory_levels(location_id,variant_id);
create index inventory_movements_variant_time_idx on public.inventory_movements(variant_id,created_at desc);
create index commerce_orders_site_status_idx on public.commerce_orders(site_id,status,created_at desc);
create index commerce_order_items_order_idx on public.commerce_order_items(order_id);

alter table public.commerce_products enable row level security;
alter table public.commerce_variants enable row level security;
alter table public.commerce_prices enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_levels enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_order_items enable row level security;

create or replace function private.commerce_allowed(p_site_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path=public,private,pg_temp as $$
  select public.has_permission(p_permission,s.organization_id,s.id)
    and exists(select 1 from private.resolve_site_entitlement(s.id,'commerce',now()) e where e.allowed)
  from public.sites s where s.id=p_site_id;
$$;

create policy commerce_products_read on public.commerce_products for select to authenticated
using(private.commerce_allowed(site_id,'commerce.view') or private.commerce_allowed(site_id,'commerce.products.manage') or public.has_permission('platform.sites.manage',organization_id,site_id));
create policy commerce_products_manage on public.commerce_products for all to authenticated
using(private.commerce_allowed(site_id,'commerce.products.manage'))
with check(private.commerce_allowed(site_id,'commerce.products.manage'));

create policy commerce_variants_read on public.commerce_variants for select to authenticated
using(private.commerce_allowed(site_id,'commerce.view') or private.commerce_allowed(site_id,'commerce.products.manage'));
create policy commerce_variants_manage on public.commerce_variants for all to authenticated
using(private.commerce_allowed(site_id,'commerce.products.manage'))
with check(private.commerce_allowed(site_id,'commerce.products.manage'));

create policy commerce_prices_read on public.commerce_prices for select to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and (private.commerce_allowed(v.site_id,'commerce.view') or private.commerce_allowed(v.site_id,'commerce.products.manage'))));
create policy commerce_prices_manage on public.commerce_prices for all to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and private.commerce_allowed(v.site_id,'commerce.products.manage')))
with check(exists(select 1 from public.commerce_variants v where v.id=variant_id and private.commerce_allowed(v.site_id,'commerce.products.manage')));

create policy inventory_locations_read on public.inventory_locations for select to authenticated
using(private.commerce_allowed(site_id,'commerce.view') or private.commerce_allowed(site_id,'commerce.inventory.manage'));
create policy inventory_locations_manage on public.inventory_locations for all to authenticated
using(private.commerce_allowed(site_id,'commerce.inventory.manage'))
with check(private.commerce_allowed(site_id,'commerce.inventory.manage'));

create policy inventory_levels_read on public.inventory_levels for select to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and (private.commerce_allowed(v.site_id,'commerce.view') or private.commerce_allowed(v.site_id,'commerce.inventory.manage'))));
create policy inventory_levels_manage on public.inventory_levels for all to authenticated
using(exists(select 1 from public.commerce_variants v where v.id=variant_id and private.commerce_allowed(v.site_id,'commerce.inventory.manage')))
with check(exists(select 1 from public.commerce_variants v where v.id=variant_id and private.commerce_allowed(v.site_id,'commerce.inventory.manage')));

create policy inventory_movements_read on public.inventory_movements for select to authenticated
using(private.commerce_allowed(site_id,'commerce.view') or private.commerce_allowed(site_id,'commerce.inventory.manage'));
revoke insert,update,delete on public.inventory_movements from authenticated;

create policy commerce_orders_read on public.commerce_orders for select to authenticated
using(private.commerce_allowed(site_id,'commerce.orders.view') or private.commerce_allowed(site_id,'commerce.orders.manage'));
create policy commerce_orders_manage on public.commerce_orders for all to authenticated
using(private.commerce_allowed(site_id,'commerce.orders.manage'))
with check(private.commerce_allowed(site_id,'commerce.orders.manage'));

create policy commerce_order_items_read on public.commerce_order_items for select to authenticated
using(exists(select 1 from public.commerce_orders o where o.id=order_id and (private.commerce_allowed(o.site_id,'commerce.orders.view') or private.commerce_allowed(o.site_id,'commerce.orders.manage'))));
create policy commerce_order_items_manage on public.commerce_order_items for all to authenticated
using(exists(select 1 from public.commerce_orders o where o.id=order_id and private.commerce_allowed(o.site_id,'commerce.orders.manage')))
with check(exists(select 1 from public.commerce_orders o where o.id=order_id and private.commerce_allowed(o.site_id,'commerce.orders.manage')));

create or replace function public.create_commerce_product(
  p_site_id uuid,p_title text,p_slug text,p_sku text,p_currency text,p_amount_minor bigint,
  p_initial_stock integer default 0,p_location_name text default 'Main',p_location_code text default 'MAIN'
) returns table(product_id uuid,variant_id uuid,location_id uuid)
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_org uuid; v_product uuid; v_variant uuid; v_location uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null then raise exception 'site not found'; end if;
  if not private.commerce_allowed(p_site_id,'commerce.products.manage') then raise exception 'commerce access denied'; end if;
  if length(trim(p_title))<2 or p_slug !~ '^[a-z0-9][a-z0-9-]{1,120}$' or length(trim(p_sku))<1 then raise exception 'invalid product input'; end if;
  if p_currency !~ '^[A-Z]{3}$' or p_amount_minor<0 or p_initial_stock<0 then raise exception 'invalid price or stock'; end if;

  insert into public.commerce_products(organization_id,site_id,title,slug,status,created_by,updated_by)
  values(v_org,p_site_id,trim(p_title),p_slug,'draft',auth.uid(),auth.uid()) returning id into v_product;
  insert into public.commerce_variants(product_id,site_id,sku,title)
  values(v_product,p_site_id,trim(p_sku),'Default') returning id into v_variant;
  insert into public.commerce_prices(variant_id,currency,amount_minor) values(v_variant,p_currency,p_amount_minor);
  insert into public.inventory_locations(organization_id,site_id,name,code)
  values(v_org,p_site_id,trim(p_location_name),upper(trim(p_location_code)))
  on conflict(site_id,code) do update set active=true returning id into v_location;
  insert into public.inventory_levels(variant_id,location_id,on_hand,reserved) values(v_variant,v_location,p_initial_stock,0);
  if p_initial_stock>0 then
    insert into public.inventory_movements(site_id,variant_id,location_id,movement_type,quantity_delta,reason,actor_id)
    values(p_site_id,v_variant,v_location,'receipt',p_initial_stock,'initial stock',auth.uid());
  end if;
  perform public.record_audit_event('commerce.product.created','commerce_product',v_product::text,v_org,p_site_id,null,
    jsonb_build_object('title',p_title,'sku',p_sku,'currency',p_currency,'amount_minor',p_amount_minor,'initial_stock',p_initial_stock),'{}'::jsonb,null,null,'notice');
  return query select v_product,v_variant,v_location;
end; $$;

create or replace function public.adjust_inventory(
  p_site_id uuid,p_variant_id uuid,p_location_id uuid,p_quantity_delta integer,p_reason text default null
) returns table(on_hand integer,reserved integer,available integer)
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_level public.inventory_levels%rowtype; v_org uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if not private.commerce_allowed(p_site_id,'commerce.inventory.manage') then raise exception 'commerce inventory access denied'; end if;
  if p_quantity_delta=0 then raise exception 'quantity delta cannot be zero'; end if;
  if not exists(select 1 from public.commerce_variants v where v.id=p_variant_id and v.site_id=p_site_id) then raise exception 'variant scope mismatch'; end if;
  if not exists(select 1 from public.inventory_locations l where l.id=p_location_id and l.site_id=p_site_id) then raise exception 'location scope mismatch'; end if;

  insert into public.inventory_levels(variant_id,location_id,on_hand,reserved) values(p_variant_id,p_location_id,0,0)
  on conflict(variant_id,location_id) do nothing;
  select * into v_level from public.inventory_levels where variant_id=p_variant_id and location_id=p_location_id for update;
  if v_level.on_hand+p_quantity_delta<0 or v_level.on_hand+p_quantity_delta<v_level.reserved then raise exception 'insufficient inventory'; end if;
  update public.inventory_levels set on_hand=on_hand+p_quantity_delta,updated_at=now()
    where variant_id=p_variant_id and location_id=p_location_id returning * into v_level;
  insert into public.inventory_movements(site_id,variant_id,location_id,movement_type,quantity_delta,reason,actor_id)
    values(p_site_id,p_variant_id,p_location_id,'adjustment',p_quantity_delta,nullif(trim(coalesce(p_reason,'')),''),auth.uid());
  perform public.record_audit_event('commerce.inventory.adjusted','commerce_variant',p_variant_id::text,v_org,p_site_id,null,
    jsonb_build_object('location_id',p_location_id,'delta',p_quantity_delta,'on_hand',v_level.on_hand,'reserved',v_level.reserved),'{}'::jsonb,null,null,'warning');
  return query select v_level.on_hand,v_level.reserved,v_level.on_hand-v_level.reserved;
end; $$;

create or replace function public.create_draft_order(
  p_site_id uuid,p_order_number text,p_currency text,p_customer_email text,p_customer_name text,p_items jsonb
) returns uuid
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_org uuid; v_order uuid; v_item jsonb; v_variant public.commerce_variants%rowtype; v_price bigint; v_qty integer; v_subtotal bigint:=0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if not private.commerce_allowed(p_site_id,'commerce.orders.manage') then raise exception 'commerce order access denied'; end if;
  if length(trim(p_order_number))<3 or p_currency !~ '^[A-Z]{3}$' or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'invalid order input'; end if;
  insert into public.commerce_orders(organization_id,site_id,order_number,currency,customer_email,customer_name,created_by)
  values(v_org,p_site_id,trim(p_order_number),p_currency,nullif(trim(coalesce(p_customer_email,'')),''),nullif(trim(coalesce(p_customer_name,'')),''),auth.uid()) returning id into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_variant from public.commerce_variants where id=(v_item->>'variant_id')::uuid and site_id=p_site_id and active;
    if not found then raise exception 'invalid order variant'; end if;
    v_qty:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
    select cp.amount_minor into v_price from public.commerce_prices cp
      where cp.variant_id=v_variant.id and cp.currency=p_currency and cp.active
        and (cp.starts_at is null or cp.starts_at<=now()) and (cp.ends_at is null or cp.ends_at>now()) and cp.min_quantity<=v_qty
      order by cp.min_quantity desc,cp.created_at desc limit 1;
    if v_price is null then raise exception 'price unavailable'; end if;
    insert into public.commerce_order_items(order_id,variant_id,sku,title,quantity,unit_price_minor,line_total_minor)
      values(v_order,v_variant.id,v_variant.sku,v_variant.title,v_qty,v_price,v_qty*v_price);
    v_subtotal:=v_subtotal+(v_qty*v_price);
  end loop;
  update public.commerce_orders set subtotal_minor=v_subtotal,total_minor=v_subtotal,updated_at=now() where id=v_order;
  perform public.record_audit_event('commerce.order.created','commerce_order',v_order::text,v_org,p_site_id,null,
    jsonb_build_object('order_number',p_order_number,'currency',p_currency,'subtotal_minor',v_subtotal),'{}'::jsonb,null,null,'notice');
  return v_order;
end; $$;

revoke all on function public.create_commerce_product(uuid,text,text,text,text,bigint,integer,text,text) from public,anon;
revoke all on function public.adjust_inventory(uuid,uuid,uuid,integer,text) from public,anon;
revoke all on function public.create_draft_order(uuid,text,text,text,text,jsonb) from public,anon;
grant execute on function public.create_commerce_product(uuid,text,text,text,text,bigint,integer,text,text) to authenticated;
grant execute on function public.adjust_inventory(uuid,uuid,uuid,integer,text) to authenticated;
grant execute on function public.create_draft_order(uuid,text,text,text,text,jsonb) to authenticated;
