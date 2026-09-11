begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select ok((select relrowsecurity from pg_class where oid='public.starter_pack_installations'::regclass),'installations have RLS');
select ok((select relrowsecurity from pg_class where oid='public.starter_pack_installation_items'::regclass),'installation items have RLS');
select ok((select relrowsecurity from pg_class where oid='public.starter_pack_installation_attempts'::regclass),'installation attempts have RLS');
select ok(not has_table_privilege('anon','public.starter_pack_installations','SELECT'),'anon cannot read installations');
select ok(not has_table_privilege('anon','public.starter_pack_installation_attempts','SELECT'),'anon cannot read installation attempts');
select ok(has_table_privilege('authenticated','public.starter_pack_installations','SELECT')
  and not has_table_privilege('authenticated','public.starter_pack_installations','INSERT')
  and not has_table_privilege('authenticated','public.starter_pack_installations','UPDATE')
  and not has_table_privilege('authenticated','public.starter_pack_installations','DELETE'),'authenticated installation tables are read-only before RLS');
select ok(not has_function_privilege('anon','public.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb)','EXECUTE'),'anon cannot execute installer');
select ok(not has_function_privilege('authenticated','private.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb)','EXECUTE'),'authenticated cannot bypass the observed installer');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('e1111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','install-owner@example.test',crypt('test-password',gen_salt('bf')),now(),'{}','{"display_name":"Install Owner"}',now(),now()),
('e2222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','install-outsider@example.test',crypt('test-password',gen_salt('bf')),now(),'{}','{"display_name":"Install Outsider"}',now(),now());
update public.profiles set role='super_admin' where id='e1111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','e1111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

select public.provision_organization_site('Install Org A','install-org-a','Install Site A','install-site-a','fa','IRR','Asia/Tehran');
select public.provision_organization_site('Install Org B','install-org-b','Install Site B','install-site-b','fa','IRR','Asia/Tehran');
select public.provision_organization_site('Install Org C','install-org-c','Install Site C','install-site-c','fa','IRR','Asia/Tehran');
create temp table test_scope_ids as select id site_b_id from public.sites where slug='install-site-b';

create temp table test_install_a as
select public.install_starter_pack(
  (select id from public.sites where slug='install-site-a'),
  (select v.id from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1),
  (select v.id from public.template_versions v join public.template_catalog t on t.id=v.template_id where t.key='rava-service-minimal' and v.version=1),
  'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',array['fa','en'],jsonb_build_object('name','RAVA Test Brand')
) result;

