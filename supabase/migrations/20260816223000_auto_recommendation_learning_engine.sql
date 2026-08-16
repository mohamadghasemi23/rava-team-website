-- RAVA Automatic Recommendation Learning Engine
-- Automatic by default; manual rules are optional overrides, not a dependency.

create table if not exists public.recommendation_engine_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 auto_mode boolean not null default true,
 manual_override_weight numeric not null default 1000 check(manual_override_weight between 0 and 10000),
 co_purchase_weight numeric not null default 12 check(co_purchase_weight between 0 and 1000),
 purchase_feedback_weight numeric not null default 20 check(purchase_feedback_weight between 0 and 1000),
 add_to_cart_feedback_weight numeric not null default 4 check(add_to_cart_feedback_weight between 0 and 1000),
 click_feedback_weight numeric not null default 0.5 check(click_feedback_weight between 0 and 1000),
 category_weight numeric not null default 8 check(category_weight between 0 and 1000),
 popularity_weight numeric not null default 1.5 check(popularity_weight between 0 and 1000),
 in_stock_bonus numeric not null default 10 check(in_stock_bonus between 0 and 1000),
 exploration_bonus numeric not null default 1 check(exploration_bonus between 0 and 100),
 updated_at timestamptz not null default now()
);
alter table public.recommendation_engine_settings enable row level security;
create policy recommendation_settings_admin on public.recommendation_engine_settings for all to authenticated
 using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null))
 with check(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null));

create or replace function public.recommendation_settings_for(p_tenant uuid)
returns public.recommendation_engine_settings language plpgsql stable security definer set search_path=public as $$
declare r public.recommendation_engine_settings;begin
 select * into r from public.recommendation_engine_settings where tenant_id=p_tenant;
 if r.tenant_id is null then
  r.tenant_id:=p_tenant;r.auto_mode:=true;r.manual_override_weight:=1000;r.co_purchase_weight:=12;r.purchase_feedback_weight:=20;r.add_to_cart_feedback_weight:=4;r.click_feedback_weight:=0.5;r.category_weight:=8;r.popularity_weight:=1.5;r.in_stock_bonus:=10;r.exploration_bonus:=1;r.updated_at:=now();
 end if;return r;end$$;
revoke all on function public.recommendation_settings_for(uuid) from public;grant execute on function public.recommendation_settings_for(uuid) to authenticated,service_role;

create or replace function public.auto_product_recommendation_candidates(p_tenant uuid,p_sources uuid[],p_kind text default 'cross_sell',p_limit integer default 12)
returns table(product_id uuid,score numeric,reason text)
language plpgsql stable security definer set search_path=public as $$
declare cfg public.recommendation_engine_settings;begin
 if p_kind not in('cross_sell','upsell') then raise exception 'invalid_kind';end if;
 if coalesce(array_length(p_sources,1),0)=0 then return;end if;
 cfg:=public.recommendation_settings_for(p_tenant);
 if not cfg.auto_mode then return;end if;
 return query
 with src as(
  select p.id,p.category_id,coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0) price
  from public.products p where p.tenant_id=p_tenant and p.status='active' and p.id=any(p_sources)
 ), candidates as(
  select p.id,p.category_id,p.created_at,
   coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0) price,
   coalesce((select sum(case when v.track_inventory then greatest(v.inventory_quantity,0) else 1 end) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0) stock
  from public.products p where p.tenant_id=p_tenant and p.status='active' and not(p.id=any(p_sources))
 ), co_buy as(
  select oi2.product_id,count(distinct oi.order_id)::numeric n
  from public.order_items oi join public.orders o on o.id=oi.order_id and o.tenant_id=p_tenant and o.payment_status in('paid','partially_refunded')
  join public.order_items oi2 on oi2.order_id=oi.order_id and oi2.tenant_id=p_tenant and oi2.product_id is not null
  where oi.tenant_id=p_tenant and oi.product_id=any(p_sources) and not(oi2.product_id=any(p_sources)) and o.created_at>=now()-interval '365 days'
  group by oi2.product_id
 ), feedback as(
  select e.recommended_product_id product_id,
   count(*) filter(where e.event_type='purchase')::numeric purchases,
   count(*) filter(where e.event_type='add_to_cart')::numeric adds,
   count(*) filter(where e.event_type='click')::numeric clicks,
   count(*) filter(where e.event_type='impression')::numeric impressions
  from public.recommendation_events e
  where e.tenant_id=p_tenant and e.created_at>=now()-interval '180 days' and (e.source_product_id=any(p_sources) or e.placement='cart')
  group by e.recommended_product_id
 ), popularity as(
  select oi.product_id,count(*)::numeric n from public.order_items oi join public.orders o on o.id=oi.order_id and o.tenant_id=p_tenant and o.payment_status in('paid','partially_refunded')
  where oi.tenant_id=p_tenant and oi.product_id is not null and o.created_at>=now()-interval '90 days' group by oi.product_id
 ), scored as(
  select c.id,
   coalesce(cb.n,0)*cfg.co_purchase_weight +
   coalesce(f.purchases,0)*cfg.purchase_feedback_weight +
   coalesce(f.adds,0)*cfg.add_to_cart_feedback_weight +
   coalesce(f.clicks,0)*cfg.click_feedback_weight +
   coalesce(pop.n,0)*cfg.popularity_weight +
   (case when exists(select 1 from src s where s.category_id is not distinct from c.category_id) then cfg.category_weight else 0 end) +
   (case when c.stock>0 then cfg.in_stock_bonus else 0 end) +
   (case when coalesce(f.impressions,0)<3 then cfg.exploration_bonus else 0 end) +
   (case when p_kind='upsell' and exists(select 1 from src s where c.price>s.price and s.price>0) then 8 else 0 end) +
   (case when p_kind='cross_sell' and exists(select 1 from src s where c.category_id is distinct from s.category_id) then 2 else 0 end) score,
   case
    when coalesce(cb.n,0)>0 then 'مشتری‌ها معمولاً همراه این محصول می‌خرند'
    when coalesce(f.purchases,0)>0 then 'پیشنهاد موفق بر اساس خریدهای واقعی'
    when coalesce(f.adds,0)>0 then 'پیشنهاد محبوب بین مشتری‌ها'
    when exists(select 1 from src s where s.category_id is not distinct from c.category_id) then 'مرتبط با انتخاب شما'
    when coalesce(pop.n,0)>0 then 'محصول محبوب فروشگاه'
    else 'پیشنهاد هوشمند برای کشف محصول' end reason
  from candidates c left join co_buy cb on cb.product_id=c.id left join feedback f on f.product_id=c.id left join popularity pop on pop.product_id=c.id
  where c.stock>0
 )
 select s.id,s.score,s.reason from scored s where s.score>0 order by s.score desc,random() limit greatest(1,least(p_limit,30));
