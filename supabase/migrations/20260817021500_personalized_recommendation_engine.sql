-- RAVA Customer Personalization Engine
-- Logged-in customers get tenant-scoped personalization from their own purchases and wishlist.
-- Anonymous shoppers continue to use the automatic aggregate engine; no cross-tenant or cross-user profile exposure.

alter table public.recommendation_engine_settings
 add column if not exists personalization_enabled boolean not null default true,
 add column if not exists purchase_affinity_weight numeric not null default 10 check(purchase_affinity_weight between 0 and 1000),
 add column if not exists wishlist_affinity_weight numeric not null default 7 check(wishlist_affinity_weight between 0 and 1000),
 add column if not exists price_affinity_weight numeric not null default 4 check(price_affinity_weight between 0 and 1000);

create or replace function public.personalized_product_recommendation_candidates(p_tenant uuid,p_sources uuid[],p_kind text default 'cross_sell',p_limit integer default 20)
returns table(product_id uuid,score numeric,reason text)
language plpgsql stable security definer set search_path=public as $$
declare cfg public.recommendation_engine_settings;u uuid:=auth.uid();begin
 if p_kind not in('cross_sell','upsell') then raise exception 'invalid_kind';end if;
 if coalesce(array_length(p_sources,1),0)=0 then return;end if;
 cfg:=public.recommendation_settings_for(p_tenant);
 if not cfg.auto_mode then return;end if;
 if u is null or not cfg.personalization_enabled or not exists(select 1 from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) then
  return query select a.product_id,a.score,a.reason from public.auto_product_recommendation_candidates(p_tenant,p_sources,p_kind,p_limit)a;
  return;
 end if;
 return query
 with base as(select * from public.auto_product_recommendation_candidates(p_tenant,p_sources,p_kind,30)),
 purchased as(
  select oi.product_id,p.category_id,count(*)::numeric n,avg(oi.unit_price)::numeric avg_price
  from public.orders o join public.order_items oi on oi.order_id=o.id and oi.tenant_id=o.tenant_id
  left join public.products p on p.id=oi.product_id and p.tenant_id=o.tenant_id
  where o.tenant_id=p_tenant and o.customer_id in(select cp.id from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u)
   and o.payment_status in('paid','partially_refunded') and oi.product_id is not null and o.created_at>=now()-interval '730 days'
  group by oi.product_id,p.category_id
 ), wished as(
  select w.product_id,p.category_id from public.customer_wishlist_items w join public.products p on p.id=w.product_id and p.tenant_id=w.tenant_id
  where w.tenant_id=p_tenant and w.user_id=u
 ), pref as(
  select avg(x.price)::numeric avg_price from(
   select oi.unit_price::numeric price from public.orders o join public.order_items oi on oi.order_id=o.id and oi.tenant_id=o.tenant_id
   where o.tenant_id=p_tenant and o.customer_id in(select cp.id from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) and o.payment_status in('paid','partially_refunded')
   union all
   select v.price::numeric from public.customer_wishlist_items w join public.product_variants v on v.id=w.variant_id and v.tenant_id=w.tenant_id where w.tenant_id=p_tenant and w.user_id=u
  )x
 ), scored as(
  select b.product_id,
   b.score+
   (case when exists(select 1 from public.products p join purchased h on h.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then cfg.purchase_affinity_weight else 0 end)+
   (case when exists(select 1 from public.products p join wished w on w.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then cfg.wishlist_affinity_weight else 0 end)+
   (case when (select avg_price from pref)>0 and exists(select 1 from public.product_variants v where v.tenant_id=p_tenant and v.product_id=b.product_id and v.status='active' and v.price between (select avg_price*.65 from pref) and (select avg_price*1.5 from pref)) then cfg.price_affinity_weight else 0 end) score,
   case
    when exists(select 1 from public.products p join wished w on w.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'متناسب با علاقه‌مندی‌های شما'
    when exists(select 1 from public.products p join purchased h on h.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'متناسب با خریدهای قبلی شما'
    else b.reason end reason
  from base b
 )
 select s.product_id,s.score,s.reason from scored s order by s.score desc limit greatest(1,least(p_limit,30));
end$$;
revoke all on function public.personalized_product_recommendation_candidates(uuid,uuid[],text,integer) from public;
grant execute on function public.personalized_product_recommendation_candidates(uuid,uuid[],text,integer) to anon,authenticated;

create or replace function public.public_product_recommendations(p_tenant uuid,p_product uuid,p_kind text default 'cross_sell',p_limit integer default 6)
returns table(product_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language sql stable security definer set search_path=public as $$
 with cfg as(select * from public.recommendation_settings_for(p_tenant)),manual as(
  select r.target_product_id product_id,(select manual_override_weight from cfg)+r.priority::numeric score,case when r.kind='upsell' then 'ارتقای انتخاب‌شده توسط فروشگاه' else 'مکمل انتخاب‌شده توسط فروشگاه' end reason
  from public.product_recommendation_rules r where r.tenant_id=p_tenant and r.source_product_id=p_product and r.kind=p_kind and r.active and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())
 ),auto as(select * from public.personalized_product_recommendation_candidates(p_tenant,array[p_product],p_kind,20)),merged as(select product_id,max(score) score,(array_agg(reason order by score desc))[1] reason from(select * from manual union all select * from auto)x group by product_id)
 select p.id,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),''),coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),coalesce((select min(v.currency) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),'IRR'),coalesce((select sum(v.inventory_quantity)::bigint from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and v.status='active'),0),m.reason
 from merged m join public.products p on p.id=m.product_id and p.tenant_id=p_tenant and p.status='active' where public.has_entitlement(p_tenant,'commerce.core') order by m.score desc limit greatest(1,least(p_limit,12))
$$;

create or replace function public.public_cart_revenue_recommendations(p_tenant uuid,p_products uuid[],p_limit integer default 4)
returns table(product_id uuid,variant_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language sql stable security definer set search_path=public as $$
 with valid as(select array_agg(p.id) ids from public.products p where p.tenant_id=p_tenant and p.status='active' and p.id=any(p_products)),auto as(select a.* from valid v cross join lateral public.personalized_product_recommendation_candidates(p_tenant,coalesce(v.ids,'{}'::uuid[]),'cross_sell',20)a),cfg as(select * from public.recommendation_settings_for(p_tenant)),manual as(
  select r.target_product_id product_id,(select manual_override_weight from cfg)+r.priority::numeric score,'مکمل انتخاب‌شده توسط فروشگاه'::text reason from public.product_recommendation_rules r,valid v where r.tenant_id=p_tenant and r.source_product_id=any(coalesce(v.ids,'{}'::uuid[])) and r.kind='cross_sell' and r.active and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())
 ),merged as(select product_id,max(score) score,(array_agg(reason order by score desc))[1] reason from(select * from manual union all select * from auto)x group by product_id),picked as(select m.product_id,m.score,m.reason,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),'') cover_url from merged m join public.products p on p.id=m.product_id and p.tenant_id=p_tenant and p.status='active')
 select x.product_id,v.id,x.slug,x.name,x.cover_url,v.price,v.currency,case when v.track_inventory then v.inventory_quantity::bigint else 999999::bigint end,x.reason from picked x join lateral(select pv.* from public.product_variants pv where pv.tenant_id=p_tenant and pv.product_id=x.product_id and pv.status='active' and(not pv.track_inventory or pv.inventory_quantity>0 or pv.allow_backorder) order by pv.is_default desc,pv.price asc limit 1)v on true order by x.score desc limit greatest(1,least(p_limit,8))
$$;
grant execute on function public.public_product_recommendations(uuid,uuid,text,integer),public.public_cart_revenue_recommendations(uuid,uuid[],integer) to anon,authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations.personalization','شخصی‌سازی پیشنهادها','برای مشتری واردشده، RAVA علاوه بر یادگیری جمعی فروشگاه از خریدهای قبلی، دسته‌های موردعلاقه، Wishlist و محدوده قیمت خود همان مشتری برای مرتب‌سازی پیشنهادها استفاده می‌کند. کاربر مهمان همچنان پیشنهاد خودکار عمومی دریافت می‌کند.','شخصی‌سازی فقط داخل همان Tenant و برای auth.uid() فعلی انجام می‌شود؛ اطلاعات یک مشتری یا فروشگاه نباید برای مشتری یا Tenant دیگر افشا شود.','Personalized recommendations','For signed-in customers, RAVA combines store-wide learning with that customer’s own purchases, wishlist category affinity and price range. Anonymous shoppers continue to receive aggregate automatic recommendations.','Personalization is tenant-scoped and bound to the current auth.uid(); one customer or tenant must never expose profile data to another.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;