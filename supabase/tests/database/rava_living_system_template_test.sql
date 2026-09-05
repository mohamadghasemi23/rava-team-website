begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(
  (select count(*)::bigint from public.template_catalog where key='rava-service-living-system' and status='active' and is_public),
  1::bigint,
  'Living System is an active discoverable Template'
);

select is(
  (select count(*)::bigint from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-living-system' and tv.version=1 and tv.status='published'),
  1::bigint,
  'Living System has one published immutable version'
);

select is(
  (select layout_blueprint->>'renderer' from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-living-system' and tv.version=1),
  'living-system',
  'Living System declares its dedicated renderer'
);

select is(
  (select layout_blueprint->>'default_menu_state' from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-living-system' and tv.version=1),
  'closed',
  'Living System records the approved closed default navigation state'
);

select ok(
  exists(select 1 from public.starter_pack_template_compatibility c join public.template_versions tv on tv.id=c.template_version_id join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-living-system' and tv.version=1 and c.active),
  'Living System is compatible with an active starter pack'
);

select is(
  (select seo_defaults->>'content_policy' from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-living-system' and tv.version=1),
  'verified-facts-only',
  'Living System keeps the verified facts SEO policy'
);

select * from finish();
rollback;
