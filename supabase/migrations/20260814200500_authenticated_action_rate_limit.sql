create table if not exists public.security_rate_limits (
  bucket text not null,
  subject_key text not null,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 0,
  primary key (bucket, subject_key)
);

alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from anon, authenticated;

create or replace function public.consume_authenticated_rate_limit(
  p_bucket text,
  p_limit integer default 180,
  p_window_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 180), 1000));
  v_window integer := greatest(10, least(coalesce(p_window_seconds, 300), 86400));
  v_now timestamptz := now();
  v_row public.security_rate_limits%rowtype;
begin
  if v_user is null then
    return false;
  end if;

  if p_bucket is null or length(p_bucket) < 1 or length(p_bucket) > 64 then
    return false;
  end if;

  insert into public.security_rate_limits(bucket, subject_key, window_started_at, hit_count)
  values (p_bucket, v_user::text, v_now, 1)
  on conflict (bucket, subject_key) do update
  set
    window_started_at = case
      when public.security_rate_limits.window_started_at + make_interval(secs => v_window) <= v_now then v_now
      else public.security_rate_limits.window_started_at
    end,
    hit_count = case
      when public.security_rate_limits.window_started_at + make_interval(secs => v_window) <= v_now then 1
      else public.security_rate_limits.hit_count + 1
    end
  returning * into v_row;

  return v_row.hit_count <= v_limit;
end;
$$;

revoke all on function public.consume_authenticated_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_authenticated_rate_limit(text, integer, integer) to authenticated;

comment on function public.consume_authenticated_rate_limit(text, integer, integer) is
  'Portable application-layer rate limit for authenticated sensitive mutations. Network DDoS still requires host/CDN protections.';
