-- RAVA Recommendation Revenue Engine
-- Commerce Core gets deterministic, tenant-safe recommendations. Advanced merchandising remains upgradeable later.

create table if not exists public.product_recommendation_rules(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 source_product_id uuid not null references public.products(id) on delete cascade,
 target_product_id uuid not null references public.products(id) on delete cascade,
 kind text not null check(kind in('cross_sell','upsell')),
 priority integer not null default 0 check(priority between -1000 and 1000),
 active boolean not null default true,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,source_product_id,target_product_id,kind),
 check(source_product_id<>target_product_id)
);
create index if not exists product_recommendation_rules_lookup_idx on public.product_recommendation_rules(tenant_id,source_product_id,kind,active,priority desc);
alter table public.product_recommendation_rules enable row level security;
create policy product_recommendation_rules_admin on public.product_recommendation_rules for all to authenticated
 using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null))
 with check(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null));

create table if not exists public.recommendation_events(
 id bigint generated always as identity primary key,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 source_product_id uuid references public.products(id) on delete set null,
 recommended_product_id uuid references public.products(id) on delete set null,
 placement text not null check(placement in('product','cart')),
 kind text not null check(kind in('cross_sell','upsell')),
 event_type text not null check(event_type in('impression','click','add_to_cart','purchase')),
 session_key text,
 order_id uuid references public.orders(id) on delete set null,
 revenue numeric(18,2) not null default 0 check(revenue>=0),
 created_at timestamptz not null default now()
);
create index if not exists recommendation_events_tenant_time_idx on public.recommendation_events(tenant_id,created_at desc);
alter table public.recommendation_events enable row level security;
create policy recommendation_events_admin_read on public.recommendation_events for select to authenticated
 using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null));

create or replace function public.public_product_recommendations(p_tenant uuid,p_product uuid,p_kind text default 'cross_sell',p_limit integer default 6)
returns table(product_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language sql stable security definer set search_path=public as $$
 with src as(select id,category_id from public.products where id=p_product and tenant_id=p_tenant and status='active'),
 manual as(
  select r.target_product_id product_id,r.priority,case when r.kind='upsell' then 'ارتقای پیشنهادی' else 'مکمل پیشنهادی' end reason
  from public.product_recommendation_rules r join src on src.id=r.source_product_id
  where r.tenant_id=p_tenant and r.kind=p_kind and r.active and (r.starts_at is null or r.starts_at<=now()) and (r.ends_at is null or r.ends_at>=now())
 ),
 bought as(
  select oi2.product_id,count(distinct oi.order_id)::integer score,'مشتری‌ها همراه این محصول خریده‌اند'::text reason
  from public.order_items oi join public.orders o on o.id=oi.order_id and o.tenant_id=p_tenant
  join public.order_items oi2 on oi2.order_id=oi.order_id and oi2.tenant_id=p_tenant and oi2.product_id is not null and oi2.product_id<>p_product
  where oi.tenant_id=p_tenant and oi.product_id=p_product and o.payment_status in('paid','partially_refunded')
  group by oi2.product_id
 ),
 candidates as(
  select product_id,300000+priority score,reason from manual
  union all select product_id,200000+score score,reason from bought
  union all select p.id,100000,'محصول مرتبط'::text from public.products p,src where p.tenant_id=p_tenant and p.status='active' and p.id<>src.id and p.category_id is not distinct from src.category_id
 ), ranked as(select product_id,max(score) score,(array_agg(reason order by score desc))[1] reason from candidates group by product_id)
 select p.id,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),''),
  coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),
  coalesce((select min(v.currency) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),'IRR'),
  coalesce((select sum(v.inventory_quantity)::bigint from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),r.reason
 from ranked r join public.products p on p.id=r.product_id and p.tenant_id=p_tenant and p.status='active'
 where public.has_entitlement(p_tenant,'commerce.core')
 order by r.score desc,p.created_at desc limit greatest(1,least(p_limit,12))
$$;

create or replace function public.public_cart_recommendations(p_tenant uuid,p_cart uuid,p_limit integer default 6)
returns table(product_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language sql stable security definer set search_path=public as $$
 with cart_products as(select distinct v.product_id from public.cart_items ci join public.product_variants v on v.id=ci.variant_id and v.tenant_id=p_tenant where ci.tenant_id=p_tenant and ci.cart_id=p_cart),
 pairs as(
  select oi2.product_id,count(*)::integer score from public.order_items oi join cart_products cp on cp.product_id=oi.product_id
  join public.orders o on o.id=oi.order_id and o.tenant_id=p_tenant and o.payment_status in('paid','partially_refunded')
  join public.order_items oi2 on oi2.order_id=oi.order_id and oi2.tenant_id=p_tenant and oi2.product_id is not null
  where oi.tenant_id=p_tenant and not exists(select 1 from cart_products x where x.product_id=oi2.product_id) group by oi2.product_id
 )
 select p.id,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),''),
 coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),coalesce((select min(v.currency) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),'IRR'),coalesce((select sum(v.inventory_quantity)::bigint from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),'مکمل سبد خرید'::text
 from pairs x join public.products p on p.id=x.product_id and p.tenant_id=p_tenant and p.status='active' where public.has_entitlement(p_tenant,'commerce.core') order by x.score desc,p.created_at desc limit greatest(1,least(p_limit,12))
$$;

grant execute on function public.public_product_recommendations(uuid,uuid,text,integer),public.public_cart_recommendations(uuid,uuid,integer) to anon,authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations','پیشنهاد فروش مکمل و ارتقا','RAVA از خریدهای واقعی قبلی، دسته محصول و قوانین دستی استفاده می‌کند تا کنار محصول یا سبد خرید، گزینه‌های مناسب‌تری برای افزایش مبلغ سفارش پیشنهاد دهد. Cross-sell یعنی محصول مکمل؛ Upsell یعنی گزینه بهتر یا باارزش‌تر.','پیشنهادها فقط از محصولات فعال همان فروشگاه ساخته می‌شوند و نباید محصول Tenant دیگر را نمایش دهند.','Cross-sell and upsell recommendations','RAVA uses previous purchases, product category and manual rules to suggest relevant products on product and cart surfaces. Cross-sell adds complementary items; upsell suggests a higher-value alternative.','Recommendations are tenant-scoped and only active products may be exposed.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;
