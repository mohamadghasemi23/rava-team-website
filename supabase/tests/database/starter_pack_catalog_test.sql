begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select is(
  (select count(*)::bigint from pg_class where oid in (
    'public.site_types'::regclass,'public.site_type_versions'::regclass,'public.industry_packs'::regclass,
    'public.industry_pack_versions'::regclass,'public.starter_content_packs'::regclass,
    'public.starter_content_pack_versions'::regclass,'public.starter_pack_template_compatibility'::regclass
  ) and relrowsecurity),7::bigint,'all starter catalog tables have RLS enabled'
);
select ok(
  not has_table_privilege('anon','public.site_types','SELECT')
  and not has_table_privilege('anon','public.starter_content_pack_versions','SELECT'),
  'anon has no starter catalog table access'
);
select ok(
  has_table_privilege('authenticated','public.starter_content_pack_versions','SELECT')
  and not has_table_privilege('authenticated','public.starter_content_pack_versions','INSERT')
  and not has_table_privilege('authenticated','public.starter_content_pack_versions','UPDATE')
  and not has_table_privilege('authenticated','public.starter_content_pack_versions','DELETE'),
  'authenticated catalog access is read-only before RLS'
);
select results_eq($$select count(*)::bigint from public.site_types where key='services' and status='active'$$,array[1::bigint],'services site type is active');
select results_eq($$select count(*)::bigint from public.industry_packs where key='services.digital-agency' and status='active'$$,array[1::bigint],'digital agency industry is active');
select results_eq($$select count(*)::bigint from public.starter_content_packs where key='services.digital-agency.rava-team' and status='active'$$,array[1::bigint],'RAVA services starter pack is active');
select results_eq(
  $$select jsonb_array_length(manifest->'locales'->'fa'->'pages') from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1$$,
  array[9],'Persian manifest contains nine service-site page blueprints'
);
select results_eq(
  $$select jsonb_array_length(manifest->'locales'->'en'->'pages') from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1$$,
  array[9],'English manifest contains nine service-site page blueprints'
);
select is(
  (select count(*)::bigint from public.starter_content_pack_versions v cross join lateral jsonb_array_elements(v.manifest->'locales'->'fa'->'pages') p where p->>'status'<>'draft' or coalesce((p->>'requires_customer_verification')::boolean,false)=false),
  0::bigint,'every Persian page is draft and requires verification'
);
select is(
  (select count(*)::bigint from public.starter_content_pack_versions v cross join lateral jsonb_array_elements(v.manifest->'locales'->'en'->'pages') p where p->>'status'<>'draft' or coalesce((p->>'requires_customer_verification')::boolean,false)=false),
  0::bigint,'every English page is draft and requires verification'
);
select results_eq(
  $$select count(*)::bigint from public.starter_pack_template_compatibility c join public.template_versions tv on tv.id=c.template_version_id join public.template_catalog t on t.id=tv.template_id where c.is_default and c.active and t.key='rava-service-minimal'$$,
  array[1::bigint],'starter pack has one compatible default service template'
);
select is(
  (select count(*)::bigint from public.starter_content_pack_versions where content_hash<>encode(digest(manifest::text,'sha256'),'hex')),
  0::bigint,'stored content hashes match immutable manifests'
);
select throws_ok(
  $$update public.starter_content_pack_versions set manifest=jsonb_set(manifest,'{tampered}','true') where status='published'$$,
  'P0001','published pack version content is immutable','published starter manifests cannot be edited'
);
select throws_ok(
  $$delete from public.starter_content_pack_versions where status='published'$$,
  'P0001','published pack version is immutable','published starter manifests cannot be deleted'
);
select throws_ok(
  $$insert into public.starter_pack_template_compatibility(starter_pack_version_id,template_version_id) select spv.id,tv.id from public.starter_content_pack_versions spv join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team' join public.template_catalog tc on tc.key='rava-commerce-modern' join public.template_versions tv on tv.template_id=tc.id and tv.version=1 where spv.version=1$$,
  'P0001','template is incompatible with starter pack','commerce template cannot bind to service starter pack'
);
select results_eq(
  $$select count(*)::bigint from public.help_topics h join public.help_translations t on t.topic_id=h.id where h.key='starter.pack.catalog' and t.locale in ('fa','en')$$,
  array[2::bigint],'starter pack catalog has Persian and English help'
);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('d1111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pack-viewer@example.test',crypt('test-password',gen_salt('bf')),now(),'{}','{"display_name":"Pack Viewer"}',now(),now()),
('d2222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pack-owner@example.test',crypt('test-password',gen_salt('bf')),now(),'{}','{"display_name":"Pack Owner"}',now(),now());
update public.profiles set role='super_admin' where id='d2222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claim.sub','d1111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select is_empty($$select id from public.starter_content_packs$$,'authenticated user without permission cannot read starter packs');
select set_config('request.jwt.claim.sub','d2222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select results_eq($$select count(*)::bigint from public.starter_content_packs where key='services.digital-agency.rava-team'$$,array[1::bigint],'platform owner can read the active starter pack through RLS');

select * from finish();
rollback;
