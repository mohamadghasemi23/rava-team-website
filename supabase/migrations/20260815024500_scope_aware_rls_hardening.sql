-- Remove broad platform-staff shortcuts now that can_access_tenant() understands tenant_scope.

drop policy if exists "platform staff read tenants" on public.tenants;
create policy "scoped staff read tenants" on public.tenants for select to authenticated
using (public.can_access_tenant(id,null));

drop policy if exists "members read tenant membership" on public.tenant_memberships;
create policy "scoped members read tenant membership" on public.tenant_memberships for select to authenticated
using (user_id=auth.uid() or public.can_access_tenant(tenant_id,null));

-- Allow staff to resolve profile display data only for tenants they can access.
drop policy if exists "tenant staff read related profiles" on public.profiles;
create policy "tenant staff read related profiles" on public.profiles for select to authenticated
using (
  id=auth.uid()
  or exists(
    select 1 from public.tenant_memberships tm
    where tm.user_id=profiles.id and public.can_access_tenant(tm.tenant_id,null)
  )
  or public.is_platform_staff(array['platform_owner','platform_admin'])
);

-- Analytics direct reads must respect platform staff tenant_scope.
drop policy if exists analytics_tenant_read on public.analytics_events;
create policy analytics_tenant_read on public.analytics_events for select to authenticated
using (public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));

create or replace function public.analytics_daily_summary(p_tenant_id uuid,p_days integer default 30)
returns table(day date,views bigint,visitors bigint,sessions bigint)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_access_tenant(p_tenant_id,array['super_admin','admin']::public.role_key[]) then raise exception 'forbidden';end if;
 return query
 select d::date,
   count(e.id) filter(where e.event_type='page_view')::bigint,
   count(distinct e.visitor_id)::bigint,
   count(distinct e.session_id)::bigint
 from generate_series(current_date-greatest(1,least(p_days,365))+1,current_date,'1 day') d
 left join public.analytics_events e on e.tenant_id=p_tenant_id and e.occurred_at>=d and e.occurred_at<d+interval '1 day'
 group by d order by d;
end$$;

create or replace function public.analytics_top_pages(p_tenant_id uuid,p_days integer default 30,p_limit integer default 10)
returns table(path text,views bigint,visitors bigint)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_access_tenant(p_tenant_id,array['super_admin','admin']::public.role_key[]) then raise exception 'forbidden';end if;
 return query select e.path,count(*)::bigint,count(distinct e.visitor_id)::bigint
 from public.analytics_events e
 where e.tenant_id=p_tenant_id and e.event_type='page_view'
   and e.occurred_at>=now()-make_interval(days=>greatest(1,least(p_days,365)))
 group by e.path order by count(*) desc limit greatest(1,least(p_limit,50));
end$$;

create or replace function public.analytics_period_summary(p_tenant_id uuid,p_days integer default 30)
returns table(views bigint,visitors bigint,sessions bigint,conversions bigint)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_access_tenant(p_tenant_id,array['super_admin','admin']::public.role_key[]) then raise exception 'forbidden';end if;
 return query select
   count(*) filter(where event_type='page_view')::bigint,
   count(distinct visitor_id)::bigint,
   count(distinct session_id)::bigint,
   count(*) filter(where event_type='conversion')::bigint
 from public.analytics_events
 where tenant_id=p_tenant_id and occurred_at>=now()-make_interval(days=>greatest(1,least(p_days,365)));
end$$;

-- Content history and previews follow tenant scope, including scoped Content Ops.
drop policy if exists content_revisions_tenant_read on public.content_revisions;
create policy content_revisions_tenant_read on public.content_revisions for select to authenticated
using(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

drop policy if exists preview_tokens_tenant_read on public.preview_tokens;
create policy preview_tokens_tenant_read on public.preview_tokens for select to authenticated
using(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

-- Support Manager can inspect payment connection state only for assigned tenants.
drop policy if exists "tenant payment connection read" on public.payment_connections;
create policy "scoped payment connection read" on public.payment_connections for select to authenticated
using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));
