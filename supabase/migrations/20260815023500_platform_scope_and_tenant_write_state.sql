-- Platform staff below owner/admin are explicitly scoped to assigned tenants.
create or replace function public.can_access_tenant(p_tenant_id uuid, allowed_roles public.role_key[] default null)
returns boolean language sql stable security definer set search_path=public as $$
  select
    exists(
      select 1 from public.platform_staff ps
      where ps.user_id=auth.uid() and ps.active=true
        and ps.platform_role in ('platform_owner','platform_admin')
    )
    or exists(
      select 1 from public.platform_staff ps
      where ps.user_id=auth.uid() and ps.active=true
        and ps.platform_role in ('seo_manager','support_manager','content_ops','viewer')
        and p_tenant_id = any(ps.tenant_scope)
    )
    or exists(
      select 1
      from public.tenant_memberships tm
      join public.profiles p on p.id=tm.user_id
      where tm.tenant_id=p_tenant_id
        and tm.user_id=auth.uid()
        and tm.active=true
        and p.active=true
        and (allowed_roles is null or tm.role=any(allowed_roles))
    );
$$;
grant execute on function public.can_access_tenant(uuid,public.role_key[]) to authenticated;

-- Customer-side writes are blocked when a tenant is read-only, suspended or archived.
-- Platform owner/admin can still repair or reactivate a tenant.
create or replace function public.enforce_tenant_write_state()
returns trigger language plpgsql security definer set search_path=public as $$
declare tid uuid; state text;
begin
  tid := case when tg_op='DELETE' then old.tenant_id else new.tenant_id end;
  if tid is null then return case when tg_op='DELETE' then old else new end; end if;
  select status into state from public.tenants where id=tid;
  if state is null then raise exception 'tenant_not_found'; end if;
  if state in ('read_only','suspended','archived')
     and not public.is_platform_staff(array['platform_owner','platform_admin']) then
    raise exception 'tenant_write_blocked:%',state;
  end if;
  return case when tg_op='DELETE' then old else new end;
end$$;

-- Apply to tenant-owned mutable business data. Maintenance intentionally allows admin writes.
do $$
declare t text;
begin
  foreach t in array array[
    'pages','page_blocks','media_assets','projects','leads','site_settings',
    'revisions','content_revisions','content_autosaves','preview_tokens'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists enforce_tenant_write_state on public.%I',t);
      execute format('create trigger enforce_tenant_write_state before insert or update or delete on public.%I for each row execute function public.enforce_tenant_write_state()',t);
    end if;
  end loop;
end$$;
