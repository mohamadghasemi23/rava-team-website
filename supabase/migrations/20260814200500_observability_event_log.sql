create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  request_id text,
  category text not null check (category in ('audit','error','security','auth','system','performance')),
  severity text not null check (severity in ('debug','info','warning','error','critical')),
  event_name text not null,
  message text,
  route text,
  method text,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  session_id uuid,
  source text not null default 'server',
  http_status integer,
  error_name text,
  error_code text,
  error_stack text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_events_created_at_idx on public.system_events(created_at desc);
create index if not exists system_events_event_id_idx on public.system_events(event_id);
create index if not exists system_events_category_severity_idx on public.system_events(category,severity,created_at desc);
create index if not exists system_events_actor_idx on public.system_events(actor_user_id,created_at desc) where actor_user_id is not null;
create index if not exists system_events_request_idx on public.system_events(request_id) where request_id is not null;

alter table public.system_events enable row level security;

-- Nobody may write event logs directly from browser clients. Server-side logger uses the service-role key.
drop policy if exists system_events_no_direct_insert on public.system_events;
create policy system_events_no_direct_insert on public.system_events
  for insert to authenticated, anon
  with check (false);

-- Only active super admins/admins may inspect logs from the CMS.
drop policy if exists system_events_admin_read on public.system_events;
create policy system_events_admin_read on public.system_events
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('super_admin','admin')
    )
  );

revoke update, delete on public.system_events from anon, authenticated;

comment on table public.system_events is 'Central append-only RAVA audit, error, security and operational event log. Never store secrets, passwords, tokens or raw cookies.';
