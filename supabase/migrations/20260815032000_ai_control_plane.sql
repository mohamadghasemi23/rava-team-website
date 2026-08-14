create table if not exists public.ai_profiles(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid references public.tenants(id) on delete cascade,
 scope text not null check(scope in('platform','tenant')),
 name text not null,
 provider_key text not null,
 model_key text not null,
 enabled boolean not null default true,
 allowed_tasks text[] not null default '{}',
 temperature numeric(3,2) not null default .30 check(temperature between 0 and 2),
 max_output_tokens integer not null default 1200 check(max_output_tokens between 64 and 32768),
 settings jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((scope='platform' and tenant_id is null) or(scope='tenant' and tenant_id is not null))
);
create unique index if not exists ai_profiles_platform_name_uq on public.ai_profiles(name) where tenant_id is null;
create unique index if not exists ai_profiles_tenant_name_uq on public.ai_profiles(tenant_id,name) where tenant_id is not null;

create table if not exists public.ai_prompt_templates(
 id uuid primary key default gen_random_uuid(),tenant_id uuid references public.tenants(id) on delete cascade,
 task text not null,name text not null,locale text not null default 'fa',system_prompt text not null,user_template text not null,
 version integer not null default 1,active boolean not null default true,created_by uuid references auth.users(id),updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists ai_prompt_templates_uq on public.ai_prompt_templates(coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid),task,name,version,locale);

create table if not exists public.ai_runs(
 id bigint generated always as identity primary key,run_id uuid not null default gen_random_uuid(),tenant_id uuid references public.tenants(id) on delete set null,
 actor_user_id uuid references auth.users(id) on delete set null,task text not null,provider_key text,model_key text,status text not null check(status in('queued','running','completed','failed','cancelled')),
 input_fingerprint text,output_preview text,error_code text,usage jsonb not null default '{}'::jsonb,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),completed_at timestamptz
);
create unique index if not exists ai_runs_run_id_uq on public.ai_runs(run_id);create index if not exists ai_runs_tenant_created_idx on public.ai_runs(tenant_id,created_at desc);

alter table public.ai_profiles enable row level security;alter table public.ai_prompt_templates enable row level security;alter table public.ai_runs enable row level security;

create policy ai_profiles_platform_owner_all on public.ai_profiles for all to authenticated using(public.is_platform_owner()) with check(public.is_platform_owner());
create policy ai_prompts_platform_owner_all on public.ai_prompt_templates for all to authenticated using(public.is_platform_owner()) with check(public.is_platform_owner());
create policy ai_runs_platform_owner_read on public.ai_runs for select to authenticated using(public.is_platform_owner());
create policy ai_runs_scoped_staff_read on public.ai_runs for select to authenticated using(tenant_id is not null and public.platform_staff_can_access_tenant(tenant_id));

comment on table public.ai_profiles is 'AI routing/configuration only. API secrets must never be stored here; secrets belong in server environment/secret manager.';
comment on table public.ai_runs is 'Metadata/usage audit only. Raw sensitive prompts and secrets are intentionally not persisted.';
