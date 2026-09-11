-- Persist authorized installation failures outside the installer's subtransaction.
create table public.starter_pack_installation_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  requested_starter_pack_version_id uuid,
  requested_template_version_id uuid,
  requested_idempotency_key uuid,
  outcome text not null check(outcome in ('succeeded','failed')),
  installation_id uuid references public.starter_pack_installations(id) on delete restrict,
  error_code text,
  occurred_at timestamptz not null default now(),
  check((outcome='succeeded' and installation_id is not null and error_code is null)
    or (outcome='failed' and installation_id is null and error_code is not null)),
  check(error_code is null or error_code ~ '^[a-z0-9_]{2,80}$')
);
create index starter_pack_install_attempts_site_time_idx on public.starter_pack_installation_attempts(site_id,occurred_at desc);
alter table public.starter_pack_installation_attempts enable row level security;
create policy starter_pack_installation_attempts_read on public.starter_pack_installation_attempts for select to authenticated using(
  public.has_permission('platform.sites.manage',null,null)
  or public.has_permission('starter_packs.install',organization_id,site_id)
  or public.has_permission('sites.view',organization_id,site_id)
);
revoke all on public.starter_pack_installation_attempts from anon;
revoke insert,update,delete on public.starter_pack_installation_attempts from authenticated;
grant select on public.starter_pack_installation_attempts to authenticated;

create function private.protect_starter_installation_attempt() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'starter installation attempts are immutable'; end $$;
revoke all on function private.protect_starter_installation_attempt() from public,anon,authenticated;
create trigger protect_starter_installation_attempt before update or delete on public.starter_pack_installation_attempts
for each row execute function private.protect_starter_installation_attempt();

-- Keep the mutating implementation private. The public wrapper below owns the
-- subtransaction and persists only allow-listed, non-sensitive error codes.
alter function public.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb) set schema private;
revoke all on function private.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb) from public,anon,authenticated;

create function public.install_starter_pack(
  p_site_id uuid,
  p_starter_pack_version_id uuid,
  p_template_version_id uuid,
  p_idempotency_key uuid,
  p_locales text[] default array['fa']::text[],
  p_brand_inputs jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public,private,pg_catalog,pg_temp as $$
declare
  v_actor uuid:=auth.uid();
  v_org uuid;
  v_result jsonb;
  v_attempt_id uuid;
  v_installation_id uuid;
  v_error_code text;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null then raise exception 'site_not_found' using errcode='P0002'; end if;
  if not private.can_install_starter_pack(p_site_id) then raise exception 'permission_denied' using errcode='42501'; end if;

  begin
    v_result:=private.install_starter_pack(
      p_site_id,p_starter_pack_version_id,p_template_version_id,p_idempotency_key,p_locales,p_brand_inputs
    );
  exception when others then
    v_error_code:=case sqlerrm
      when 'feature_not_entitled' then 'feature_not_entitled'
      when 'invalid_installation_request' then 'invalid_installation_request'
      when 'invalid_brand_inputs' then 'invalid_brand_inputs'
      when 'invalid_locales' then 'invalid_locales'
      when 'idempotency_key_reused' then 'idempotency_key_reused'
      when 'starter_pack_version_unavailable' then 'starter_pack_version_unavailable'
      when 'template_version_unavailable' then 'template_version_unavailable'
      when 'incompatible_template' then 'incompatible_template'
      when 'locale_unavailable' then 'locale_unavailable'
      when 'starter_page_slug_conflict' then 'starter_page_slug_conflict'
      when 'unsafe_starter_page' then 'unsafe_starter_page'
      else 'installation_failed'
    end;
    insert into public.starter_pack_installation_attempts(
      organization_id,site_id,actor_id,requested_starter_pack_version_id,requested_template_version_id,requested_idempotency_key,outcome,error_code
    ) values(v_org,p_site_id,v_actor,p_starter_pack_version_id,p_template_version_id,p_idempotency_key,'failed',v_error_code)
    returning id into v_attempt_id;
    perform public.record_audit_event('starter_pack.install.failed','starter_pack_installation_attempt',v_attempt_id::text,v_org,p_site_id,null,
      jsonb_build_object('outcome','failed','error_code',v_error_code),'{}',null,null,'warning');
    return jsonb_build_object('status','failed','error_code',v_error_code,'attempt_id',v_attempt_id);
  end;

  v_installation_id:=(v_result->>'installation_id')::uuid;
  insert into public.starter_pack_installation_attempts(
    organization_id,site_id,actor_id,requested_starter_pack_version_id,requested_template_version_id,requested_idempotency_key,outcome,installation_id
  ) values(v_org,p_site_id,v_actor,p_starter_pack_version_id,p_template_version_id,p_idempotency_key,'succeeded',v_installation_id)
  returning id into v_attempt_id;
  return v_result||jsonb_build_object('attempt_id',v_attempt_id);
end $$;
revoke all on function public.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb) from public,anon;
grant execute on function public.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb) to authenticated;
