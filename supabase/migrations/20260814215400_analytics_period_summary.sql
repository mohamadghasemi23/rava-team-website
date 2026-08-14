create or replace function public.analytics_period_summary(p_days integer default 30)
returns table(views bigint,visitors bigint,sessions bigint,conversions bigint) language sql stable security definer set search_path=public as $$
 select count(*) filter(where event_type='page_view')::bigint,count(distinct visitor_id)::bigint,count(distinct session_id)::bigint,count(*) filter(where event_type='conversion')::bigint from public.analytics_events where occurred_at>=now()-make_interval(days=>greatest(1,least(p_days,365)))
$$;
revoke all on function public.analytics_period_summary(integer) from public;grant execute on function public.analytics_period_summary(integer) to authenticated;
