create extension if not exists pg_trgm;

create table if not exists public.product_search_events(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,query text not null,result_count integer not null default 0,category_slug text,min_price numeric,max_price numeric,in_stock boolean,sort_key text,created_at timestamptz not null default now()
);
create index if not exists product_search_events_tenant_time_idx on public.product_search_events(tenant_id,created_at desc);
create index if not exists products_name_trgm_idx on public.products using gin(name gin_trgm_ops);
create index if not exists products_summary_trgm_idx on public.products using gin(summary gin_trgm_ops);
alter table public.product_search_events enable row level security;
create policy product_search_events_admin_read on public.product_search_events for select to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null));

create or replace function public.public_product_discovery(
 p_tenant uuid,p_query text default null,p_category text default null,p_min_price numeric default null,p_max_price numeric default null,p_in_stock boolean default null,p_sort text default 'relevance',p_limit integer default 48,p_offset integer default 0
) returns table(product_id uuid,slug text,name text,summary text,category_name text,category_slug text,cover_url text,price numeric,currency text,stock bigint,avg_rating numeric,review_count bigint,total_count bigint)
language sql stable security definer set search_path=public as $$
 with base as(
  select p.id product_id,p.slug,p.name,p.summary,c.name category_name,c.slug category_slug,
   (select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1) cover_url,
   coalesce((select min(v.price) from public.product_variants v where v.product_id=p.id and v.status='active'),0) price,
   coalesce((select min(v.currency) from public.product_variants v where v.product_id=p.id and v.status='active'),'IRR') currency,
   coalesce((select sum(v.inventory_quantity)::bigint from public.product_variants v where v.product_id=p.id and v.status='active'),0) stock,
   coalesce((select avg(r.rating)::numeric from public.product_reviews r where r.product_id=p.id and r.status='approved'),0) avg_rating,
   coalesce((select count(*)::bigint from public.product_reviews r where r.product_id=p.id and r.status='approved'),0) review_count,
   case when nullif(trim(p_query),'') is null then 0 else greatest(similarity(p.name,trim(p_query)),similarity(coalesce(p.summary,''),trim(p_query))) end relevance
  from public.products p left join public.product_categories c on c.id=p.category_id and c.tenant_id=p.tenant_id
  where p.tenant_id=p_tenant and p.status='active'
 ),filtered as(
  select * from base where (nullif(trim(p_query),'') is null or name ilike '%'||trim(p_query)||'%' or coalesce(summary,'') ilike '%'||trim(p_query)||'%' or relevance>.12)
   and (p_category is null or category_slug=p_category) and (p_min_price is null or price>=p_min_price) and (p_max_price is null or price<=p_max_price) and (p_in_stock is null or (p_in_stock and stock>0) or (not p_in_stock and stock<=0))
 ) select product_id,slug,name,summary,category_name,category_slug,cover_url,price,currency,stock,avg_rating,review_count,count(*) over() total_count from filtered
 order by case when p_sort='price_asc' then price end asc,case when p_sort='price_desc' then price end desc,case when p_sort='rating' then avg_rating end desc,case when p_sort='newest' then product_id end desc,relevance desc,name asc limit greatest(1,least(p_limit,100)) offset greatest(0,p_offset)
$$;

create or replace function public.public_product_search_suggestions(p_tenant uuid,p_query text,p_limit integer default 8) returns table(slug text,name text,category_name text)
language sql stable security definer set search_path=public as $$ select p.slug,p.name,c.name from public.products p left join public.product_categories c on c.id=p.category_id where p.tenant_id=p_tenant and p.status='active' and length(trim(coalesce(p_query,'')))>=2 and (p.name ilike '%'||trim(p_query)||'%' or similarity(p.name,trim(p_query))>.15) order by similarity(p.name,trim(p_query)) desc,p.name limit greatest(1,least(p_limit,12)) $$;

create or replace function public.record_product_search(p_tenant uuid,p_query text,p_result_count integer,p_category text default null,p_min_price numeric default null,p_max_price numeric default null,p_in_stock boolean default null,p_sort text default null) returns void language plpgsql security definer set search_path=public as $$ begin if length(trim(coalesce(p_query,'')))<2 then return;end if;insert into public.product_search_events(tenant_id,query,result_count,category_slug,min_price,max_price,in_stock,sort_key) values(p_tenant,left(trim(p_query),120),greatest(0,p_result_count),left(p_category,120),p_min_price,p_max_price,p_in_stock,left(p_sort,30));end $$;
grant execute on function public.public_product_discovery(uuid,text,text,numeric,numeric,boolean,text,integer,integer),public.public_product_search_suggestions(uuid,text,integer),public.record_product_search(uuid,text,integer,text,numeric,numeric,boolean,text) to anon,authenticated;