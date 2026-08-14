create table if not exists public.auth_login_rate_limits (
  rate_key text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.auth_login_rate_limits enable row level security;

revoke all on table public.auth_login_rate_limits from anon, authenticated;

create or replace function public.consume_login_rate_limit(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.auth_login_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_key is null or length(p_key) < 32 or length(p_key) > 128 then
    return false;
  end if;

  select * into v_row
  from public.auth_login_rate_limits
  where rate_key = p_key
  for update;

  if not found then
    insert into public.auth_login_rate_limits(rate_key, attempts, window_started_at, updated_at)
    values (p_key, 1, v_now, v_now);
    return true;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return false;
  end if;

  if v_row.window_started_at < v_now - interval '15 minutes' then
    update public.auth_login_rate_limits
    set attempts = 1, window_started_at = v_now, blocked_until = null, updated_at = v_now
    where rate_key = p_key;
    return true;
  end if;

  if v_row.attempts >= 7 then
    update public.auth_login_rate_limits
    set attempts = attempts + 1, blocked_until = v_now + interval '15 minutes', updated_at = v_now
    where rate_key = p_key;
    return false;
  end if;

  update public.auth_login_rate_limits
  set attempts = attempts + 1, updated_at = v_now
  where rate_key = p_key;
  return true;
end;
$$;

create or replace function public.reset_login_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.auth_login_rate_limits where rate_key = p_key;
$$;

revoke all on function public.consume_login_rate_limit(text) from public;
revoke all on function public.reset_login_rate_limit(text) from public;
grant execute on function public.consume_login_rate_limit(text) to anon, authenticated;
grant execute on function public.reset_login_rate_limit(text) to anon, authenticated;

comment on table public.auth_login_rate_limits is 'Server-side brute-force protection for CMS login; keyed by a one-way hash of client network identity.';
