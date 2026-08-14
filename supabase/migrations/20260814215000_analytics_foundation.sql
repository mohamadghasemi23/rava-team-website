create table if not exists public.analytics_events(
 id bigserial primary key,
 occurred_at timestamptz not null default now(),
 event_type text not null check(event_type in ('page_view','engagement','conversion','web_vital')),
 path text not null,
 visitor_id text,
 session_id text,
 referrer_host text,
 device_class text check(device_class is null or device_class in ('mobile','tablet','desktop','other')),
 country_code text,
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists analytics_events_time_idx on public.analytics_events(occurred_at desc);
create index if not exists analytics_events_path_time_idx on public.analytics_events(path,occurred_at desc);
create index if not exists analytics_events_visitor_time_idx on public.analytics_events(visitor_id,occurred_at desc);
alter table public.analytics_events enable row level security;
create policy analytics_staff_read on public.analytics_events for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role in ('super_admin','admin')));

create or replace function public.record_analytics_event(p_event_type text,p_path text,p_visitor_id text default null,p_session_id text default null,p_referrer_host text default null,p_device_class text default null,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$begin
 if p_event_type not in ('page_view','engagement','conversion','web_vital') then raise exception 'invalid_event_type';end if;
 if p_path is null or length(p_path)>500 or p_path !~ '^/' or p_path like '/admin%' or p_path like '/api/%' then return;end if;
 if p_visitor_id is not null and length(p_visitor_id)>100 then raise exception 'invalid_visitor_id';end if;
 if p_session_id is not null and length(p_session_id)>100 then raise exception 'invalid_session_id';end if;
 if p_referrer_host is not null and length(p_referrer_host)>255 then p_referrer_host=left(p_referrer_host,255);end if;
 if p_device_class is not null and p_device_class not in ('mobile','tablet','desktop','other') then p_device_class='other';end if;
 if pg_column_size(coalesce(p_metadata,'{}'::jsonb))>4096 then p_metadata='{}'::jsonb;end if;
 insert into public.analytics_events(event_type,path,visitor_id,session_id,referrer_host,device_class,metadata) values(p_event_type,left(p_path,500),nullif(p_visitor_id,''),nullif(p_session_id,''),nullif(p_referrer_host,''),p_device_class,coalesce(p_metadata,'{}'::jsonb));
end$$;
revoke all on function public.record_analytics_event(text,text,text,text,text,text,jsonb) from public;grant execute on function public.record_analytics_event(text,text,text,text,text,text,jsonb) to anon,authenticated;

create or replace function public.analytics_daily_summary(p_days integer default 30)
returns table(day date,views bigint,visitors bigint,sessions bigint) language sql stable security definer set search_path=public as $$
 select d::date,count(e.id) filter(where e.event_type='page_view')::bigint,count(distinct e.visitor_id)::bigint,count(distinct e.session_id)::bigint
 from generate_series(current_date-greatest(1,least(p_days,365))+1,current_date,'1 day') d
 left join public.analytics_events e on e.occurred_at>=d and e.occurred_at<d+interval '1 day'
 group by d order by d
$$;
revoke all on function public.analytics_daily_summary(integer) from public;grant execute on function public.analytics_daily_summary(integer) to authenticated;

create or replace function public.analytics_top_pages(p_days integer default 30,p_limit integer default 10)
returns table(path text,views bigint,visitors bigint) language sql stable security definer set search_path=public as $$
 select e.path,count(*)::bigint,count(distinct e.visitor_id)::bigint from public.analytics_events e where e.event_type='page_view' and e.occurred_at>=now()-make_interval(days=>greatest(1,least(p_days,365))) group by e.path order by count(*) desc limit greatest(1,least(p_limit,50))
$$;
revoke all on function public.analytics_top_pages(integer,integer) from public;grant execute on function public.analytics_top_pages(integer,integer) to authenticated;
