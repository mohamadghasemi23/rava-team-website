-- Scope recovery scans by tenant when requested, while preserving a service-wide scheduler mode.
drop function if exists public.prepare_abandoned_cart_recoveries(integer);
create or replace function public.prepare_abandoned_cart_recoveries(p_limit integer default 100,p_tenant uuid default null) returns integer language plpgsql security definer set search_path=public as $$
declare c record;cfg public.cart_recovery_settings;ns public.notification_settings;pref public.customer_notification_preferences;profile public.customer_profiles;attempts int;token_raw text;token_hash_v text;attempt_id uuid;ch text;recipient text;chosen text[];n int:=0;idem text;
begin
 if current_user not in('postgres','service_role') then raise exception 'trusted_server_only';end if;
 for c in select * from public.carts where status='open' and user_id is not null and (p_tenant is null or tenant_id=p_tenant) order by last_activity_at asc limit greatest(1,least(p_limit,500)) loop
  if not public.has_entitlement(c.tenant_id,'commerce.core') or not public.has_entitlement(c.tenant_id,'notifications.pro') or not public.has_entitlement(c.tenant_id,'cart_recovery.pro') then continue;end if;
  select * into cfg from public.cart_recovery_settings where tenant_id=c.tenant_id;if not found or not cfg.enabled or c.last_activity_at>now()-make_interval(hours=>cfg.delay_hours) then continue;end if;
  if c.abandoned_at is null then update public.carts set abandoned_at=now(),updated_at=now() where id=c.id;end if;
  select count(*) into attempts from public.cart_recovery_attempts where tenant_id=c.tenant_id and cart_id=c.id;
  if attempts>=cfg.max_reminders then continue;end if;
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
 update public.cart_recovery_attempts set status='expired',updated_at=now() where status in('queued','opened') and expires_at<now() and (p_tenant is null or tenant_id=p_tenant);
 return n;
end$$;
revoke all on function public.prepare_abandoned_cart_recoveries(integer,uuid) from public,anon,authenticated;grant execute on function public.prepare_abandoned_cart_recoveries(integer,uuid) to service_role;

-- When a customer resumes an abandoned cart through normal shopping activity, cancel pending recovery work.
create or replace function public.cancel_pending_cart_recovery_on_resume() returns trigger language plpgsql security definer set search_path=public as $$begin
 if old.status='open' and new.status='open' and old.abandoned_at is not null and new.abandoned_at is null then
  update public.cart_recovery_attempts set status='cancelled',updated_at=now() where tenant_id=new.tenant_id and cart_id=new.id and status='queued';
  update public.notification_outbox set status='cancelled',updated_at=now() where tenant_id=new.tenant_id and event_key='cart.abandoned' and entity_type='cart' and entity_id=new.id and status='queued';
 end if;return new;end$$;
drop trigger if exists trg_cancel_cart_recovery_on_resume on public.carts;create trigger trg_cancel_cart_recovery_on_resume after update of abandoned_at,status on public.carts for each row execute function public.cancel_pending_cart_recovery_on_resume();
