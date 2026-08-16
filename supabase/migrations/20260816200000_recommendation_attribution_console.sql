-- RAVA Recommendation Attribution + Admin Console
create index if not exists recommendation_events_funnel_idx on public.recommendation_events(tenant_id,placement,event_type,created_at desc);
create unique index if not exists recommendation_impression_dedupe_idx on public.recommendation_events(tenant_id,session_key,recommended_product_id,placement,event_type) where event_type='impression' and session_key is not null;

create or replace function public.track_recommendation_event(p_tenant uuid,p_source uuid,p_recommended uuid,p_placement text,p_kind text,p_event text,p_session text default null)
returns void language plpgsql security definer set search_path=public as $$begin
 if p_placement not in('product','cart') or p_kind not in('cross_sell','upsell') or p_event not in('impression','click','add_to_cart') then raise exception 'invalid_event';end if;
 if p_session is not null and (length(p_session)<8 or length(p_session)>128) then raise exception 'invalid_session';end if;
 if not exists(select 1 from public.tenants where id=p_tenant and status in('active','trial')) then raise exception 'tenant_unavailable';end if;
 if not exists(select 1 from public.products where id=p_recommended and tenant_id=p_tenant and status='active') then raise exception 'invalid_recommendation';end if;
 if p_source is not null and not exists(select 1 from public.products where id=p_source and tenant_id=p_tenant and status='active') then p_source:=null;end if;
 begin
  insert into public.recommendation_events(tenant_id,source_product_id,recommended_product_id,placement,kind,event_type,session_key)
  values(p_tenant,p_source,p_recommended,p_placement,p_kind,p_event,nullif(p_session,''));
 exception when unique_violation then null;end;
end$$;
revoke all on function public.track_recommendation_event(uuid,uuid,uuid,text,text,text,text) from public;
grant execute on function public.track_recommendation_event(uuid,uuid,uuid,text,text,text,text) to anon,authenticated;

create or replace function public.attribute_recommendation_purchase(p_tenant uuid,p_order uuid)
returns integer language plpgsql security definer set search_path=public as $$declare n int:=0;r record;begin
 if not exists(select 1 from public.orders where id=p_order and tenant_id=p_tenant and payment_status in('paid','partially_refunded')) then return 0;end if;
 for r in
  select distinct on(e.recommended_product_id) e.recommended_product_id,e.source_product_id,e.placement,e.kind,e.session_key,oi.line_total
  from public.recommendation_events e join public.order_items oi on oi.order_id=p_order and oi.tenant_id=p_tenant and oi.product_id=e.recommended_product_id
  where e.tenant_id=p_tenant and e.event_type='add_to_cart' and e.created_at>=now()-interval '30 days'
  order by e.recommended_product_id,e.created_at desc
 loop
  if not exists(select 1 from public.recommendation_events x where x.tenant_id=p_tenant and x.order_id=p_order and x.recommended_product_id=r.recommended_product_id and x.event_type='purchase') then
   insert into public.recommendation_events(tenant_id,source_product_id,recommended_product_id,placement,kind,event_type,session_key,order_id,revenue)
   values(p_tenant,r.source_product_id,r.recommended_product_id,r.placement,r.kind,'purchase',r.session_key,p_order,greatest(0,coalesce(r.line_total,0)));n:=n+1;
  end if;
 end loop;return n;
end$$;
revoke all on function public.attribute_recommendation_purchase(uuid,uuid) from public,anon,authenticated;grant execute on function public.attribute_recommendation_purchase(uuid,uuid) to service_role;

create or replace function public.trg_attribute_recommendation_purchase() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.payment_status in('paid','partially_refunded') and old.payment_status is distinct from new.payment_status then perform public.attribute_recommendation_purchase(new.tenant_id,new.id);end if;return new;end$$;
drop trigger if exists orders_recommendation_attribution on public.orders;
create trigger orders_recommendation_attribution after update of payment_status on public.orders for each row execute function public.trg_attribute_recommendation_purchase();

create or replace view public.recommendation_performance_summary with(security_invoker=true) as
select e.tenant_id,e.recommended_product_id,p.name,p.slug,e.placement,e.kind,
 count(*) filter(where e.event_type='impression')::bigint impressions,
 count(*) filter(where e.event_type='click')::bigint clicks,
 count(*) filter(where e.event_type='add_to_cart')::bigint add_to_carts,
 count(*) filter(where e.event_type='purchase')::bigint purchases,
 coalesce(sum(e.revenue) filter(where e.event_type='purchase'),0)::numeric(18,2) attributed_revenue,
 case when count(*) filter(where e.event_type='impression')>0 then round(100.0*count(*) filter(where e.event_type='add_to_cart')/count(*) filter(where e.event_type='impression'),2) else 0 end add_rate
from public.recommendation_events e left join public.products p on p.id=e.recommended_product_id and p.tenant_id=e.tenant_id
group by e.tenant_id,e.recommended_product_id,p.name,p.slug,e.placement,e.kind;
revoke all on public.recommendation_performance_summary from anon;grant select on public.recommendation_performance_summary to authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.recommendations.console','مدیریت فروش مکمل','در این بخش می‌توان برای هر محصول، مکمل یا ارتقای دستی تعریف کرد و سپس نمایش، کلیک، افزودن به سبد و خرید منتسب‌شده را اندازه گرفت. اولویت بالاتر زودتر نمایش داده می‌شود.','رابطه‌های دستی باید واقعاً مرتبط باشند؛ پیشنهاد زیاد یا نامرتبط نرخ تبدیل را پایین می‌آورد.','Recommendation merchandising','Define manual cross-sell and upsell relationships, then measure impressions, clicks, add-to-cart events and attributed purchases. Higher priority rules rank first.','Keep manual recommendations relevant and restrained; excessive or unrelated suggestions reduce conversion.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;