end$$;
revoke all on function public.auto_product_recommendation_candidates(uuid,uuid[],text,integer) from public;grant execute on function public.auto_product_recommendation_candidates(uuid,uuid[],text,integer) to anon,authenticated;

create or replace function public.public_product_recommendations(p_tenant uuid,p_product uuid,p_kind text default 'cross_sell',p_limit integer default 6)
returns table(product_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language sql stable security definer set search_path=public as $$
 with cfg as(select * from public.recommendation_settings_for(p_tenant)),
 manual as(
  select r.target_product_id product_id,(select manual_override_weight from cfg)+r.priority::numeric score,case when r.kind='upsell' then 'ارتقای انتخاب‌شده توسط فروشگاه' else 'مکمل انتخاب‌شده توسط فروشگاه' end reason
  from public.product_recommendation_rules r where r.tenant_id=p_tenant and r.source_product_id=p_product and r.kind=p_kind and r.active and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())
 ), auto as(select * from public.auto_product_recommendation_candidates(p_tenant,array[p_product],p_kind,20)),
 merged as(select product_id,max(score) score,(array_agg(reason order by score desc))[1] reason from(select * from manual union all select * from auto)x group by product_id)
 select p.id,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),''),
  coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),coalesce((select min(v.currency) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),'IRR'),coalesce((select sum(v.inventory_quantity)::bigint from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),m.reason
 from merged m join public.products p on p.id=m.product_id and p.tenant_id=p_tenant and p.status='active' where public.has_entitlement(p_tenant,'commerce.core') order by m.score desc limit greatest(1,least(p_limit,12))
$$;

create or replace function public.public_cart_revenue_recommendations(p_tenant uuid,p_products uuid[],p_limit integer default 4)
returns table(product_id uuid,variant_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language sql stable security definer set search_path=public as $$
 with valid as(select array_agg(p.id) ids from public.products p where p.tenant_id=p_tenant and p.status='active' and p.id=any(p_products)),
 auto as(select a.* from valid v cross join lateral public.auto_product_recommendation_candidates(p_tenant,coalesce(v.ids,'{}'::uuid[]),'cross_sell',20)a),
 manual as(
  select r.target_product_id product_id,1000+r.priority::numeric score,'مکمل انتخاب‌شده توسط فروشگاه'::text reason
  from public.product_recommendation_rules r,valid v where r.tenant_id=p_tenant and r.source_product_id=any(coalesce(v.ids,'{}'::uuid[])) and r.kind='cross_sell' and r.active and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())
 ), merged as(select product_id,max(score) score,(array_agg(reason order by score desc))[1] reason from(select * from manual union all select * from auto)x group by product_id),
 picked as(
  select m.product_id,m.score,m.reason,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),'') cover_url
  from merged m join public.products p on p.id=m.product_id and p.tenant_id=p_tenant and p.status='active'
 )
 select x.product_id,v.id,x.slug,x.name,x.cover_url,v.price,v.currency,case when v.track_inventory then v.inventory_quantity::bigint else 999999::bigint end,x.reason
 from picked x join lateral(select pv.* from public.product_variants pv where pv.tenant_id=p_tenant and pv.product_id=x.product_id and pv.status='active' and(not pv.track_inventory or pv.inventory_quantity>0 or pv.allow_backorder) order by pv.is_default desc,pv.price asc limit 1)v on true
 order by x.score desc limit greatest(1,least(p_limit,8))
$$;
grant execute on function public.public_product_recommendations(uuid,uuid,text,integer),public.public_cart_revenue_recommendations(uuid,uuid[],integer) to anon,authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations.auto','موتور پیشنهاد خودکار','حالت پیش‌فرض RAVA خودکار است. سیستم از خریدهای واقعی، محصولات همراه، عملکرد پیشنهادهای قبلی، محبوبیت، دسته‌بندی، قیمت و موجودی برای رتبه‌بندی استفاده می‌کند. قوانین دستی فقط Override اختیاری هستند. با جمع‌شدن داده، خرید و افزودن به سبد وزن بیشتری از کلیک می‌گیرند و پیشنهادهای ناموفق به‌مرور پایین می‌آیند.','مدیر لازم نیست برای همه محصولات رابطه دستی تعریف کند. Override دستی فقط زمانی استفاده شود که هدف تجاری مشخصی وجود دارد.','Automatic recommendation engine','RAVA defaults to automatic recommendations. Ranking uses real purchases, co-purchases, previous recommendation performance, popularity, category, price and inventory. Manual rules are optional overrides. Purchases and add-to-cart feedback carry more weight than clicks as the system learns.','Managers do not need to maintain relationships for every product. Use manual overrides only for explicit merchandising goals.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;