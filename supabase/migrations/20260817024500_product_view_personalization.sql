-- RAVA behavioral personalization: learn from authenticated product views before a purchase or wishlist action.

alter table public.recommendation_engine_settings
 add column if not exists view_affinity_weight numeric not null default 5 check(view_affinity_weight between 0 and 1000);

create table if not exists public.customer_product_views(
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 view_count integer not null default 1 check(view_count>0),
 first_viewed_at timestamptz not null default now(),
 last_viewed_at timestamptz not null default now(),
 primary key(tenant_id,user_id,product_id)
);
create index if not exists customer_product_views_recent_idx on public.customer_product_views(tenant_id,user_id,last_viewed_at desc);
alter table public.customer_product_views enable row level security;
create policy customer_product_views_self_select on public.customer_product_views for select to authenticated using(user_id=auth.uid());

create or replace function public.record_customer_product_view(p_tenant uuid,p_product uuid)
returns void language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();begin
 if u is null then return;end if;
 if not exists(select 1 from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) then return;end if;
 if not exists(select 1 from public.products p where p.tenant_id=p_tenant and p.id=p_product and p.status='active') then return;end if;
 insert into public.customer_product_views(tenant_id,user_id,product_id,view_count,first_viewed_at,last_viewed_at)
 values(p_tenant,u,p_product,1,now(),now())
 on conflict(tenant_id,user_id,product_id) do update set view_count=least(public.customer_product_views.view_count+1,1000000),last_viewed_at=now();
end$$;
revoke all on function public.record_customer_product_view(uuid,uuid) from public;
grant execute on function public.record_customer_product_view(uuid,uuid) to authenticated;

create or replace function public.personalized_product_recommendation_candidates(p_tenant uuid,p_sources uuid[],p_kind text default 'cross_sell',p_limit integer default 20)
returns table(product_id uuid,score numeric,reason text)
language plpgsql stable security definer set search_path=public as $$
declare cfg public.recommendation_engine_settings;u uuid:=auth.uid();begin
 if p_kind not in('cross_sell','upsell') then raise exception 'invalid_kind';end if;
 if coalesce(array_length(p_sources,1),0)=0 then return;end if;
 cfg:=public.recommendation_settings_for(p_tenant);
 if not cfg.auto_mode then return;end if;
 if u is null or not cfg.personalization_enabled or not exists(select 1 from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) then
  return query select a.product_id,a.score,a.reason from public.auto_product_recommendation_candidates(p_tenant,p_sources,p_kind,p_limit)a;return;
 end if;
 return query
 with base as(select * from public.auto_product_recommendation_candidates(p_tenant,p_sources,p_kind,30)),
 purchased as(
  select p.category_id,count(*)::numeric n from public.orders o join public.order_items oi on oi.order_id=o.id and oi.tenant_id=o.tenant_id join public.products p on p.id=oi.product_id and p.tenant_id=o.tenant_id
  where o.tenant_id=p_tenant and o.customer_id in(select cp.id from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) and o.payment_status in('paid','partially_refunded') and o.created_at>=now()-interval '730 days' group by p.category_id
 ),wished as(
  select p.category_id,count(*)::numeric n from public.customer_wishlist_items w join public.products p on p.id=w.product_id and p.tenant_id=w.tenant_id where w.tenant_id=p_tenant and w.user_id=u group by p.category_id
 ),viewed as(
  select p.category_id,sum(least(v.view_count,20)::numeric/(1+(extract(epoch from(now()-v.last_viewed_at))/86400)/14)) affinity
  from public.customer_product_views v join public.products p on p.id=v.product_id and p.tenant_id=v.tenant_id
  where v.tenant_id=p_tenant and v.user_id=u and v.last_viewed_at>=now()-interval '120 days' group by p.category_id
 ),pref as(
  select avg(x.price)::numeric avg_price from(
   select oi.unit_price::numeric price from public.orders o join public.order_items oi on oi.order_id=o.id and oi.tenant_id=o.tenant_id where o.tenant_id=p_tenant and o.customer_id in(select cp.id from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) and o.payment_status in('paid','partially_refunded')
   union all select v.price::numeric from public.customer_wishlist_items w join public.product_variants v on v.id=w.variant_id and v.tenant_id=w.tenant_id where w.tenant_id=p_tenant and w.user_id=u
  )x
 ),scored as(
  select b.product_id,b.score+
   coalesce((select least(ph.n,5)*cfg.purchase_affinity_weight from public.products p join purchased ph on ph.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant limit 1),0)+
   coalesce((select least(wh.n,5)*cfg.wishlist_affinity_weight from public.products p join wished wh on wh.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant limit 1),0)+
   coalesce((select least(vh.affinity,8)*cfg.view_affinity_weight from public.products p join viewed vh on vh.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant limit 1),0)+
   (case when (select avg_price from pref)>0 and exists(select 1 from public.product_variants v where v.tenant_id=p_tenant and v.product_id=b.product_id and v.status='active' and v.price between (select avg_price*.65 from pref) and (select avg_price*1.5 from pref)) then cfg.price_affinity_weight else 0 end) score,
   case
    when exists(select 1 from public.products p join viewed vh on vh.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'بر اساس محصولاتی که اخیراً دیده‌اید'
    when exists(select 1 from public.products p join wished wh on wh.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'متناسب با علاقه‌مندی‌های شما'
    when exists(select 1 from public.products p join purchased ph on ph.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'متناسب با خریدهای قبلی شما'
    else b.reason end reason
  from base b
 ) select s.product_id,s.score,s.reason from scored s order by s.score desc limit greatest(1,least(p_limit,30));
end$$;
revoke all on function public.personalized_product_recommendation_candidates(uuid,uuid[],text,integer) from public;
grant execute on function public.personalized_product_recommendation_candidates(uuid,uuid[],text,integer) to anon,authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations.behavior','یادگیری از بازدید محصول','RAVA برای مشتری واردشده، حتی قبل از خرید یا افزودن به Wishlist، از محصولاتی که مشاهده می‌کند سیگنال سلیقه می‌سازد. بازدیدهای تازه وزن بیشتری دارند و اثر بازدیدهای قدیمی به‌مرور کم می‌شود.','این داده فقط برای شخصی‌سازی همان کاربر در همان Tenant استفاده می‌شود. بازدید مهمان در این نسخه وارد پروفایل شخصی نمی‌شود.','Product-view learning','For signed-in customers, RAVA can learn preference signals from viewed products before any purchase or wishlist action. Recent views weigh more and older views decay over time.','This data is used only to personalize the same user inside the same tenant. Anonymous views are not attached to a personal profile in this version.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;