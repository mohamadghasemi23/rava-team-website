-- RAVA observability and security core
-- Structured errors, security events, safe audit writers and scoped RLS.

create type public.log_severity as enum ('debug','info','notice','warning','error','critical');
create type public.error_status as enum ('open','investigating','resolved','ignored');

create table public.error_logs (
  id bigint generated always as identity primary key,
  error_id uuid not null default gen_random_uuid() unique,
  organization_id uuid references public.organizations(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  category text not null,
  event_type text not null,
  severity public.log_severity not null default 'error',
  status public.error_status not null default 'open',
  route text,
  request_id uuid,
  correlation_id uuid,
  public_message text not null default 'خطایی رخ داده است.',
  technical_message text,
  explanation_fa text,
  explanation_en text,
  probable_causes jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  fingerprint text,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_note text,
  constraint error_logs_category_format check (category ~ '^[a-z0-9_.:-]{2,80}$'),
  constraint error_logs_event_type_format check (event_type ~ '^[a-z0-9_.:-]{2,120}$'),
  constraint error_logs_route_length check (route is null or length(route) <= 512),
  constraint error_logs_public_message_length check (length(public_message) <= 600),
  constraint error_logs_technical_message_length check (technical_message is null or length(technical_message) <= 4000)
);

create table public.security_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  organization_id uuid references public.organizations(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  severity public.log_severity not null default 'notice',
  outcome text not null default 'success',
  route text,
  request_id uuid,
  correlation_id uuid,
  subject_type text,
  subject_id text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_events_event_type_format check (event_type ~ '^[a-z0-9_.:-]{2,120}$'),
  constraint security_events_outcome_check check (outcome in ('success','failure','blocked','challenged')),
  constraint security_events_route_length check (route is null or length(route) <= 512)
);

create index error_logs_scope_time_idx on public.error_logs(organization_id, site_id, occurred_at desc);
create index error_logs_status_severity_time_idx on public.error_logs(status, severity, occurred_at desc);
create index error_logs_category_time_idx on public.error_logs(category, occurred_at desc);
create index error_logs_correlation_idx on public.error_logs(correlation_id) where correlation_id is not null;
create index error_logs_fingerprint_idx on public.error_logs(fingerprint) where fingerprint is not null;
create index security_events_scope_time_idx on public.security_events(organization_id, site_id, created_at desc);
create index security_events_type_time_idx on public.security_events(event_type, created_at desc);
create index security_events_correlation_idx on public.security_events(correlation_id) where correlation_id is not null;

alter table public.error_logs enable row level security;
alter table public.security_events enable row level security;

insert into public.permissions (key,module_key,name_fa,name_en,risk_level) values
  ('errors.view','security','مشاهده خطاها','View errors','high'),
  ('errors.manage','security','مدیریت خطاها','Manage errors','high'),
  ('security.events.view','security','مشاهده رخدادهای امنیتی','View security events','critical')
on conflict (key) do nothing;

create policy "scoped staff view error logs"
on public.error_logs for select to authenticated
using (
  public.has_permission('platform.audit.view', null, null)
  or public.has_permission('errors.view', organization_id, site_id)
);

create policy "scoped staff manage error logs"
on public.error_logs for update to authenticated
using (
  public.has_permission('platform.audit.view', null, null)
  or public.has_permission('errors.manage', organization_id, site_id)
)
with check (
  public.has_permission('platform.audit.view', null, null)
  or public.has_permission('errors.manage', organization_id, site_id)
);

create policy "scoped staff view security events"
on public.security_events for select to authenticated
using (
  public.has_permission('platform.audit.view', null, null)
  or public.has_permission('security.events.view', organization_id, site_id)
);

-- Logs are append-only through hardened RPCs; direct authenticated inserts/deletes are intentionally absent.

create or replace function public.record_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_context jsonb default '{}'::jsonb,
  p_request_id uuid default null,
  p_correlation_id uuid default null,
  p_severity text default 'info'
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id bigint;
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;
  if p_action is null or p_action !~ '^[a-z0-9_.:-]{2,120}$' then
    raise exception 'invalid audit action';
  end if;
  if p_entity_type is null or p_entity_type !~ '^[a-z0-9_.:-]{2,80}$' then
    raise exception 'invalid entity type';
  end if;
  if p_severity not in ('debug','info','notice','warning','error','critical') then
    raise exception 'invalid severity';
  end if;

  insert into public.audit_log(
    actor_id, action, entity_type, entity_id, before_data, after_data,
    organization_id, site_id, request_id, correlation_id, severity, context
  ) values (
    v_actor, p_action, p_entity_type, p_entity_id, p_before_data, p_after_data,
    p_organization_id, p_site_id, p_request_id, p_correlation_id, p_severity, coalesce(p_context,'{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_error_event(
  p_category text,
  p_event_type text,
  p_public_message text,
  p_technical_message text default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_route text default null,
  p_context jsonb default '{}'::jsonb,
  p_request_id uuid default null,
  p_correlation_id uuid default null,
  p_severity public.log_severity default 'error',
  p_explanation_fa text default null,
  p_explanation_en text default null,
  p_probable_causes jsonb default '[]'::jsonb,
  p_fingerprint text default null
) returns table(id bigint, error_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;
  if p_category is null or p_category !~ '^[a-z0-9_.:-]{2,80}$' then
    raise exception 'invalid error category';
  end if;
  if p_event_type is null or p_event_type !~ '^[a-z0-9_.:-]{2,120}$' then
    raise exception 'invalid error event type';
  end if;

  return query
  insert into public.error_logs(
    organization_id, site_id, actor_id, category, event_type, severity, route,
    request_id, correlation_id, public_message, technical_message,
    explanation_fa, explanation_en, probable_causes, context, fingerprint
  ) values (
    p_organization_id, p_site_id, v_actor, p_category, p_event_type, p_severity, p_route,
    p_request_id, p_correlation_id, left(coalesce(p_public_message,'خطایی رخ داده است.'),600),
    left(p_technical_message,4000), p_explanation_fa, p_explanation_en,
    coalesce(p_probable_causes,'[]'::jsonb), coalesce(p_context,'{}'::jsonb), p_fingerprint
  ) returning error_logs.id, error_logs.error_id;
end;
$$;

create or replace function public.record_security_event(
  p_event_type text,
  p_outcome text default 'success',
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_route text default null,
  p_subject_type text default null,
  p_subject_id text default null,
  p_context jsonb default '{}'::jsonb,
  p_request_id uuid default null,
  p_correlation_id uuid default null,
  p_severity public.log_severity default 'notice'
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id bigint;
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;
  if p_event_type is null or p_event_type !~ '^[a-z0-9_.:-]{2,120}$' then
    raise exception 'invalid security event type';
  end if;
  if p_outcome not in ('success','failure','blocked','challenged') then
    raise exception 'invalid security outcome';
  end if;

  insert into public.security_events(
    organization_id, site_id, actor_id, event_type, severity, outcome, route,
    request_id, correlation_id, subject_type, subject_id, context
  ) values (
    p_organization_id, p_site_id, v_actor, p_event_type, p_severity, p_outcome, p_route,
    p_request_id, p_correlation_id, p_subject_type, p_subject_id, coalesce(p_context,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_audit_event(text,text,text,uuid,uuid,jsonb,jsonb,jsonb,uuid,uuid,text) from public, anon;
revoke all on function public.record_error_event(text,text,text,text,uuid,uuid,text,jsonb,uuid,uuid,public.log_severity,text,text,jsonb,text) from public, anon;
revoke all on function public.record_security_event(text,text,uuid,uuid,text,text,text,jsonb,uuid,uuid,public.log_severity) from public, anon;
grant execute on function public.record_audit_event(text,text,text,uuid,uuid,jsonb,jsonb,jsonb,uuid,uuid,text) to authenticated;
grant execute on function public.record_error_event(text,text,text,text,uuid,uuid,text,jsonb,uuid,uuid,public.log_severity,text,text,jsonb,text) to authenticated;
grant execute on function public.record_security_event(text,text,uuid,uuid,text,text,text,jsonb,uuid,uuid,public.log_severity) to authenticated;
