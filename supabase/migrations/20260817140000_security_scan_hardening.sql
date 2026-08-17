-- RAVA security scan hardening
-- Prevent delegated-access privilege escalation and enforce commercial template tiers in the database.

create or replace function private.actor_can_grant_permission(
  p_permission_key text,
  p_organization_id uuid default null,
  p_site_id uuid default null
) returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
begin
  if auth.uid() is null then return false; end if;
  if private.user_has_permission('platform.access.manage',null,null)
     or private.user_has_permission('platform.roles.manage',null,null) then
    return true;
  end if;
  return private.user_has_permission(p_permission_key,p_organization_id,p_site_id);
end;
$$;
revoke all on function private.actor_can_grant_permission(text,uuid,uuid) from public,anon,authenticated;

create or replace function private.role_is_grantable(p_role_id uuid) returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare v_role public.roles%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into v_role from public.roles where id=p_role_id;
  if not found then return false; end if;
  return not exists(
    select 1
    from public.role_permissions rp
    where rp.role_id=v_role.id
      and not private.actor_can_grant_permission(rp.permission_key,v_role.organization_id,v_role.site_id)
  );
end;
$$;
revoke all on function private.role_is_grantable(uuid) from public,anon,authenticated;

create or replace function private.guard_role_permission_grant() returns trigger
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_role public.roles%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_role from public.roles where id=new.role_id;
  if not found then raise exception 'role not found'; end if;
  if not private.actor_can_grant_permission(new.permission_key,v_role.organization_id,v_role.site_id) then
    raise exception 'permission is not delegatable by actor';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_role_permission_grant() from public,anon,authenticated;

drop trigger if exists guard_role_permission_grant on public.role_permissions;
create trigger guard_role_permission_grant
before insert or update on public.role_permissions
for each row execute function private.guard_role_permission_grant();

create or replace function private.guard_membership_role_grant() returns trigger
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_membership public.memberships%rowtype; v_role public.roles%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_membership from public.memberships where id=new.membership_id;
  if not found then raise exception 'membership not found'; end if;
  select * into v_role from public.roles where id=new.role_id;
  if not found then raise exception 'role not found'; end if;
  if v_role.scope_type<>v_membership.scope_type
     or v_role.organization_id is distinct from v_membership.organization_id
     or v_role.site_id is distinct from v_membership.site_id then
    raise exception 'role scope mismatch';
  end if;
  if not private.role_is_grantable(new.role_id) then raise exception 'role contains permissions actor may not delegate'; end if;
  return new;
end;
$$;
revoke all on function private.guard_membership_role_grant() from public,anon,authenticated;

drop trigger if exists guard_membership_role_grant on public.membership_roles;
create trigger guard_membership_role_grant
before insert or update on public.membership_roles
for each row execute function private.guard_membership_role_grant();

create or replace function private.guard_permission_override_grant() returns trigger
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.actor_can_grant_permission(new.permission_key,new.organization_id,new.site_id) then
    raise exception 'permission override is not delegatable by actor';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_permission_override_grant() from public,anon,authenticated;

drop trigger if exists guard_permission_override_grant on public.permission_overrides;
create trigger guard_permission_override_grant
before insert or update on public.permission_overrides
for each row execute function private.guard_permission_override_grant();

create or replace function private.guard_membership_owner_assignment() returns trigger
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if new.is_owner and (tg_op='INSERT' or old.is_owner is distinct from true) then
    if not (private.user_has_permission('platform.access.manage',null,null)
            or private.user_has_permission('platform.roles.manage',null,null)) then
      raise exception 'only platform access managers may assign owner membership';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_membership_owner_assignment() from public,anon,authenticated;

drop trigger if exists guard_membership_owner_assignment on public.memberships;
create trigger guard_membership_owner_assignment
before insert or update of is_owner on public.memberships
for each row execute function private.guard_membership_owner_assignment();

create or replace function private.guard_access_invitation_roles() returns trigger
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_role_id uuid; v_role public.roles%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  foreach v_role_id in array coalesce(new.role_ids,'{}'::uuid[]) loop
    select * into v_role from public.roles where id=v_role_id;
    if not found then raise exception 'unknown role'; end if;
    if v_role.scope_type<>new.scope_type
       or v_role.organization_id is distinct from new.organization_id
       or v_role.site_id is distinct from new.site_id then
      raise exception 'role scope mismatch';
    end if;
    if not private.role_is_grantable(v_role_id) then raise exception 'invitation contains a non-delegatable role'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.guard_access_invitation_roles() from public,anon,authenticated;

drop trigger if exists guard_access_invitation_roles on public.access_invitations;
create trigger guard_access_invitation_roles
before insert or update of role_ids,scope_type,organization_id,site_id on public.access_invitations
for each row execute function private.guard_access_invitation_roles();

