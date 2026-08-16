-- RAVA Notification Engine: contractual, provider-agnostic, tenant-isolated.
create table if not exists public.notification_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enabled boolean not null default false,
 channels jsonb not null default '{"email":true,"sms":false,"whatsapp":false,"push":false}'::jsonb,
 event_rules jsonb not null default '{"order.created":true,"order.status.changed":true,"payment.status.changed":true,"shipment.status.changed":true,"return.status.changed":true,"refund.status.changed":true}'::jsonb,
 default_locale text not null default 'fa',
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.notification_provider_configs(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 channel text not null check(channel in('email','sms','whatsapp','push')),provider_key text not null,enabled boolean not null default false,
 public_config jsonb not null default '{}'::jsonb,secret_ref text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(tenant_id,channel,provider_key)
);
create table if not exists public.notification_templates(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 event_key text not null,channel text not null check(channel in('email','sms','whatsapp','push')),locale text not null default 'fa',enabled boolean not null default true,
 subject text,body text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(tenant_id,event_key,channel,locale)
);
create table if not exists public.notification_outbox(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 event_key text not null,entity_type text not null default 'order',entity_id uuid,order_id uuid references public.orders(id) on delete cascade,
 customer_id uuid references public.customer_profiles(id) on delete set null,channel text not null check(channel in('email','sms','whatsapp','push')),
 recipient text not null,locale text not null default 'fa',payload jsonb not null default '{}'::jsonb,status text not null default 'queued' check(status in('queued','processing','sent','failed','cancelled')),
 attempts integer not null default 0,max_attempts integer not null default 5,available_at timestamptz not null default now(),last_error text,
 provider_key text,provider_message_id text,idempotency_key text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),sent_at timestamptz,
 unique(tenant_id,idempotency_key)
);
create index if not exists notification_outbox_dispatch_idx on public.notification_outbox(status,available_at,created_at);
create index if not exists notification_outbox_tenant_idx on public.notification_outbox(tenant_id,created_at desc);
create table if not exists public.notification_delivery_attempts(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
 provider_key text,attempt_no integer not null,status text not null,provider_message_id text,error_message text,created_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;alter table public.notification_provider_configs enable row level security;alter table public.notification_templates enable row level security;alter table public.notification_outbox enable row level security;alter table public.notification_delivery_attempts enable row level security;
create policy notification_settings_admin on public.notification_settings for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy notification_provider_configs_admin on public.notification_provider_configs for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy notification_templates_admin on public.notification_templates for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy notification_outbox_admin_read on public.notification_outbox for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy notification_attempts_admin_read on public.notification_delivery_attempts for select to authenticated using(public.can_access_tenant(tenant_id,null));

create or replace function public.enqueue_order_notifications(p_tenant uuid,p_order uuid,p_event text,p_payload jsonb default '{}'::jsonb,p_source_id uuid default null) returns integer language plpgsql security definer set search_path=public as $$
declare o public.orders;s public.notification_settings;ch text;recipient text;loc text;count_rows int:=0;enabled_event boolean;
begin
 if not public.has_entitlement(p_tenant,'notifications.pro') then return 0;end if;
 select * into s from public.notification_settings where tenant_id=p_tenant;if not found or not s.enabled then return 0;end if;
 enabled_event:=coalesce((s.event_rules->>p_event)::boolean,false);if not enabled_event then return 0;end if;
 select * into o from public.orders where id=p_order and tenant_id=p_tenant;if not found then return 0;end if;
 loc:=coalesce((select locale from public.customer_profiles where id=o.account_customer_id and tenant_id=p_tenant),s.default_locale,'fa');
 foreach ch in array array['email','sms','whatsapp','push'] loop
   if coalesce((s.channels->>ch)::boolean,false) then
     recipient:=case when ch='email' then nullif(coalesce((select email from public.customer_profiles where id=o.account_customer_id and tenant_id=p_tenant),o.customer_snapshot->>'email'),'') when ch in('sms','whatsapp') then nullif(coalesce((select phone from public.customer_profiles where id=o.account_customer_id and tenant_id=p_tenant),o.customer_snapshot->>'phone'),'') else null end;
     if recipient is not null then
       insert into public.notification_outbox(tenant_id,event_key,entity_type,entity_id,order_id,customer_id,channel,recipient,locale,payload,idempotency_key)
       values(p_tenant,p_event,'order',coalesce(p_source_id,p_order),p_order,o.account_customer_id,ch,recipient,loc,p_payload,encode(digest(p_tenant::text||':'||p_event||':'||coalesce(p_source_id,p_order)::text||':'||ch,'sha256'),'hex'))
       on conflict(tenant_id,idempotency_key) do nothing;
       if found then count_rows:=count_rows+1;end if;
     end if;
   end if;
 end loop;
 return count_rows;
end$$;
revoke all on function public.enqueue_order_notifications(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;grant execute on function public.enqueue_order_notifications(uuid,uuid,text,jsonb,uuid) to service_role;

create or replace function public.notification_order_status_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin perform public.enqueue_order_notifications(new.tenant_id,new.order_id,'order.status.changed',jsonb_build_object('from_status',new.from_status,'to_status',new.to_status,'from_fulfillment_status',new.from_fulfillment_status,'to_fulfillment_status',new.to_fulfillment_status),new.id);return new;end$$;
drop trigger if exists trg_notification_order_status on public.order_status_history;create trigger trg_notification_order_status after insert on public.order_status_history for each row execute function public.notification_order_status_trigger();

create or replace function public.notification_shipment_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin if tg_op='INSERT' or old.status is distinct from new.status or old.tracking_code is distinct from new.tracking_code then perform public.enqueue_order_notifications(new.tenant_id,new.order_id,'shipment.status.changed',jsonb_build_object('status',new.status,'carrier',new.carrier,'tracking_code',new.tracking_code,'tracking_url',new.tracking_url),new.id);end if;return new;end$$;
drop trigger if exists trg_notification_shipment on public.order_shipments;create trigger trg_notification_shipment after insert or update on public.order_shipments for each row execute function public.notification_shipment_trigger();

create or replace function public.notification_return_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin if tg_op='INSERT' or old.status is distinct from new.status then perform public.enqueue_order_notifications(new.tenant_id,new.order_id,'return.status.changed',jsonb_build_object('status',new.status,'reason',new.reason),new.id);end if;return new;end$$;
drop trigger if exists trg_notification_return on public.order_returns;create trigger trg_notification_return after insert or update on public.order_returns for each row execute function public.notification_return_trigger();

create or replace function public.notification_refund_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin if tg_op='INSERT' or old.status is distinct from new.status then perform public.enqueue_order_notifications(new.tenant_id,new.order_id,'refund.status.changed',jsonb_build_object('status',new.status,'amount',new.amount,'currency',new.currency),new.id);end if;return new;end$$;
drop trigger if exists trg_notification_refund on public.order_refunds;create trigger trg_notification_refund after insert or update on public.order_refunds for each row execute function public.notification_refund_trigger();

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('notifications.overview','اعلان‌های مشتری','Notification Pro یک سرویس قراردادی است. رویدادهای سفارش، پرداخت، ارسال، مرجوعی و Refund ابتدا وارد Outbox امن می‌شوند و سپس از کانال‌های فعال مثل ایمیل، پیامک یا واتساپ ارسال می‌شوند.','فعال‌بودن Commerce به معنی فعال‌بودن Notification Pro نیست. هیچ Secret واقعی Provider نباید در تنظیمات قابل نمایش ذخیره شود.','Customer notifications','Notification Pro is a contractual add-on. Order, payment, shipment, return and refund events enter a secure outbox before being delivered through enabled channels such as email, SMS or WhatsApp.','Commerce access does not automatically enable Notification Pro. Provider secrets must never be stored in user-visible configuration.',true),
('notifications.outbox','صف ارسال اعلان','Outbox ارسال را از منطق سفارش جدا می‌کند. هر پیام شناسه تکرارناپذیر، وضعیت، تعداد تلاش و خطای آخر دارد تا Retry باعث ارسال تکراری نشود.','پیام Failed را بدون بررسی دلیل، بارها دستی ارسال نکن؛ Provider ممکن است پیام را تحویل داده باشد ولی پاسخ شبکه از دست رفته باشد.','Notification outbox','The outbox separates delivery from order logic. Every message has an idempotency key, status, attempt count and last error so retries do not create duplicates.','Do not repeatedly resend a failed message without checking the cause; the provider may have delivered it even if the network response was lost.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;
