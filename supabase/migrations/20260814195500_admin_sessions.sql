create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  remember_me boolean not null default false,
  idle_timeout_minutes integer not null check (idle_timeout_minutes between 15 and 1440),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent_hash text
);

create index if not exists admin_sessions_user_active_idx
  on public.admin_sessions (user_id, expires_at desc)
  where revoked_at is null;

alter table public.admin_sessions enable row level security;

create policy "admin sessions own select"
  on public.admin_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "admin sessions own insert"
  on public.admin_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "admin sessions own update"
  on public.admin_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admin sessions own delete"
  on public.admin_sessions for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.admin_sessions is
  'Application-enforced admin session lifecycle. Never stores passwords or raw session tokens.';
