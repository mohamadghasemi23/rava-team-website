-- Provider registry: lets RAVA add domestic or international payment adapters without changing Commerce core.
create table if not exists public.payment_provider_registry(
 provider_key text primary key,
 display_name text not null,
 status text not null default 'available' check(status in('available','beta','deprecated','disabled')),
 provider_type text not null default 'redirect' check(provider_type in('redirect','hosted_checkout','api','wallet','bank_transfer')),
 supported_currencies text[] not null default '{}'::text[],
 supported_countries text[] not null default '{}'::text[],
 capabilities jsonb not null default '{}'::jsonb,
 public_config_schema jsonb not null default '{}'::jsonb,
 secret_schema jsonb not null default '{}'::jsonb,
 webhook_required boolean not null default false,
 webhook_signature_required boolean not null default true,
 test_mode_supported boolean not null default true,
 docs_fa text not null default '',
 docs_en text not null default '',
 sort_order int not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.payment_gateway_configs add column if not exists settlement_currency text;
alter table public.payment_gateway_configs add column if not exists country_code text;
alter table public.payment_gateway_configs add column if not exists webhook_enabled boolean not null default false;
alter table public.payment_gateway_configs add column if not exists last_connection_test_at timestamptz;
alter table public.payment_gateway_configs add column if not exists last_connection_test_status text check(last_connection_test_status is null or last_connection_test_status in('ok','failed'));
alter table public.payment_gateway_configs add column if not exists last_connection_test_message text;

alter table public.payment_provider_registry enable row level security;
create policy payment_provider_registry_authenticated_read on public.payment_provider_registry for select to authenticated using(true);
-- Registry mutations are platform-owner/service operations only; no authenticated write policy is created.

insert into public.payment_provider_registry(provider_key,display_name,status,provider_type,supported_currencies,supported_countries,capabilities,public_config_schema,secret_schema,webhook_required,webhook_signature_required,test_mode_supported,docs_fa,docs_en,sort_order)
values(
 'mock','RAVA Mock Gateway','beta','redirect',array['IRR','USD','EUR','GBP'],array['*'],jsonb_build_object('refund',false,'partial_refund',false,'webhook',false,'multi_currency',true),jsonb_build_object(),jsonb_build_object(),false,false,true,'فقط برای تست مسیر پرداخت RAVA؛ در محیط واقعی باید خاموش باشد.','RAVA test-only gateway. Keep disabled in production.',999
)
on conflict(provider_key) do update set display_name=excluded.display_name,status=excluded.status,provider_type=excluded.provider_type,supported_currencies=excluded.supported_currencies,supported_countries=excluded.supported_countries,capabilities=excluded.capabilities,public_config_schema=excluded.public_config_schema,secret_schema=excluded.secret_schema,webhook_required=excluded.webhook_required,webhook_signature_required=excluded.webhook_signature_required,test_mode_supported=excluded.test_mode_supported,docs_fa=excluded.docs_fa,docs_en=excluded.docs_en,sort_order=excluded.sort_order,updated_at=now();
