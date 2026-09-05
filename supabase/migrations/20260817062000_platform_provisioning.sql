-- Transactional provisioning for the RAVA owner control plane.
-- This function creates an organization, its first site, three environments,
-- and enables every core module in one database transaction.

create or replace function public.provision_organization_site(
  organization_name text,
  organization_slug text,
  site_name text,
  site_slug text,
  primary_locale text default 'fa',
  default_currency text default 'IRR',
  site_timezone text default 'Asia/Tehran'
) returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_org public.organizations;
  v_site public.sites;
  v_module record;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not private.user_has_permission('platform.organizations.manage', null, null) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  organization_name := btrim(organization_name);
  organization_slug := lower(btrim(organization_slug));
  site_name := btrim(site_name);
  site_slug := lower(btrim(site_slug));
  primary_locale := btrim(primary_locale);
  default_currency := upper(btrim(default_currency));
  site_timezone := btrim(site_timezone);

  if length(organization_name) < 2 or length(organization_name) > 120 then
    raise exception 'invalid_organization_name' using errcode = '22023';
  end if;
  if organization_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' then
    raise exception 'invalid_organization_slug' using errcode = '22023';
  end if;
  if length(site_name) < 2 or length(site_name) > 120 then
    raise exception 'invalid_site_name' using errcode = '22023';
  end if;
  if site_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' then
    raise exception 'invalid_site_slug' using errcode = '22023';
  end if;
  if primary_locale !~ '^[a-z]{2}(-[A-Z]{2})?$' then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;
  if default_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_currency' using errcode = '22023';
  end if;
  if length(site_timezone) < 3 or length(site_timezone) > 64 then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;

  insert into public.organizations(name, slug, default_locale, created_by)
  values (organization_name, organization_slug, primary_locale, v_actor)
  returning * into v_org;

  insert into public.sites(
    organization_id, name, slug, primary_locale, default_currency, timezone, created_by
  ) values (
    v_org.id, site_name, site_slug, primary_locale, default_currency, site_timezone, v_actor
  ) returning * into v_site;

  insert into public.site_environments(site_id, kind)
  values
    (v_site.id, 'preview'),
    (v_site.id, 'staging'),
    (v_site.id, 'production');

  for v_module in select key from public.module_catalog where core = true and status = 'active'
  loop
    insert into public.site_entitlements(site_id, module_key, status, tier, enabled, updated_by)
    values (v_site.id, v_module.key, 'active', 'core', true, v_actor)
    on conflict (site_id, module_key) do nothing;
  end loop;

  return jsonb_build_object(
    'organization_id', v_org.id,
    'site_id', v_site.id,
    'organization_slug', v_org.slug,
    'site_slug', v_site.slug
  );
end;
$$;

revoke all on function public.provision_organization_site(text,text,text,text,text,text,text) from public;
grant execute on function public.provision_organization_site(text,text,text,text,text,text,text) to authenticated;
