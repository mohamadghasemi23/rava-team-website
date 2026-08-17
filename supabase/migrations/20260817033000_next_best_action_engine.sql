-- RAVA Next Best Action Engine
-- Decides what should happen next for a signed-in customer: continue cart, show an eligible promotion,
-- recommend a product, or deliberately do nothing. Decision and execution remain separate.

create table if not exists public.next_best_action_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enabled boolean not null default true,
 min_score numeric not null default 40 check(min_score between 0 and 1000),
 decision_cooldown_minutes integer not null default 30 check(decision_cooldown_minutes between 1 and 10080),
 max_marketing_actions_7d integer not null default 3 check(max_marketing_actions_7d between 0 and 50),
 cart_weight numeric not null default 95 check(cart_weight between 0 and 1000),
 promotion_weight numeric not null default 70 check(promotion_weight between 0 and 1000),
 recommendation_weight numeric not null default 55 check(recommendation_weight between 0 and 1000),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.next_best_action_decisions(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 customer_id uuid references public.customer_profiles(id) on delete set null,
 action_type text not null check(action_type in('none','continue_cart','promotion','recommend_product')),
 entity_type text,
 entity_id uuid,
 score numeric not null default 0,
 reason text not null,
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'proposed' check(status in('proposed','shown','acted','dismissed','converted','suppressed','expired')),
 source text not null default 'realtime',
 decided_at timestamptz not null default now(),
 shown_at timestamptz,
 acted_at timestamptz,
 converted_at timestamptz,
 revenue numeric(18,4) not null default 0 check(revenue>=0),
 updated_at timestamptz not null default now()
);
create index if not exists nba_decisions_customer_recent_idx on public.next_best_action_decisions(tenant_id,user_id,decided_at desc);
create index if not exists nba_decisions_tenant_action_idx on public.next_best_action_decisions(tenant_id,action_type,status,decided_at desc);

alter table public.next_best_action_settings enable row level security;
alter table public.next_best_action_decisions enable row level security;
create policy nba_settings_admin on public.next_best_action_settings for all to authenticated
 using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null))
 with check(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null));
create policy nba_decisions_admin_read on public.next_best_action_decisions for select to authenticated
 using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(null));

create or replace function public.next_best_action_settings_for(p_tenant uuid)
returns public.next_best_action_settings language plpgsql stable security definer set search_path=public as $$
declare s public.next_best_action_settings;begin
 select * into s from public.next_best_action_settings where tenant_id=p_tenant;
 if not found then
  s.tenant_id:=p_tenant;s.enabled:=true;s.min_score:=40;s.decision_cooldown_minutes:=30;s.max_marketing_actions_7d:=3;
  s.cart_weight:=95;s.promotion_weight:=70;s.recommendation_weight:=55;
 end if;return s;
end$$;
revoke all on function public.next_best_action_settings_for(uuid) from public;
grant execute on function public.next_best_action_settings_for(uuid) to authenticated,service_role;

