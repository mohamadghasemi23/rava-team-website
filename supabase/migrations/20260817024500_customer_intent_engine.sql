-- Customer Intent Engine: dwell, repeat attention and cart intent feed personalization.
create table if not exists public.customer_product_intent_events(
 id bigint generated always as identity primary key,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 variant_id uuid references public.product_variants(id) on delete set null,
 event_type text not null check(event_type in('dwell','image_engagement','variant_interest','add_to_cart')),
 strength numeric not null default 1 check(strength between 0 and 100),
 session_key text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists customer_product_intent_user_idx on public.customer_product_intent_events(tenant_id,user_id,created_at desc);
create index if not exists customer_product_intent_product_idx on public.customer_product_intent_events(tenant_id,product_id,event_type,created_at desc);
alter table public.customer_product_intent_events enable row level security;
create policy customer_product_intent_self_read on public.customer_product_intent_events for select to authenticated using(user_id=auth.uid());

create or replace function public.record_customer_product_intent(p_tenant uuid,p_product uuid,p_event text,p_strength numeric default 1,p_variant uuid default null,p_session text default null,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null then return;end if;
 if p_event not in('dwell','image_engagement','variant_interest','add_to_cart') then return;end if;
 if not exists(select 1 from public.customer_profiles where tenant_id=p_tenant and user_id=auth.uid()) then return;end if;
 if not exists(select 1 from public.products where id=p_product and tenant_id=p_tenant and status='active') then return;end if;
 if p_variant is not null and not exists(select 1 from public.product_variants where id=p_variant and product_id=p_product and tenant_id=p_tenant and status='active') then return;end if;
 if p_event in('dwell','image_engagement','variant_interest') and p_session is not null and exists(select 1 from public.customer_product_intent_events where tenant_id=p_tenant and user_id=auth.uid() and product_id=p_product and event_type=p_event and session_key=left(p_session,80) and created_at>now()-interval '10 minutes') then return;end if;
 insert into public.customer_product_intent_events(tenant_id,user_id,product_id,variant_id,event_type,strength,session_key,metadata)
 values(p_tenant,auth.uid(),p_product,p_variant,p_event,greatest(0,least(coalesce(p_strength,1),100)),left(p_session,80),coalesce(p_metadata,'{}'::jsonb));
end$$;
revoke all on function public.record_customer_product_intent(uuid,uuid,text,numeric,uuid,text,jsonb) from public;
grant execute on function public.record_customer_product_intent(uuid,uuid,text,numeric,uuid,text,jsonb) to authenticated;

alter table public.recommendation_engine_settings
 add column if not exists intent_affinity_weight numeric not null default 9 check(intent_affinity_weight between 0 and 1000);

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
 purchased as(select p.category_id,count(*)::numeric n from public.orders o join public.order_items oi on oi.order_id=o.id and oi.tenant_id=o.tenant_id join public.products p on p.id=oi.product_id and p.tenant_id=o.tenant_id where o.tenant_id=p_tenant and o.customer_id in(select cp.id from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) and o.payment_status in('paid','partially_refunded') and oi.product_id is not null and o.created_at>=now()-interval '730 days' group by p.category_id),
 wished as(select distinct p.category_id from public.customer_wishlist_items w join public.products p on p.id=w.product_id and p.tenant_id=w.tenant_id where w.tenant_id=p_tenant and w.user_id=u),
 intent as(select p.category_id,sum((case e.event_type when 'add_to_cart' then 4 when 'variant_interest' then 2.5 when 'image_engagement' then 1.5 when 'dwell' then 1 else 0 end)*e.strength*greatest(.15,1-(extract(epoch from(now()-e.created_at))/86400.0/60.0)))::numeric intent_score from public.customer_product_intent_events e join public.products p on p.id=e.product_id and p.tenant_id=e.tenant_id where e.tenant_id=p_tenant and e.user_id=u and e.created_at>=now()-interval '120 days' group by p.category_id),
 pref as(select avg(x.price)::numeric avg_price from(select oi.unit_price::numeric price from public.orders o join public.order_items oi on oi.order_id=o.id and oi.tenant_id=o.tenant_id where o.tenant_id=p_tenant and o.customer_id in(select cp.id from public.customer_profiles cp where cp.tenant_id=p_tenant and cp.user_id=u) and o.payment_status in('paid','partially_refunded') union all select v.price::numeric from public.customer_wishlist_items w join public.product_variants v on v.id=w.variant_id and v.tenant_id=w.tenant_id where w.tenant_id=p_tenant and w.user_id=u)x),
 scored as(select b.product_id,b.score+
  (case when exists(select 1 from public.products p join purchased h on h.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then cfg.purchase_affinity_weight else 0 end)+
  (case when exists(select 1 from public.products p join wished w on w.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then cfg.wishlist_affinity_weight else 0 end)+
  coalesce((select least(i.intent_score,25)*cfg.intent_affinity_weight/10 from public.products p join intent i on i.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant limit 1),0)+
  (case when (select avg_price from pref)>0 and exists(select 1 from public.product_variants v where v.tenant_id=p_tenant and v.product_id=b.product_id and v.status='active' and v.price between(select avg_price*.65 from pref)and(select avg_price*1.5 from pref)) then cfg.price_affinity_weight else 0 end) score,
  case when exists(select 1 from public.products p join intent i on i.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant and i.intent_score>=3) then 'متناسب با علاقه اخیر شما' when exists(select 1 from public.products p join wished w on w.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'متناسب با علاقه‌مندی‌های شما' when exists(select 1 from public.products p join purchased h on h.category_id is not distinct from p.category_id where p.id=b.product_id and p.tenant_id=p_tenant) then 'متناسب با خریدهای قبلی شما' else b.reason end reason from base b)
 select s.product_id,s.score,s.reason from scored s order by s.score desc limit greatest(1,least(p_limit,30));
end$$;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations.intent','Intent Engine','RAVA فقط خرید نهایی را سیگنال علاقه نمی‌داند. ماندن معنادار روی صفحه، تعامل با تصویر، توجه به Variant و افزودن به سبد هم با وزن‌های متفاوت وارد شخصی‌سازی می‌شوند؛ سیگنال‌های جدیدتر وزن بیشتری دارند.','این سیگنال‌ها فقط برای کاربر واردشده، داخل همان Tenant و برای بهبود تجربه همان فروشگاه استفاده می‌شوند.','Intent Engine','RAVA treats meaningful dwell, image engagement, variant interest and add-to-cart as weighted intent signals in addition to purchases and wishlist activity. Recent signals carry more weight.','Intent signals are tenant-scoped, tied to the signed-in user, and used only for that store experience.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;