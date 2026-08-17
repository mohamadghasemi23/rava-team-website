-- RAVA runtime entitlement hardening.
-- Keeps core design in every commercial plan and adds a site-aware permission helper.

insert into public.plan_entitlements(plan_id,module_key,enabled,tier,limits,config)
select p.id,'design',true,'core','{}'::jsonb,'{}'::jsonb
from public.plan_catalog p
on conflict(plan_id,module_key) do update set enabled=true,tier='core';

-- Correct runtime meter bindings for the canonical meters seeded by the billing core.
insert into private.module_usage_policies(module_key,meter_key,required_permission,requires_contract)
select 'seo_ai',m.key,'seo.manage',true from public.usage_meters m where m.key='ai.tokens'
on conflict(module_key,meter_key) do update set required_permission=excluded.required_permission,requires_contract=excluded.requires_contract,active=true,updated_at=now();

insert into private.module_usage_policies(module_key,meter_key,required_permission,requires_contract)
select 'automation',m.key,'sites.manage',true from public.usage_meters m where m.key='email.sent'
on conflict(module_key,meter_key) do update set required_permission=excluded.required_permission,requires_contract=excluded.requires_contract,active=true,updated_at=now();

insert into private.module_usage_policies(module_key,meter_key,required_permission,requires_contract)
select 'automation',m.key,'sites.manage',true from public.usage_meters m where m.key='sms.sent'
on conflict(module_key,meter_key) do update set required_permission=excluded.required_permission,requires_contract=excluded.requires_contract,active=true,updated_at=now();

create or replace function private.user_has_site_permission(
  p_required_permission text,
  p_site_id uuid
) returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare v_org uuid;
begin
  if auth.uid() is null then return false; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null then return false; end if;
  return private.user_has_permission(p_required_permission,v_org,p_site_id);
end;
$$;

create or replace function public.has_site_permission(
  required_permission text,
  site_scope uuid
) returns boolean
language sql stable security invoker
set search_path=public,private,pg_temp
as $$
  select private.user_has_site_permission(required_permission,site_scope);
$$;

revoke all on function private.user_has_site_permission(text,uuid) from public,anon;
revoke all on function public.has_site_permission(text,uuid) from public,anon;
grant execute on function private.user_has_site_permission(text,uuid) to authenticated;
grant execute on function public.has_site_permission(text,uuid) to authenticated;
