-- Explicit, scope-aware platform role capability helper.
create or replace function public.platform_staff_can_access_tenant(p_tenant_id uuid, allowed_platform_roles text[] default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.platform_staff ps
    where ps.user_id=auth.uid() and ps.active=true
      and (allowed_platform_roles is null or ps.platform_role=any(allowed_platform_roles))
      and (
        ps.platform_role in ('platform_owner','platform_admin')
        or p_tenant_id=any(ps.tenant_scope)
      )
  );
$$;
grant execute on function public.platform_staff_can_access_tenant(uuid,text[]) to authenticated;

-- Generic tenant access now maps platform job roles to the requested tenant-role level.
-- null = tenant can be entered/read at a basic level.
-- read policies include viewer; write policies intentionally do not.
create or replace function public.can_access_tenant(p_tenant_id uuid, allowed_roles public.role_key[] default null)
returns boolean language sql stable security definer set search_path=public as $$
  select
    public.platform_staff_can_access_tenant(p_tenant_id,array['platform_owner','platform_admin'])
    or (
      allowed_roles is null
      and public.platform_staff_can_access_tenant(p_tenant_id,array['seo_manager','support_manager','content_ops','viewer'])
    )
    or (
      allowed_roles is not null
      and 'viewer'::public.role_key=any(allowed_roles)
      and public.platform_staff_can_access_tenant(p_tenant_id,array['seo_manager','support_manager','content_ops','viewer'])
    )
    or (
      allowed_roles is not null
      and 'content_manager'::public.role_key=any(allowed_roles)
      and public.platform_staff_can_access_tenant(p_tenant_id,array['content_ops'])
    )
    or exists(
      select 1
      from public.tenant_memberships tm
      join public.profiles p on p.id=tm.user_id
      where tm.tenant_id=p_tenant_id and tm.user_id=auth.uid()
        and tm.active=true and p.active=true
        and (allowed_roles is null or tm.role=any(allowed_roles))
    );
$$;
grant execute on function public.can_access_tenant(uuid,public.role_key[]) to authenticated;

-- Analytics is an explicit capability for scoped SEO and Support staff.
drop policy if exists analytics_tenant_read on public.analytics_events;
create policy analytics_tenant_read on public.analytics_events for select to authenticated using(
  public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[])
  or public.platform_staff_can_access_tenant(tenant_id,array['seo_manager','support_manager'])
);

create or replace function public.analytics_authorized(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.can_access_tenant(p_tenant_id,array['super_admin','admin']::public.role_key[])
 or public.platform_staff_can_access_tenant(p_tenant_id,array['seo_manager','support_manager']);
$$;

grant execute on function public.analytics_authorized(uuid) to authenticated;

create or replace function public.analytics_daily_summary(p_tenant_id uuid,p_days integer default 30)
returns table(day date,views bigint,visitors bigint,sessions bigint)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.analytics_authorized(p_tenant_id) then raise exception 'forbidden'; end if;
 return query select d::date,count(e.id) filter(where e.event_type='page_view')::bigint,count(distinct e.visitor_id)::bigint,count(distinct e.session_id)::bigint
 from generate_series(current_date-greatest(1,least(p_days,365))+1,current_date,'1 day') d
 left join public.analytics_events e on e.tenant_id=p_tenant_id and e.occurred_at>=d and e.occurred_at<d+interval '1 day'
 group by d order by d;
end$$;

create or replace function public.analytics_top_pages(p_tenant_id uuid,p_days integer default 30,p_limit integer default 10)
returns table(path text,views bigint,visitors bigint)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.analytics_authorized(p_tenant_id) then raise exception 'forbidden'; end if;
 return query select e.path,count(*)::bigint,count(distinct e.visitor_id)::bigint from public.analytics_events e
 where e.tenant_id=p_tenant_id and e.event_type='page_view' and e.occurred_at>=now()-make_interval(days=>greatest(1,least(p_days,365)))
 group by e.path order by count(*) desc limit greatest(1,least(p_limit,50));
end$$;

create or replace function public.analytics_period_summary(p_tenant_id uuid,p_days integer default 30)
returns table(views bigint,visitors bigint,sessions bigint,conversions bigint)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.analytics_authorized(p_tenant_id) then raise exception 'forbidden'; end if;
 return query select count(*) filter(where event_type='page_view')::bigint,count(distinct visitor_id)::bigint,count(distinct session_id)::bigint,count(*) filter(where event_type='conversion')::bigint
 from public.analytics_events where tenant_id=p_tenant_id and occurred_at>=now()-make_interval(days=>greatest(1,least(p_days,365)));
end$$;
