begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  (select count(*)::bigint from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-horizon' and tv.version in (1,2) and tv.status='published'),
  2::bigint,
  'Horizon keeps published versions 1 and 2 for rollback'
);
select is(
  (select layout_blueprint->>'art_direction' from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-horizon' and tv.version=2),
  'horizon-editorial',
  'Horizon v2 declares its independent art direction'
);
select is(
  (select (layout_blueprint->>'renderer_version')::integer from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-horizon' and tv.version=2),
  2,
  'Horizon v2 exposes a versioned renderer contract'
);
select ok(
  exists(select 1 from public.starter_pack_template_compatibility c join public.template_versions tv on tv.id=c.template_version_id join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-horizon' and tv.version=2 and c.active),
  'Horizon v2 is compatible with an active starter pack'
);
select is(
  (select seo_defaults->>'content_policy' from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tc.key='rava-service-horizon' and tv.version=2),
  'verified-facts-only',
  'Horizon v2 keeps the verified facts content policy'
);

select * from finish();
rollback;