select is((select result->>'status' from test_install_a),'installed','compatible pack installs');
select is((select count(*)::bigint from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-a'),18::bigint,'bilingual install creates eighteen pages');
select is((select count(*)::bigint from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-a' and p.status='draft'),18::bigint,'installer creates Draft pages only');
select is((select count(*)::bigint from public.starter_pack_installation_items i join public.starter_pack_installations x on x.id=i.installation_id join public.sites s on s.id=x.site_id where s.slug='install-site-a'),18::bigint,'installation snapshots every page');
select is((select title from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-a' and p.slug='home-en'),'RAVA Test Brand, your digital partner','verified brand name replaces title placeholder');
reset role;
select is((select count(*)::bigint from public.starter_pack_installation_items i where i.installed_snapshot_hash<>private.starter_page_snapshot_hash(i.entity_id)),0::bigint,'installed page hashes match snapshots');
select throws_ok(
  $$update public.starter_pack_installations set brand_inputs='{}' where id=(select (result->>'installation_id')::uuid from test_install_a)$$,
  'P0001','starter installation snapshot is immutable','installation version and customer-input snapshot cannot be rewritten'
);
select throws_ok(
  $$delete from public.starter_pack_installation_items where installation_id=(select (result->>'installation_id')::uuid from test_install_a)$$,
  'P0001','starter installation items are immutable','installation entity snapshot cannot be deleted'
);
set local role authenticated;
select is((select t.key from public.site_design_state sds join public.sites s on s.id=sds.site_id join public.template_catalog t on t.id=sds.current_template_id where s.slug='install-site-a'),'rava-service-minimal','selected compatible Template becomes the design draft');
select is((select count(*)::bigint from public.audit_log a join public.sites s on s.id=a.site_id where s.slug='install-site-a' and a.action='starter_pack.installed'),1::bigint,'installation is audited');
select is((select count(*)::bigint from public.starter_pack_installation_attempts a join public.sites s on s.id=a.site_id where s.slug='install-site-a' and a.outcome='succeeded'),1::bigint,'successful installation attempt is journaled');

select public.install_starter_pack(
  (select id from public.sites where slug='install-site-a'),
  (select v.id from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1),
  (select v.id from public.template_versions v join public.template_catalog t on t.id=v.template_id where t.key='rava-service-minimal' and v.version=1),
  'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',array['fa','en'],jsonb_build_object('name','RAVA Test Brand')
);
select is((select count(*)::bigint from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-a'),18::bigint,'idempotent replay creates no duplicate pages');
select is((select count(*)::bigint from public.audit_log a join public.sites s on s.id=a.site_id where s.slug='install-site-a' and a.action='starter_pack.install.retried'),1::bigint,'idempotent retry is audited');

select is(
  (public.install_starter_pack((select id from public.sites where slug='install-site-b'),(select v.id from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1),(select v.id from public.template_versions v join public.template_catalog t on t.id=v.template_id where t.key='rava-commerce-modern' and v.version=1),'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',array['fa'],'{}')->>'error_code'),
  'incompatible_template','incompatible Template returns a safe failure code'
);
select is((select count(*)::bigint from public.starter_pack_installation_attempts a join public.sites s on s.id=a.site_id where s.slug='install-site-b' and a.outcome='failed' and a.error_code='incompatible_template'),1::bigint,'authorized failure is persisted with a sanitized code');
select is((select count(*)::bigint from public.audit_log a join public.sites s on s.id=a.site_id where s.slug='install-site-b' and a.action='starter_pack.install.failed'),1::bigint,'authorized installation failure is audited');
select ok(
  not exists(select 1 from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-b')
  and not exists(select 1 from public.site_design_state d join public.sites s on s.id=d.site_id where s.slug='install-site-b'),
  'failed installation leaves no partial pages or design state'
);

select set_config('request.jwt.claim.sub','e2222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select throws_ok(
  $$select public.install_starter_pack((select site_b_id from test_scope_ids),(select v.id from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1),(select v.id from public.template_versions v join public.template_catalog t on t.id=v.template_id where t.key='rava-service-minimal' and v.version=1),'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',array['fa'],'{}')$$,
  '42501','permission_denied','cross-tenant user cannot forge a scoped installation failure'
);
select throws_ok(
  $$select public.preview_starter_pack_rollback((select (result->>'installation_id')::uuid from test_install_a))$$,
  '42501','permission_denied','cross-tenant user cannot preview rollback'
);

select set_config('request.jwt.claim.sub','e1111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select is((select count(*)::bigint from public.starter_pack_installation_attempts a join public.sites s on s.id=a.site_id where s.slug='install-site-b'),1::bigint,'denied cross-tenant request creates no forged attempt record');
update public.pages set title='Customer edited title' where site_id=(select id from public.sites where slug='install-site-a') and slug='home';
select is((public.preview_starter_pack_rollback((select (result->>'installation_id')::uuid from test_install_a))->>'can_rollback')::boolean,false,'rollback preview detects customer edits');
select throws_ok(
  $$select public.rollback_starter_pack_installation((select (result->>'installation_id')::uuid from test_install_a))$$,
  '55000','starter_content_changed_since_installation','rollback refuses to delete edited customer content'
);

create temp table test_install_b as
select public.install_starter_pack(
  (select id from public.sites where slug='install-site-b'),
  (select v.id from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1),
  (select v.id from public.template_versions v join public.template_catalog t on t.id=v.template_id where t.key='rava-service-minimal' and v.version=1),
  'eccccccc-cccc-4ccc-8ccc-cccccccccccc',array['fa'],'{}'
) result;
select is((public.rollback_starter_pack_installation((select (result->>'installation_id')::uuid from test_install_b))->>'status'),'rolled_back','untouched installation rolls back');
select is((select count(*)::bigint from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-b'),0::bigint,'rollback removes only untouched installed pages');

create temp table test_install_c as
select public.install_starter_pack(
  (select id from public.sites where slug='install-site-c'),
  (select v.id from public.starter_content_pack_versions v join public.starter_content_packs p on p.id=v.starter_pack_id where p.key='services.digital-agency.rava-team' and v.version=1),
  (select v.id from public.template_versions v join public.template_catalog t on t.id=v.template_id where t.key='rava-service-minimal' and v.version=1),
  'eddddddd-dddd-4ddd-8ddd-dddddddddddd',array['fa'],'{}'
) result;
select is((public.approve_starter_pack_installation((select (result->>'installation_id')::uuid from test_install_c))->>'status'),'approved','human approval records an approved installation without publishing');
select is((select count(*)::bigint from public.pages p join public.sites s on s.id=p.site_id where s.slug='install-site-c' and p.status='published'),0::bigint,'approval does not publish content');

select * from finish();
rollback;