-- Commercial template access is contract-backed; is_public controls discoverability only.
create or replace function private.commercial_tier_rank(p_tier text) returns integer
language sql immutable security invoker
set search_path=pg_temp
as $$
  select case lower(coalesce(p_tier,'core'))
    when 'core' then 0
    when 'premium' then 10
    when 'enterprise' then 20
    when 'exclusive' then 30
    else -1
  end;
$$;
revoke all on function private.commercial_tier_rank(text) from public,anon,authenticated;

create or replace function private.site_contract_commercial_tier(p_site_id uuid) returns text
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare v_tier text;
begin
  select pc.commercial_tier into v_tier
  from public.contract_sites cs
  join public.customer_contracts c on c.id=cs.contract_id
  join public.plan_catalog pc on pc.id=c.plan_id
  where cs.site_id=p_site_id
    and c.status='active'
    and (c.starts_at is null or c.starts_at<=now())
    and (c.ends_at is null or c.ends_at>now())
  order by private.commercial_tier_rank(pc.commercial_tier) desc, c.starts_at desc nulls last
  limit 1;
  return coalesce(v_tier,'core');
end;
$$;
revoke all on function private.site_contract_commercial_tier(uuid) from public,anon,authenticated;

create or replace function private.site_can_use_template_tier(p_site_id uuid,p_template_tier text) returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare v_site_tier text;
begin
  if auth.uid() is null then return false; end if;
  if lower(coalesce(p_template_tier,'core'))='exclusive' then
    return private.user_has_permission('platform.sites.manage',null,null)
       or private.user_has_permission('templates.manage',null,null);
  end if;
  select private.site_contract_commercial_tier(p_site_id) into v_site_tier;
  return private.commercial_tier_rank(v_site_tier)>=private.commercial_tier_rank(p_template_tier);
end;
$$;
revoke all on function private.site_can_use_template_tier(uuid,text) from public,anon,authenticated;

create or replace function public.apply_template_to_site(
  p_site_id uuid,
  p_template_version_id uuid,
  p_theme_overrides jsonb default '{}'::jsonb,
  p_note text default null
) returns table(revision_id uuid, revision integer)
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=auth.uid(); v_tv public.template_versions%rowtype; v_t public.template_catalog%rowtype;
  v_revision integer; v_id uuid; v_theme jsonb;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_design(p_site_id,'design.manage') then raise exception 'permission denied'; end if;
  if jsonb_typeof(coalesce(p_theme_overrides,'{}'::jsonb)) <> 'object' then raise exception 'invalid theme overrides'; end if;
  select * into v_tv from public.template_versions where id=p_template_version_id and status='published';
  if not found then raise exception 'template version unavailable'; end if;
  select * into v_t from public.template_catalog where id=v_tv.template_id and status='active';
  if not found then raise exception 'template unavailable'; end if;
  if not v_t.is_public and not public.has_permission('platform.sites.manage',null,null) and not public.has_permission('templates.manage',null,null) then raise exception 'template not available for tenant'; end if;
  if not private.site_can_use_template_tier(p_site_id,v_t.commercial_tier) then raise exception 'template commercial entitlement required'; end if;
  select coalesce(max(r.revision),0)+1 into v_revision from public.site_design_revisions r where r.site_id=p_site_id;
  v_theme := coalesce(v_tv.theme_defaults,'{}'::jsonb) || coalesce(p_theme_overrides,'{}'::jsonb);
  insert into public.site_design_revisions(site_id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_by)
  values(p_site_id,v_revision,'template',v_t.id,v_tv.id,v_theme,v_tv.layout_blueprint,left(p_note,500),v_actor)
  returning id into v_id;
  insert into public.site_design_state(site_id,current_revision_id,current_template_id,current_template_version_id,updated_by,updated_at)
  values(p_site_id,v_id,v_t.id,v_tv.id,v_actor,now())
  on conflict(site_id) do update set current_revision_id=excluded.current_revision_id,current_template_id=excluded.current_template_id,current_template_version_id=excluded.current_template_version_id,updated_by=excluded.updated_by,updated_at=now();
  perform public.record_audit_event('design.template.applied','site',p_site_id::text,private.site_org(p_site_id),p_site_id,null,
    jsonb_build_object('template_key',v_t.key,'template_version',v_tv.version,'commercial_tier',v_t.commercial_tier,'revision',v_revision),
    jsonb_build_object('note',left(p_note,500)),null,null,'notice');
  return query select v_id,v_revision;
end;
$$;

revoke all on function public.apply_template_to_site(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.apply_template_to_site(uuid,uuid,jsonb,text) to authenticated;
