-- Resolve a public hostname to safe tenant metadata without exposing private tenant fields.
create or replace function public.resolve_public_tenant(p_hostname text)
returns table(id uuid,name text,slug text,status text,site_archetype text,default_locale text,currency text)
language sql stable security definer set search_path=public as $$
  select t.id,t.name,t.slug,t.status,t.site_archetype,t.default_locale,t.currency
  from public.tenants t
  where t.id=coalesce(
    (select d.tenant_id from public.tenant_domains d where lower(d.hostname)=lower(split_part(coalesce(p_hostname,''),':',1)) and d.verified=true order by d.primary_domain desc limit 1),
    '00000000-0000-4000-8000-000000000001'::uuid
  )
  and t.status<>'archived'
  limit 1
$$;
revoke all on function public.resolve_public_tenant(text) from public;
grant execute on function public.resolve_public_tenant(text) to anon,authenticated;
