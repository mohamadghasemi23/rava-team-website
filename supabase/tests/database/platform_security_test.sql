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

-- Use an authenticated platform owner to seed fixtures through the same secure RPCs
-- the application uses. RLS/guard triggers remain enabled throughout the test.
update public.profiles set role='super_admin' where id='33333333-3333-4333-8333-333333333333';
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);

insert into public.organizations(id,name,slug) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Tenant A','tenant-a'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Tenant B','tenant-b');

do $$
declare
  role_a uuid;
  role_b uuid;
begin
  role_a := public.create_custom_role(
    'organization','reader-a','خواننده A','Reader A','','',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,array['organizations.view']
  );
  role_b := public.create_custom_role(
    'organization','reader-b','خواننده B','Reader B','','',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,array['organizations.view']
  );
  perform public.add_existing_member(
    '11111111-1111-4111-8111-111111111111','organization',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,array[role_a],false
  );
  perform public.add_existing_member(
    '22222222-2222-4222-8222-222222222222','organization',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,array[role_b],false
  );
end $$;

-- Drop to a normal tenant-scoped user for the actual isolation/escalation assertions.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

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
  $$select public.create_access_invitation('intruder@example.test','organization','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'{}'::uuid[],now()+interval '1 day')$$,
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
