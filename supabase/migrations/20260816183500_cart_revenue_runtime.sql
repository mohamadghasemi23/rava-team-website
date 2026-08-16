-- RAVA Cart Revenue Runtime
-- Secure owner-only persisted-cart recommendations + safe stateless guest recommendations.

create or replace function public.public_cart_recommendations(p_tenant uuid,p_cart uuid,p_limit integer default 6)
returns table(product_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then return; end if;
 if not exists(select 1 from public.carts c where c.id=p_cart and c.tenant_id=p_tenant and c.user_id=auth.uid() and c.status='open') then return; end if;
 return query
 with cart_products as(
  select distinct v.product_id from public.cart_items ci join public.product_variants v on v.id=ci.variant_id and v.tenant_id=p_tenant where ci.tenant_id=p_tenant and ci.cart_id=p_cart and ci.state='cart'
 ),pairs as(
  select oi2.product_id,count(*)::integer score
  from public.order_items oi join cart_products cp on cp.product_id=oi.product_id
  join public.orders o on o.id=oi.order_id and o.tenant_id=p_tenant and o.payment_status in('paid','partially_refunded')
  join public.order_items oi2 on oi2.order_id=oi.order_id and oi2.tenant_id=p_tenant and oi2.product_id is not null
  where oi.tenant_id=p_tenant and not exists(select 1 from cart_products x where x.product_id=oi2.product_id)
  group by oi2.product_id
 )
 select p.id,p.slug,p.name,coalesce(p.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=p.id order by pm.sort_order,pm.created_at limit 1),''),
 coalesce((select min(v.price) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id),0),
 coalesce((select min(v.currency) from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id),'IRR'),
 coalesce((select sum(v.inventory_quantity)::bigint from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id),0),'مکمل سبد خرید'::text
 from pairs x join public.products p on p.id=x.product_id and p.tenant_id=p_tenant and p.status='active'
 where public.has_entitlement(p_tenant,'commerce.core') order by x.score desc,p.created_at desc limit greatest(1,least(p_limit,12));
end$$;
revoke all on function public.public_cart_recommendations(uuid,uuid,integer) from public,anon;
grant execute on function public.public_cart_recommendations(uuid,uuid,integer) to authenticated;

create or replace function public.public_cart_revenue_recommendations(p_tenant uuid,p_products jsonb,p_limit integer default 4)
returns table(product_id uuid,variant_id uuid,slug text,name text,cover_url text,price numeric,currency text,stock bigint,reason text)
language plpgsql stable security definer set search_path=public as $$
declare ids uuid[];begin
 if not public.has_entitlement(p_tenant,'commerce.core') then return;end if;
 if jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products)=0 or jsonb_array_length(p_products)>25 then return;end if;
 begin
  select array_agg(distinct (x#>>'{}')::uuid) into ids from jsonb_array_elements(p_products)x;
 exception when others then return;
 end;
 if ids is null or not exists(select 1 from public.products p where p.tenant_id=p_tenant and p.id=any(ids) and p.status='active') then return;end if;
 return query
 with sources as(select p.id,p.category_id from public.products p where p.tenant_id=p_tenant and p.id=any(ids) and p.status='active'),
 manual as(
  select r.target_product_id pid,300000+r.priority score,case when r.kind='upsell' then 'ارتقای پیشنهادی' else 'مکمل پیشنهادی' end reason
  from public.product_recommendation_rules r join sources s on s.id=r.source_product_id
  where r.tenant_id=p_tenant and r.active and r.kind='cross_sell' and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now()) and not(r.target_product_id=any(ids))
 ),
 bought as(
  select oi2.product_id pid,200000+count(*)::integer score,'مشتری‌ها معمولاً همراه این سبد می‌خرند'::text reason
  from public.order_items oi join sources s on s.id=oi.product_id join public.orders o on o.id=oi.order_id and o.tenant_id=p_tenant and o.payment_status in('paid','partially_refunded')
  join public.order_items oi2 on oi2.order_id=oi.order_id and oi2.tenant_id=p_tenant and oi2.product_id is not null
  where oi.tenant_id=p_tenant and not(oi2.product_id=any(ids)) group by oi2.product_id
 ),
 related as(
  select p.id pid,100000 score,'پیشنهاد مرتبط با خریدت'::text reason from public.products p
  where p.tenant_id=p_tenant and p.status='active' and not(p.id=any(ids)) and exists(select 1 from sources s where s.category_id is not distinct from p.category_id)
 ),candidates as(select * from manual union all select * from bought union all select * from related),
 ranked as(select pid,max(score) score,(array_agg(reason order by score desc))[1] reason from candidates group by pid),
 chosen as(
  select p.id,p.slug,p.name,p.metadata,r.score,r.reason,
   (select v.id from public.product_variants v where v.tenant_id=p_tenant and v.product_id=p.id and (not v.track_inventory or v.inventory_quantity>0 or v.allow_backorder) order by v.created_at asc limit 1) vid
  from ranked r join public.products p on p.id=r.pid and p.tenant_id=p_tenant and p.status='active'
 )
 select c.id,c.vid,c.slug,c.name,coalesce(c.metadata->>'cover_url',(select ma.public_url from public.product_media pm join public.media_assets ma on ma.id=pm.media_id where pm.product_id=c.id order by pm.sort_order,pm.created_at limit 1),''),
 v.price,v.currency,case when v.track_inventory then v.inventory_quantity else null end,c.reason
 from chosen c join public.product_variants v on v.id=c.vid and v.tenant_id=p_tenant
 order by c.score desc,c.name limit greatest(1,least(p_limit,8));
end$$;
revoke all on function public.public_cart_revenue_recommendations(uuid,jsonb,integer) from public;
grant execute on function public.public_cart_revenue_recommendations(uuid,jsonb,integer) to anon,authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations.cart','پیشنهاد هوشمند داخل سبد','در سبد خرید، RAVA حداکثر چند محصول مکمل و موجود را بر اساس قوانین دستی، خریدهای واقعی قبلی و ارتباط دسته‌ها پیشنهاد می‌دهد. این بخش برای مهمان و مشتری واردشده کار می‌کند و هدفش افزایش مبلغ سفارش بدون شلوغ‌کردن Checkout است.','پیشنهاد باید محدود، مرتبط و قابل رد کردن باشد. هیچ محصول ناموجود یا متعلق به فروشگاه دیگر نباید وارد پیشنهاد شود.','Smart cart recommendations','RAVA shows a small set of available complementary products in the cart using manual rules, prior paid-order patterns and category relationships. It works for guests and signed-in customers.','Keep recommendations limited, relevant and dismissible. Never expose unavailable products or products from another tenant.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;
