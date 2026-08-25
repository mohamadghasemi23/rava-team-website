begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select ok((select relrowsecurity from pg_class where oid='public.organizations'::regclass), 'organizations has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.sites'::regclass), 'sites has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.memberships'::regclass), 'memberships has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.permission_overrides'::regclass), 'permission_overrides has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.access_invitations'::regclass), 'access_invitations has RLS enabled');

select is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('provision_organization_site','set_permission_override','add_existing_member') and p.prosecdef),
  3::bigint,
  'sensitive platform RPCs remain SECURITY DEFINER'
);

select is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('provision_organization_site','set_permission_override','add_existing_member') and has_function_privilege('anon',p.oid,'EXECUTE')),
  0::bigint,
  'anon cannot execute sensitive platform RPCs'
);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tenant-a@example.test',crypt('test-password-a',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Tenant A"}',now(),now()),
('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tenant-b@example.test',crypt('test-password-b',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Tenant B"}',now(),now()),
('33333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','platform-owner@example.test',crypt('test-password-owner',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Platform Owner"}',now(),now());

-- Security guard triggers deliberately reject privileged fixture writes without an
-- authenticated actor. Use a real test owner instead of disabling those triggers.
update public.profiles
set role = 'super_admin'
where id = '33333333-3333-4333-8333-333333333333';

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);

-- Bootstrap fixture setup through the repository's existing legacy owner bridge,
-- then deliberately remove it before the isolation/escalation assertions.
update public.profiles set role='super_admin' where id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

insert into public.organizations(id,name,slug) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Tenant A','tenant-a'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Tenant B','tenant-b');

insert into public.roles(id,scope_type,organization_id,key,name_fa,name_en) values
('a1000000-0000-4000-8000-000000000001','organization','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','reader-a','خواننده A','Reader A'),
('b1000000-0000-4000-8000-000000000001','organization','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','reader-b','خواننده B','Reader B');

insert into public.role_permissions(role_id,permission_key) values
('a1000000-0000-4000-8000-000000000001','organizations.view'),
('b1000000-0000-4000-8000-000000000001','organizations.view');

insert into public.memberships(id,user_id,scope_type,organization_id,status,joined_at) values
('a2000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','organization','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active',now()),
('b2000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','organization','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','active',now());

insert into public.membership_roles(membership_id,role_id) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001'),
('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001');

update public.profiles set role='viewer' where id='11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.organizations$$,
  array[1::bigint],
  'tenant A sees only its organization'
);

select results_eq(
  $$select count(*)::bigint from public.memberships$$,
  array[1::bigint],
  'tenant A sees only its own membership without access-manager permissions'
);

select ok(
  public.has_permission('organizations.view','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null),
  'tenant A receives its scoped organization permission'
);

select ok(
  not public.has_permission('organizations.view','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null),
  'tenant A does not receive tenant B organization permission'
);

select throws_ok(
  $$select public.set_permission_override('22222222-2222-4222-8222-222222222222','organizations.manage','allow','organization','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'cross tenant escalation',null)$$,
  'P0001',
  'permission denied',
  'tenant A cannot grant a permission in tenant B'
);

select throws_ok(
  $$select public.create_access_invitation('intruder@example.test','organization','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,array['b1000000-0000-4000-8000-000000000001'::uuid],now()+interval '1 day')$$,
  'P0001',
  'permission denied',
  'tenant A cannot create an invitation in tenant B'
);

select throws_ok(
  $$select public.provision_organization_site('Unauthorized Org','unauthorized-org','Unauthorized Site','unauthorized-site','fa','IRR','Asia/Tehran')$$,
  '42501',
  'permission_denied',
  'tenant-scoped user cannot invoke platform provisioning'
);

select * from finish();
rollback;
