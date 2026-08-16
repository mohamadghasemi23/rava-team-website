-- RAVA Abandoned Cart Recovery: contractual, consent-aware, idempotent and measurable.
insert into public.feature_catalog(key,label_fa,label_en,category,commercial,description_fa,description_en) values
('cart_recovery.pro','بازیابی سبد رهاشده','Cart Recovery Pro','commerce',true,'تشخیص سبد رهاشده، پیام بازیابی با رضایت مشتری، لینک امن و اندازه‌گیری تبدیل','Abandoned-cart detection, consent-aware recovery messaging, secure recovery links and conversion attribution')
on conflict(key) do update set label_fa=excluded.label_fa,label_en=excluded.label_en,category=excluded.category,commercial=excluded.commercial,description_fa=excluded.description_fa,description_en=excluded.description_en;

create table if not exists public.cart_recovery_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enabled boolean not null default false,
 delay_hours integer not null default 24 check(delay_hours between 1 and 720),
 max_reminders integer not null default 1 check(max_reminders between 1 and 5),
 reminder_cooldown_hours integer not null default 48 check(reminder_cooldown_hours between 1 and 720),
 token_ttl_hours integer not null default 168 check(token_ttl_hours between 1 and 720),
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.cart_recovery_attempts(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 cart_id uuid not null references public.carts(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 reminder_no integer not null check(reminder_no between 1 and 5),token_hash text not null,expires_at timestamptz not null,
 status text not null default 'queued' check(status in('queued','opened','recovered','expired','cancelled')),
 channels text[] not null default '{}',queued_at timestamptz not null default now(),opened_at timestamptz,recovered_at timestamptz,order_id uuid references public.orders(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(tenant_id,cart_id,reminder_no),unique(token_hash)
);
create index if not exists cart_recovery_attempts_tenant_idx on public.cart_recovery_attempts(tenant_id,created_at desc);
create index if not exists cart_recovery_attempts_cart_idx on public.cart_recovery_attempts(cart_id,status);
alter table public.cart_recovery_settings enable row level security;alter table public.cart_recovery_attempts enable row level security;
create policy cart_recovery_settings_admin on public.cart_recovery_settings for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy cart_recovery_attempts_admin_read on public.cart_recovery_attempts for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.prepare_abandoned_cart_recoveries(p_limit integer default 100) returns integer language plpgsql security definer set search_path=public as $$
declare c record;cfg public.cart_recovery_settings;ns public.notification_settings;pref public.customer_notification_preferences;profile public.customer_profiles;attempts int;token_raw text;token_hash_v text;attempt_id uuid;ch text;recipient text;chosen text[];n int:=0;idem text;
begin
 if current_user not in('postgres','service_role') then raise exception 'trusted_server_only';end if;
 for c in select * from public.carts where status='open' and user_id is not null and abandoned_at is not null order by abandoned_at asc limit greatest(1,least(p_limit,500)) loop
  if not public.has_entitlement(c.tenant_id,'commerce.core') or not public.has_entitlement(c.tenant_id,'notifications.pro') or not public.has_entitlement(c.tenant_id,'cart_recovery.pro') then continue;end if;
  select * into cfg from public.cart_recovery_settings where tenant_id=c.tenant_id;if not found or not cfg.enabled or c.abandoned_at>now()-make_interval(hours=>cfg.delay_hours) then continue;end if;
  select count(*) into attempts from public.cart_recovery_attempts where tenant_id=c.tenant_id and cart_id=c.id;if attempts>=cfg.max_reminders then continue;end if;
  if exists(select 1 from public.cart_recovery_attempts where tenant_id=c.tenant_id and cart_id=c.id and queued_at>now()-make_interval(hours=>cfg.reminder_cooldown_hours)) then continue;end if;
  if not exists(select 1 from public.cart_items where cart_id=c.id and tenant_id=c.tenant_id and state='cart') then continue;end if;
  select * into ns from public.notification_settings where tenant_id=c.tenant_id;if not found or not ns.enabled or not coalesce((ns.event_rules->>'cart.abandoned')::boolean,true) then continue;end if;
  select * into pref from public.customer_notification_preferences where tenant_id=c.tenant_id and user_id=c.user_id;if not found then continue;end if;
  select * into profile from public.customer_profiles where tenant_id=c.tenant_id and user_id=c.user_id;if not found then continue;end if;
  chosen:=array[]::text[];
  foreach ch in array array['email','sms','whatsapp','push'] loop
   if coalesce((ns.channels->>ch)::boolean,false) and coalesce((to_jsonb(pref)->>('marketing_'||ch))::boolean,false) then
    recipient:=case when ch='email' then nullif(profile.email,'') when ch in('sms','whatsapp') then nullif(profile.phone,'') else null end;
    if recipient is not null then chosen:=array_append(chosen,ch);end if;
   end if;
  end loop;
  if cardinality(chosen)=0 then continue;end if;
  token_raw:=encode(gen_random_bytes(32),'hex');token_hash_v:=encode(digest(token_raw,'sha256'),'hex');
  insert into public.cart_recovery_attempts(tenant_id,cart_id,user_id,reminder_no,token_hash,expires_at,channels) values(c.tenant_id,c.id,c.user_id,attempts+1,token_hash_v,now()+make_interval(hours=>cfg.token_ttl_hours),chosen) returning id into attempt_id;
  foreach ch in array chosen loop
   recipient:=case when ch='email' then nullif(profile.email,'') when ch in('sms','whatsapp') then nullif(profile.phone,'') else null end;
   idem:=encode(digest(c.tenant_id::text||':cart.abandoned:'||attempt_id::text||':'||ch,'sha256'),'hex');
   insert into public.notification_outbox(tenant_id,event_key,entity_type,entity_id,customer_id,channel,recipient,locale,payload,idempotency_key)
   values(c.tenant_id,'cart.abandoned','cart',c.id,profile.id,ch,recipient,coalesce(profile.locale,ns.default_locale,'fa'),jsonb_build_object('cart_id',c.id,'recovery_token',token_raw,'recovery_path','/cart/recover?token='||token_raw,'reminder_no',attempts+1),idem)
   on conflict(tenant_id,idempotency_key) do nothing;
  end loop;n:=n+1;
 end loop;
 update public.cart_recovery_attempts set status='expired',updated_at=now() where status in('queued','opened') and expires_at<now();
 return n;
end$$;
revoke all on function public.prepare_abandoned_cart_recoveries(integer) from public,anon,authenticated;grant execute on function public.prepare_abandoned_cart_recoveries(integer) to service_role;

create or replace function public.recover_customer_cart(p_tenant uuid,p_token text) returns jsonb language plpgsql security definer set search_path=public as $$declare a public.cart_recovery_attempts;c public.carts;h text;begin
 if auth.uid() is null then raise exception 'authentication_required';end if;if p_token is null or length(p_token)<>64 or p_token!~'^[0-9a-f]+$' then raise exception 'invalid_recovery_token';end if;h:=encode(digest(p_token,'sha256'),'hex');
 select * into a from public.cart_recovery_attempts where tenant_id=p_tenant and token_hash=h for update;if not found or a.user_id<>auth.uid() then raise exception 'invalid_recovery_token';end if;if a.expires_at<now() or a.status in('expired','cancelled','recovered') then raise exception 'recovery_link_expired';end if;
 select * into c from public.carts where id=a.cart_id and tenant_id=p_tenant and user_id=auth.uid() for update;if not found or c.status<>'open' then raise exception 'cart_not_recoverable';end if;
 update public.carts set abandoned_at=null,last_activity_at=now(),updated_at=now() where id=c.id;update public.cart_recovery_attempts set status='opened',opened_at=coalesce(opened_at,now()),updated_at=now() where id=a.id;return public.customer_cart_snapshot(p_tenant);
end$$;
revoke all on function public.recover_customer_cart(uuid,text) from public,anon;grant execute on function public.recover_customer_cart(uuid,text) to authenticated;

create or replace function public.complete_customer_cart(p_tenant uuid) returns uuid language plpgsql security definer set search_path=public as $$declare c uuid;begin
 if auth.uid() is null then return null;end if;select id into c from public.carts where tenant_id=p_tenant and user_id=auth.uid() and status='open' order by updated_at desc limit 1 for update;if c is null then return null;end if;
 update public.carts set status='converted',updated_at=now(),last_activity_at=now(),abandoned_at=null where id=c;
 update public.cart_recovery_attempts set status='recovered',recovered_at=now(),updated_at=now() where tenant_id=p_tenant and cart_id=c and status='opened';
 return c;end$$;
revoke all on function public.complete_customer_cart(uuid) from public,anon;grant execute on function public.complete_customer_cart(uuid) to authenticated;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('commerce.cart.recovery','بازیابی سبد رهاشده','Cart Recovery Pro یک سرویس قراردادی جداست. سبد مشتری پس از مدت تعیین‌شده رهاشده محسوب می‌شود و فقط در صورت رضایت بازاریابی مشتری، کانال فعال و تنظیمات مجاز، پیام بازیابی ساخته می‌شود.','رهاشدن سبد به‌تنهایی مجوز ارسال تبلیغ نیست. Marketing Consent، Notification Pro و Cart Recovery Pro باید هم‌زمان معتبر باشند.','Abandoned cart recovery','Cart Recovery Pro is a separate contractual add-on. After the configured inactivity delay, a signed-in cart may become eligible for recovery messaging only when marketing consent, channel settings and required entitlements all allow it.','Cart abandonment alone is never permission to market. Marketing consent, Notification Pro and Cart Recovery Pro must all be valid.',true),
('commerce.cart.recovery_link','لینک امن بازیابی سبد','هر پیام بازیابی لینک موقت و غیرقابل‌حدس دارد. سرور Hash توکن، تاریخ انقضا، مالک حساب و Tenant را بررسی می‌کند و مشتری باید با همان حساب وارد شده باشد.','توکن منقضی، استفاده‌شده یا متعلق به کاربر دیگر باید بدون نمایش اطلاعات سبد رد شود.','Secure cart recovery link','Each recovery message uses a temporary high-entropy link. The server validates its token hash, expiry, account owner and tenant, and the customer must sign in with the matching account.','Expired, consumed or cross-account tokens must be rejected without exposing cart information.',true),
('commerce.cart.recovery_analytics','آمار بازیابی سبد','سیستم تعداد تلاش‌های بازیابی، بازشدن لینک و تبدیل سبد بازیابی‌شده به خرید را جدا ثبت می‌کند تا نرخ بازیابی قابل اندازه‌گیری باشد.',null,'Cart recovery analytics','The system separately records recovery attempts, link opens and recovered carts that later convert, enabling a measurable recovery rate.',null,true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;
