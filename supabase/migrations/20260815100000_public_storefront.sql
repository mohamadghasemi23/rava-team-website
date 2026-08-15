-- Safe public storefront read surface. Internal commerce tables remain private.
create or replace function public.public_storefront_products(p_tenant uuid,p_limit int default 48,p_offset int default 0,p_category text default null)
returns table(product_id uuid,name text,slug text,description text,price numeric,currency text,compare_at_price numeric,stock bigint,category_name text,category_slug text,cover_url text,avg_rating numeric,review_count bigint)
language sql stable security definer set search_path=public as $$
 select p.id,p.name,p.slug,p.description,v.price,v.currency,v.compare_at_price,v.inventory_quantity,c.name,c.slug,
        coalesce(p.metadata->>'cover_url','') as cover_url,
        coalesce(r.avg_rating,0),coalesce(r.review_count,0)
 from products p
 join tenants t on t.id=p.tenant_id and t.status='active'
 left join product_categories c on c.id=p.category_id
 join lateral(select pv.price,pv.currency,pv.compare_at_price,pv.inventory_quantity from product_variants pv where pv.product_id=p.id and pv.tenant_id=p.tenant_id order by pv.created_at asc limit 1)v on true
 left join lateral(select round(avg(pr.rating)::numeric,2) avg_rating,count(*) review_count from product_reviews pr where pr.product_id=p.id and pr.tenant_id=p.tenant_id and pr.status='published')r on true
 where p.tenant_id=p_tenant and p.status='active' and public.has_entitlement(p_tenant,'commerce.core')
 and (p_category is null or c.slug=p_category)
 order by p.created_at desc limit greatest(1,least(coalesce(p_limit,48),96)) offset greatest(coalesce(p_offset,0),0)
$$;
create or replace function public.public_storefront_product(p_tenant uuid,p_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
 select case when p.id is null then null else jsonb_build_object(
  'id',p.id,'name',p.name,'slug',p.slug,'description',p.description,'product_type',p.product_type,'cover_url',coalesce(p.metadata->>'cover_url',''),
  'category',case when c.id is null then null else jsonb_build_object('name',c.name,'slug',c.slug) end,
  'variants',coalesce((select jsonb_agg(jsonb_build_object('id',pv.id,'title',pv.title,'sku',pv.sku,'price',pv.price,'compare_at_price',pv.compare_at_price,'currency',pv.currency,'stock',pv.inventory_quantity,'attributes',pv.attributes) order by pv.created_at) from product_variants pv where pv.tenant_id=p_tenant and pv.product_id=p.id),'[]'::jsonb),
  'reviews',coalesce((select jsonb_agg(jsonb_build_object('rating',pr.rating,'title',pr.title,'body',pr.body,'reviewer_name',pr.reviewer_name,'verified_purchase',pr.verified_purchase,'merchant_reply',pr.merchant_reply,'created_at',pr.created_at) order by pr.created_at desc) from product_reviews pr where pr.tenant_id=p_tenant and pr.product_id=p.id and pr.status='published'),'[]'::jsonb),
  'rating',coalesce((select round(avg(pr.rating)::numeric,2) from product_reviews pr where pr.tenant_id=p_tenant and pr.product_id=p.id and pr.status='published'),0)
 ) end
 from products p join tenants t on t.id=p.tenant_id and t.status='active' left join product_categories c on c.id=p.category_id
 where p.tenant_id=p_tenant and p.slug=p_slug and p.status='active' and public.has_entitlement(p_tenant,'commerce.core') limit 1
$$;
revoke all on function public.public_storefront_products(uuid,int,int,text) from public;grant execute on function public.public_storefront_products(uuid,int,int,text) to anon,authenticated;
revoke all on function public.public_storefront_product(uuid,text) from public;grant execute on function public.public_storefront_product(uuid,text) to anon,authenticated;
