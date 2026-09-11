-- A site's public root is an explicit, locale-aware CMS contract. It is not
-- inferred from a mutable slug such as "home".
alter table public.pages
  add constraint pages_id_site_unique unique (id,site_id);

create table public.site_home_pages(
  site_id uuid not null references public.sites(id) on delete cascade,
  locale text not null,
  page_id uuid not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(site_id,locale),
  constraint site_home_pages_locale_valid check(
    locale=lower(locale)
    and length(locale) between 2 and 35
    and locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
  ),
  constraint site_home_pages_page_site_fkey foreign key(page_id,site_id)
    references public.pages(id,site_id) on delete cascade
);

create index site_home_pages_page_idx on public.site_home_pages(page_id);
alter table public.site_home_pages enable row level security;

revoke all on public.site_home_pages from public,anon,authenticated;
grant select on public.site_home_pages to authenticated;

create policy site_home_pages_tenant_read on public.site_home_pages
for select to authenticated
using(private.can_view_site_content(site_id));

create or replace function public.set_site_home_page(
  p_site_id uuid,
  p_locale text,
  p_page_id uuid default null
) returns void
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_locale text:=lower(btrim(coalesce(p_locale,'')));
  v_org uuid;
  v_before jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_site_id is null then raise exception 'invalid site'; end if;
  if length(v_locale)<2 or length(v_locale)>35 or v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$' then
    raise exception 'invalid locale';
  end if;

  select s.organization_id into v_org from public.sites s where s.id=p_site_id;
  if v_org is null then raise exception 'site not found'; end if;
  if not public.has_permission('platform.sites.manage',null,null)
     and not public.has_permission('cms.publish',v_org,p_site_id) then
    raise exception 'permission denied';
  end if;

  select to_jsonb(h) into v_before
  from public.site_home_pages h where h.site_id=p_site_id and h.locale=v_locale;

  if p_page_id is null then
    delete from public.site_home_pages where site_id=p_site_id and locale=v_locale;
  else
    if not exists(select 1 from public.pages p where p.id=p_page_id and p.site_id=p_site_id) then
      raise exception 'page not found in site';
    end if;
    insert into public.site_home_pages(site_id,locale,page_id,created_by,updated_by)
    values(p_site_id,v_locale,p_page_id,auth.uid(),auth.uid())
    on conflict(site_id,locale) do update
      set page_id=excluded.page_id,updated_by=auth.uid(),updated_at=now();
  end if;

  perform public.record_audit_event(
    case when p_page_id is null then 'cms.home_page.unset' else 'cms.home_page.set' end,
    'site_home_page',p_site_id::text||':'||v_locale,v_org,p_site_id,v_before,
    case when p_page_id is null then null else jsonb_build_object('locale',v_locale,'page_id',p_page_id) end,
    '{}'::jsonb,null,null,'notice'
  );
end;
$$;

revoke all on function public.set_site_home_page(uuid,text,uuid) from public,anon;
grant execute on function public.set_site_home_page(uuid,text,uuid) to authenticated;

create or replace function public.get_published_home_page(p_hostname text,p_locale text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_hostname text:=lower(trim(trailing '.' from btrim(coalesce(p_hostname,''))));
  v_locale text:=lower(btrim(coalesce(p_locale,'')));
  v_slug text;
  v_selected_locale text;
  v_canonical_hostname text;
  v_result jsonb;
begin
  if length(v_hostname)<1 or length(v_hostname)>253 or v_hostname ~ '[/:?#[:space:]]' then return null; end if;
  if v_locale<>'' and (length(v_locale)>35 or v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$') then return null; end if;

  select p.slug,h.locale,coalesce((
    select pd.hostname from public.site_domains pd
    where pd.site_id=s.id and pd.environment_id=d.environment_id
      and pd.is_primary=true and pd.verified_at is not null
    limit 1
  ),v_hostname) into v_slug,v_selected_locale,v_canonical_hostname
  from public.site_domains d
  join public.site_environments e on e.id=d.environment_id and e.site_id=d.site_id and e.active=true
  join public.sites s on s.id=d.site_id and s.status='active'
  join public.organizations o on o.id=s.organization_id and o.status='active'
  join public.site_home_pages h on h.site_id=s.id
  join public.pages p on p.id=h.page_id and p.site_id=s.id
  where d.hostname=v_hostname and d.verified_at is not null
  order by
    case when v_locale<>'' and h.locale=v_locale then 0
         when v_locale<>'' and h.locale=split_part(v_locale,'-',1) then 1
         when h.locale=lower(s.primary_locale) then 2 else 3 end,
    h.locale
  limit 1;

  if v_slug is null then return null; end if;
  v_result:=public.get_published_page(v_hostname,v_slug);
  if v_result is null then return null; end if;
  v_result:=jsonb_set(v_result,'{site,locale}',to_jsonb(v_selected_locale),false);
  return jsonb_set(v_result,'{site,canonicalHostname}',to_jsonb(v_canonical_hostname),true);
end;
$$;

revoke all on function public.get_published_home_page(text,text) from public;
grant execute on function public.get_published_home_page(text,text) to anon,authenticated;
