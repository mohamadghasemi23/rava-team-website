-- LaunchPad is the commercial workspace name for the existing Living System
-- renderer. Keep one Template identity and make customer access explicit.
update public.template_catalog
set name_fa='لانچ‌پد راوا',
    name_en='RAVA LaunchPad',
    description_fa='قالب خدماتی لانچ‌پد با مدیریت محتوای محدود، پیش‌نمایش واقعی و انتشار کنترل‌شده.',
    description_en='The LaunchPad service Template with constrained content management, real preview and controlled publishing.',
    is_public=false,
    metadata=coalesce(metadata,'{}'::jsonb)||'{"workspace":"launchpad","customer_access":"explicit_entitlement"}'::jsonb,
    updated_at=now()
where key='rava-service-living-system';

alter table public.site_template_access
  drop constraint if exists site_template_access_access_kind_check;
alter table public.site_template_access
  add constraint site_template_access_access_kind_check
  check(access_kind in('granted','purchased','complimentary','contract','campaign','support'));
create or replace function public.set_site_template_access(
  p_site_id uuid,
  p_template_id uuid,
  p_active boolean,
  p_access_kind text default 'granted'
) returns boolean
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_actor uuid:=auth.uid();v_org uuid;
begin
  if v_actor is null then raise exception 'authentication required';end if;
  if not(public.has_permission('platform.sites.manage',null,null) or public.has_permission('templates.manage',null,null)) then raise exception 'permission denied';end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null then raise exception 'site not found';end if;
  if not exists(select 1 from public.template_catalog where id=p_template_id and status='active') then raise exception 'template unavailable';end if;
  if p_access_kind not in('granted','purchased','complimentary','contract','campaign','support') then raise exception 'invalid access kind';end if;
  insert into public.site_template_access(site_id,template_id,access_kind,active,granted_by)
  values(p_site_id,p_template_id,p_access_kind,p_active,v_actor)
  on conflict(site_id,template_id) do update set access_kind=excluded.access_kind,active=excluded.active,granted_by=excluded.granted_by,updated_at=now();
  perform public.record_audit_event(
    case when p_active then 'design.template.access_granted' else 'design.template.access_revoked' end,
    'template',p_template_id::text,v_org,p_site_id,null,
    jsonb_build_object('active',p_active,'access_kind',p_access_kind),
    jsonb_build_object('source','site_template_access'),null,null,'notice'
  );
  return true;
end$$;
revoke all on function public.set_site_template_access(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.set_site_template_access(uuid,uuid,boolean,text) to authenticated;

create or replace function public.has_template_workspace_access(
  p_site_id uuid,
  p_template_key text
) returns boolean
language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare v_actor uuid:=auth.uid();v_org uuid;
begin
  if v_actor is null or p_site_id is null or p_template_key is null or length(p_template_key)>80 then return false;end if;
  select organization_id into v_org from public.sites where id=p_site_id and status in('draft','active');
  if v_org is null then return false;end if;

  if not(
    private.user_has_permission('platform.sites.manage',null,null)
    or private.user_has_permission('templates.manage',null,null)
    or private.user_has_permission('sites.view',v_org,p_site_id)
    or private.user_has_permission('cms.view',v_org,p_site_id)
    or private.user_has_permission('cms.manage',v_org,p_site_id)
  ) then return false;end if;

  return exists(
    select 1
    from public.site_design_state state
    join public.template_catalog template on template.id=state.current_template_id
    where state.site_id=p_site_id
      and template.key=p_template_key
      and template.status='active'
      and (
        private.user_has_permission('platform.sites.manage',null,null)
        or private.user_has_permission('templates.manage',null,null)
        or exists(
          select 1 from public.site_template_access access
          where access.site_id=p_site_id and access.template_id=template.id and access.active
        )
      )
  );
end$$;
revoke all on function public.has_template_workspace_access(uuid,text) from public,anon;
grant execute on function public.has_template_workspace_access(uuid,text) to authenticated;

comment on function public.has_template_workspace_access(uuid,text) is
'Checks authenticated Site scope, the active Template, and explicit Template access. Platform Template/Site managers bypass only the access grant, never the active-Site match.';
