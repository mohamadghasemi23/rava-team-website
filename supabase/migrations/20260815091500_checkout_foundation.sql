-- Configurable checkout schema. Never trust browser totals; order creation must recalculate catalog price, discount, shipping and stock on the server.
create table if not exists public.checkout_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 checkout_mode text not null default 'physical' check(checkout_mode in('physical','digital','service','hybrid')),
 require_shipping boolean not null default true,
 allow_guest boolean not null default true,
 terms_required boolean not null default true,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.checkout_fields(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 field_key text not null,field_type text not null check(field_type in('text','email','tel','textarea','select','checkbox')),
 label_fa text not null,label_en text not null default '',placeholder_fa text not null default '',placeholder_en text not null default '',
 required boolean not null default false,enabled boolean not null default true,sort_order int not null default 0,
 max_length int check(max_length between 1 and 2000),options jsonb not null default '[]'::jsonb,
 validation_rule text not null default 'plain' check(validation_rule in('plain','name','email','phone','postal_code','address','national_id','company_id')),
 sensitive boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(tenant_id,field_key)
);
create table if not exists public.checkout_attempts(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 session_hash text not null,ip_hash text,user_agent_hash text,status text not null default 'started' check(status in('started','validated','rejected','order_created','rate_limited')),
 rejection_code text,created_at timestamptz not null default now()
);
create index if not exists checkout_attempts_tenant_time_idx on public.checkout_attempts(tenant_id,created_at desc);
alter table public.checkout_settings enable row level security;alter table public.checkout_fields enable row level security;alter table public.checkout_attempts enable row level security;
create policy checkout_settings_admin on public.checkout_settings for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy checkout_fields_admin on public.checkout_fields for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
create policy checkout_attempts_admin_read on public.checkout_attempts for select to authenticated using(public.can_access_tenant(tenant_id,null));
-- Public checkout writes deliberately have no direct table policy. They must pass a trusted server endpoint with validation + rate limiting.
insert into public.checkout_fields(tenant_id,field_key,field_type,label_fa,label_en,required,sort_order,max_length,validation_rule)
select t.id,v.field_key,v.field_type,v.fa,v.en,v.required,v.sort_order,v.max_length,v.rule from public.tenants t cross join(values
 ('full_name','text','نام و نام خانوادگی','Full name',true,10,120,'name'),
 ('phone','tel','شماره موبایل','Mobile number',true,20,24,'phone'),
 ('email','email','ایمیل','Email',false,30,254,'email'),
 ('province','text','استان','Province / State',true,40,100,'plain'),
 ('city','text','شهر','City',true,50,100,'plain'),
 ('address','textarea','آدرس','Address',true,60,700,'address'),
 ('postal_code','text','کد پستی','Postal code',true,70,24,'postal_code')
)as v(field_key,field_type,fa,en,required,sort_order,max_length,rule)
on conflict(tenant_id,field_key) do nothing;
