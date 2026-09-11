create or replace function public.get_public_sitemap(p_hostname text)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_hostname text:=lower(trim(trailing '.' from btrim(coalesce(p_hostname,''))));
  v_result jsonb;
begin
  if length(v_hostname)<1 or length(v_hostname)>253 or v_hostname ~ '[/:?#[:space:]]' then
    return jsonb_build_object('canonicalHostname',null,'pages','[]'::jsonb);
  end if;

  select jsonb_build_object(
    'canonicalHostname',coalesce(max(pd.hostname),v_hostname),
    'pages',coalesce(jsonb_agg(jsonb_build_object(
      'slug',p.slug,
      'updatedAt',greatest(p.updated_at,p.published_at),
      'locale',s.primary_locale
    ) order by p.updated_at desc,p.id),'[]'::jsonb)
  )
  into v_result
  from public.site_domains d
  join public.site_environments e on e.id=d.environment_id and e.site_id=d.site_id and e.active=true
  join public.sites s on s.id=d.site_id and s.status='active'
  join public.organizations o on o.id=s.organization_id and o.status='active'
  join public.pages p on p.site_id=s.id and p.status='published'
  left join public.site_domains pd on pd.site_id=d.site_id and pd.environment_id=d.environment_id
    and pd.is_primary=true and pd.verified_at is not null
  where d.hostname=v_hostname
    and d.verified_at is not null
    and lower(coalesce(p.seo->>'noIndex','false'))<>'true';

  return v_result;
end;
$$;

revoke all on function public.get_public_sitemap(text) from public;
grant execute on function public.get_public_sitemap(text) to anon,authenticated;

comment on function public.get_public_sitemap(text) is
  'Returns only canonical sitemap-safe fields for published, indexable pages on a verified active hostname.';