create or replace function public.customer_next_best_action(p_tenant uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 u uuid:=auth.uid();cp public.customer_profiles;cfg public.next_best_action_settings;
 recent public.next_best_action_decisions;cart_row public.carts;promo public.promotions;rec record;source_product uuid;
 best_type text:='none';best_entity_type text;best_entity uuid;best_score numeric:=0;best_reason text:='فعلاً اقدام مفیدی لازم نیست';best_payload jsonb:='{}'::jsonb;
 marketing_allowed boolean:=false;marketing_count integer:=0;decision_id uuid;
begin
 if u is null then raise exception 'authentication_required';end if;
 select * into cp from public.customer_profiles where tenant_id=p_tenant and user_id=u;
 if not found then raise exception 'customer_profile_required';end if;
 if not public.has_entitlement(p_tenant,'commerce.core') then raise exception 'commerce_core_required';end if;
 cfg:=public.next_best_action_settings_for(p_tenant);
 if not cfg.enabled then return jsonb_build_object('action','none','reason','موتور اقدام بعدی برای این فروشگاه غیرفعال است');end if;

 -- Do not nag: keep a recent live decision stable for the configured cooldown.
 select * into recent from public.next_best_action_decisions
 where tenant_id=p_tenant and user_id=u and decided_at>now()-make_interval(mins=>cfg.decision_cooldown_minutes)
   and status in('proposed','shown') order by decided_at desc limit 1;
 if found then return jsonb_build_object('decision_id',recent.id,'action',recent.action_type,'score',recent.score,'reason',recent.reason,'payload',recent.payload,'reused',true);end if;

 select coalesce(marketing_email,false) or coalesce(marketing_sms,false) or coalesce(marketing_whatsapp,false) or coalesce(marketing_push,false)
 into marketing_allowed from public.customer_notification_preferences where tenant_id=p_tenant and user_id=u;
 marketing_allowed:=coalesce(marketing_allowed,false);
 select count(*) into marketing_count from public.next_best_action_decisions
 where tenant_id=p_tenant and user_id=u and action_type in('promotion','continue_cart') and status in('shown','acted','converted') and decided_at>=now()-interval '7 days';

 -- Candidate 1: abandoned cart. NBA identifies it; Cart Recovery Pro remains the only outbound sender.
 select * into cart_row from public.carts c where c.tenant_id=p_tenant and c.user_id=u and c.status='open' and c.abandoned_at is not null
   and exists(select 1 from public.cart_items ci where ci.tenant_id=p_tenant and ci.cart_id=c.id and ci.state='cart')
 order by c.abandoned_at desc limit 1;
 if found and marketing_allowed and marketing_count<cfg.max_marketing_actions_7d
    and public.has_entitlement(p_tenant,'cart_recovery.pro') and public.has_entitlement(p_tenant,'notifications.pro')
    and exists(select 1 from public.cart_recovery_settings crs where crs.tenant_id=p_tenant and crs.enabled) then
  best_type:='continue_cart';best_entity_type:='cart';best_entity:=cart_row.id;best_score:=cfg.cart_weight;
  best_reason:='سبد خرید نیمه‌کاره شما هنوز قابل ادامه است';
  best_payload:=jsonb_build_object('path','/cart','cart_id',cart_row.id,'outbound_execution','cart_recovery_pro');
 end if;

 -- Candidate 2: only a currently-valid AUTOMATIC general promotion. Never invent a discount or bypass checkout validation.
 select p.* into promo from public.promotions p
 where p.tenant_id=p_tenant and p.status='active' and p.automatic=true
   and (p.starts_at is null or p.starts_at<=now()) and (p.ends_at is null or p.ends_at>now())
   and coalesce(p.customer_eligibility,'{}'::jsonb)='{}'::jsonb
   and (p.usage_limit is null or (select count(*) from public.promotion_redemptions r where r.tenant_id=p_tenant and r.promotion_id=p.id)<p.usage_limit)
 order by p.priority asc,p.created_at desc limit 1;
 if found and marketing_count<cfg.max_marketing_actions_7d and cfg.promotion_weight>best_score then
  best_type:='promotion';best_entity_type:='promotion';best_entity:=promo.id;best_score:=cfg.promotion_weight;
  best_reason:='یک پیشنهاد فعال برای خرید شما وجود دارد';
  best_payload:=jsonb_build_object('name',promo.name,'kind',promo.kind,'value',promo.value,'currency',promo.currency,'automatic',true);
 end if;

 -- Candidate 3: choose the strongest recent product signal, then ask the existing privacy-safe recommender for the next item.
 select z.product_id into source_product from(
  select e.product_id,
   sum((case e.event_type when 'add_to_cart' then 4 when 'variant_interest' then 2.5 when 'image_engagement' then 1.5 else 1 end)*e.strength*greatest(.15,1-(extract(epoch from(now()-e.created_at))/86400.0/60.0)))::numeric signal,
   max(e.created_at) last_at
  from public.customer_product_intent_events e where e.tenant_id=p_tenant and e.user_id=u and e.created_at>=now()-interval '120 days' group by e.product_id
  union all
  select v.product_id,least(v.view_count,10)::numeric*.75 signal,v.last_viewed_at last_at
  from public.customer_product_views v where v.tenant_id=p_tenant and v.user_id=u and v.last_viewed_at>=now()-interval '120 days'
 )z group by z.product_id order by sum(z.signal) desc,max(z.last_at) desc limit 1;
 if source_product is not null then
  select r.* into rec from public.personalized_product_recommendation_candidates(p_tenant,array[source_product],'cross_sell',1) r;
  if found and cfg.recommendation_weight>best_score then
   best_type:='recommend_product';best_entity_type:='product';best_entity:=rec.product_id;best_score:=cfg.recommendation_weight;
   best_reason:=coalesce(rec.reason,'پیشنهاد متناسب با علاقه اخیر شما');
   select jsonb_build_object('product_id',p.id,'slug',p.slug,'name',p.name) into best_payload from public.products p where p.tenant_id=p_tenant and p.id=rec.product_id and p.status='active';
   if best_payload is null then best_type:='none';best_entity_type:=null;best_entity:=null;best_score:=0;best_reason:='فعلاً اقدام مفیدی لازم نیست';best_payload:='{}'::jsonb;end if;
  end if;
 end if;

 if best_score<cfg.min_score then best_type:='none';best_entity_type:=null;best_entity:=null;best_reason:='برای جلوگیری از مزاحمت، فعلاً اقدامی پیشنهاد نمی‌شود';best_payload:='{}'::jsonb;end if;
 insert into public.next_best_action_decisions(tenant_id,user_id,customer_id,action_type,entity_type,entity_id,score,reason,payload,status)
 values(p_tenant,u,cp.id,best_type,best_entity_type,best_entity,best_score,best_reason,best_payload,case when best_type='none' then 'suppressed' else 'proposed' end)
 returning id into decision_id;
 return jsonb_build_object('decision_id',decision_id,'action',best_type,'score',best_score,'reason',best_reason,'payload',best_payload,'reused',false);
end$$;
revoke all on function public.customer_next_best_action(uuid) from public,anon;
grant execute on function public.customer_next_best_action(uuid) to authenticated;

create or replace function public.customer_next_best_action_feedback(p_tenant uuid,p_decision uuid,p_event text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 if p_event not in('shown','acted','dismissed') then raise exception 'invalid_event';end if;
 if not exists(select 1 from public.next_best_action_decisions where id=p_decision and tenant_id=p_tenant and user_id=auth.uid()) then raise exception 'decision_not_found';end if;
 update public.next_best_action_decisions set
  status=case p_event when 'shown' then case when status='proposed' then 'shown' else status end when 'acted' then case when status in('proposed','shown') then 'acted' else status end when 'dismissed' then case when status in('proposed','shown') then 'dismissed' else status end end,
  shown_at=case when p_event='shown' then coalesce(shown_at,now()) else shown_at end,
  acted_at=case when p_event='acted' then coalesce(acted_at,now()) else acted_at end,updated_at=now()
 where id=p_decision and tenant_id=p_tenant and user_id=auth.uid();
end$$;
revoke all on function public.customer_next_best_action_feedback(uuid,uuid,text) from public,anon;
grant execute on function public.customer_next_best_action_feedback(uuid,uuid,text) to authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.next_best_action','اقدام بعدی هوشمند','RAVA برای هر مشتری واردشده بررسی می‌کند که در همان لحظه ادامه سبد، یک تخفیف واقعی و فعال، پیشنهاد محصول شخصی یا هیچ اقدامی بهترین انتخاب است. «هیچ کاری نکن» عمداً یک تصمیم معتبر است تا مشتری بیش از حد تحت فشار قرار نگیرد.','تصمیم موتور مجوز ارسال پیام نیست. هر پیام بیرونی باید جداگانه Entitlement، رضایت بازاریابی، تنظیم کانال، Cooldown و قوانین همان سرویس را بررسی کند. تخفیف نیز فقط از Promotion واقعی و فعال انتخاب می‌شود و Checkout مرجع نهایی اعتبار آن است.','Next Best Action','RAVA evaluates whether the best next step for a signed-in customer is to continue an abandoned cart, surface a real active promotion, show a personalized product recommendation, or deliberately do nothing. “Do nothing” is a first-class decision to prevent over-messaging.','A decision is not permission to send outbound messages. Outbound execution must independently enforce entitlements, marketing consent, channel settings, cooldowns and service rules. Promotions are selected only from real active records and checkout remains authoritative.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;