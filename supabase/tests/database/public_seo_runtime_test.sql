begin;
create extension if not exists pgtap;
select plan(14);

select is(
  (select prosecdef from pg_proc where oid='public.get_public_sitemap(text)'::regprocedure),
  true,
  'public sitemap resolver remains SECURITY DEFINER'
);
select is(
  has_function_privilege('public','public.get_public_sitemap(text)','EXECUTE'),
  false,
  'PUBLIC cannot execute sitemap resolver'
);
select is(
  has_function_privilege('anon','public.get_public_sitemap(text)','EXECUTE'),
  true,
  'anon can execute constrained sitemap resolver'
);
select is(
  has_table_privilege('anon','public.pages','SELECT'),
  false,
  'anon cannot enumerate pages directly'
);

insert into public.organizations(id,name,slug,status) values
('b1000000-0000-4000-8000-000000000001','SEO Org A','seo-org-a','active'),
('b1000000-0000-4000-8000-000000000002','SEO Org B','seo-org-b','active');

insert into public.sites(id,organization_id,name,slug,status,primary_locale) values
('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','SEO Site A','seo-site-a','active','fa'),
('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','SEO Site B','seo-site-b','active','en');

insert into public.site_environments(id,site_id,kind,active) values
('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','staging',true),
('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','staging',true);

insert into public.site_domains(site_id,environment_id,hostname,is_primary,verified_at) values
('b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','www.seo-a.example.test',true,now()),
('b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','seo-a.example.test',false,now()),
('b2000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002','seo-b.example.test',true,now());

insert into public.pages(id,site_id,title,slug,status,seo,published_at) values
('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','A Public','public-page','published','{}',now()),
('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','A Hidden','hidden-page','published','{"noIndex":true}',now()),
('b4000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','A Draft','draft-page','draft','{}',null),
('b4000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000002','B Public','other-tenant','published','{}',now());

set local role anon;

select is(
  public.get_public_sitemap('seo-a.example.test')->>'canonicalHostname',
  'www.seo-a.example.test',
  'secondary verified hostname resolves to the primary canonical hostname'
);
select is(
  jsonb_array_length(public.get_public_sitemap('seo-a.example.test')->'pages'),
  1,
  'only published indexable pages are included'
);
select is(
  public.get_public_sitemap('seo-a.example.test')->'pages'->0->>'slug',
  'public-page',
  'sitemap exposes the expected Site page'
);
select is(
  public.get_public_sitemap('seo-a.example.test')->'pages'->0->>'locale',
  'fa',
  'sitemap includes the Site primary locale'
);
select is(
  jsonb_array_length(public.get_public_sitemap('seo-b.example.test')->'pages'),
  1,
  'another tenant receives only its own sitemap page'
);
select is(
  public.get_public_sitemap('seo-b.example.test')->'pages'->0->>'slug',
  'other-tenant',
  'same RPC remains tenant isolated by verified hostname'
);
select is(
  jsonb_array_length(public.get_public_sitemap('unknown.example.test')->'pages'),
  0,
  'unknown hostname cannot enumerate public pages'
);
select is(
  public.get_public_sitemap('HTTPS://seo-a.example.test')->>'canonicalHostname',
  null,
  'invalid hostname fails safely'
);
select is(
  jsonb_array_length(public.get_public_sitemap('seo-a.example.test/path')->'pages'),
  0,
  'hostname containing a path fails safely'
);
select is(
  public.get_public_sitemap('SEO-A.EXAMPLE.TEST.')->>'canonicalHostname',
  'www.seo-a.example.test',
  'hostname normalization handles case and a trailing dot'
);

reset role;
select * from finish();
rollback;
