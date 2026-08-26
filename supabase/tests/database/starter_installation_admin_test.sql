begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select ok(has_function_privilege('authenticated','public.get_site_starter_options(uuid)','EXECUTE'),'authenticated can call site-scoped starter catalog');
select ok(not has_function_privilege('anon','public.get_site_starter_options(uuid)','EXECUTE'),'anon cannot call site-scoped starter catalog');
select is((select count(*)::bigint from public.help_context_bindings b join public.help_topics t on t.id=b.topic_id where b.route_pattern='/admin/platform/sites/:siteId/starter*' and t.key in ('starter.pack.catalog','starter.pack.installation')),2::bigint,'wizard has contextual Help bindings');
select is((select count(*)::bigint from public.academy_course_translations tr join public.academy_courses c on c.id=tr.course_id where c.key='services.site.setup' and c.status='published' and tr.locale in ('fa','en')),2::bigint,'setup Academy course is published in Persian and English');
select is((select count(*)::bigint from public.academy_course_topics ct join public.academy_courses c on c.id=ct.course_id where c.key='services.site.setup'),2::bigint,'Academy course contains both starter lessons');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('f1111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wizard-owner@example.test',crypt('test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
('f2222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wizard-outsider@example.test',crypt('test-password',gen_salt('bf')),now(),'{}','{}',now(),now());
update public.profiles set role='super_admin' where id='f1111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select public.provision_organization_site('Wizard Org','wizard-org','Wizard Site','wizard-site','fa','IRR','Asia/Tehran');
create temp table wizard_scope as select id site_id from public.sites where slug='wizard-site';
create temp table wizard_options as select public.get_site_starter_options((select site_id from wizard_scope)) value;

select ok(jsonb_array_length((select value from wizard_options))>0,'authorized site owner receives compatible options');
select is((select value->0->'site_type'->>'key' from wizard_options),'services','wizard returns the service site type');
select is((select value->0->'template'->>'key' from wizard_options),'rava-service-minimal','wizard returns the compatible service template');
select ok((select (value->0->'pack'->'manifest'->'locales') ?& array['fa','en'] from wizard_options),'preview manifest contains both supported locales');
select ok(not exists(select 1 from jsonb_array_elements((select value from wizard_options)) item where item->'template'->>'key'='rava-commerce-modern'),'incompatible commerce template is never exposed');

select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select throws_ok($$select public.get_site_starter_options((select site_id from wizard_scope))$$,'42501','permission_denied','cross-tenant user cannot enumerate starter options');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.get_site_starter_options((select site_id from wizard_scope))$$,'42501','authentication_required','missing authenticated identity is rejected');

select * from finish();
rollback;
