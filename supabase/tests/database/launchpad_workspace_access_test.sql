begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select is((select name_fa from public.template_catalog where key='rava-service-living-system'),'لانچ‌پد راوا','LaunchPad has its Persian commercial name');
select is((select name_en from public.template_catalog where key='rava-service-living-system'),'RAVA LaunchPad','LaunchPad has its English commercial name');
select ok(not (select is_public from public.template_catalog where key='rava-service-living-system'),'LaunchPad is not a public unrestricted Template');
select ok(not has_function_privilege('anon','public.has_template_workspace_access(uuid,text)','execute'),'anonymous users cannot check Template workspace access');
select ok(has_function_privilege('authenticated','public.has_template_workspace_access(uuid,text)','execute'),'authenticated users can use the guarded workspace check');
select ok(
  pg_get_functiondef('public.has_template_workspace_access(uuid,text)'::regprocedure) like '%site_template_access%',
  'workspace access is tied to explicit Site Template access'
);

insert into auth.users(
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  'a7111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','launchpad-customer@example.test',crypt('test-password-customer',gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}','{"display_name":"LaunchPad Customer"}',now(),now()
),
(
  'a7333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','launchpad-owner@example.test',crypt('test-password-owner',gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}','{"display_name":"LaunchPad Platform Owner"}',now(),now()
);

update public.profiles set role='super_admin' where id='a7333333-3333-4333-8333-333333333333';
select set_config('request.jwt.claim.sub','a7333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"a7333333-3333-4333-8333-333333333333","role":"authenticated"}',true);

insert into public.organizations(id,name,slug)
values('a7aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','LaunchPad Test Organization','launchpad-test-organization');
insert into public.sites(id,organization_id,name,slug,status)
values(
  'a7111111-aaaa-4111-8111-111111111111','a7aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'LaunchPad Test Site','launchpad-test-site','active'
);

do $$
declare
  customer_role uuid;
  launchpad_template uuid;
  launchpad_version uuid;
  launchpad_revision uuid;
begin
  customer_role:=public.create_custom_role(
    'site','launchpad-customer','مشتری لانچ‌پد','LaunchPad Customer','','',
    'a7aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a7111111-aaaa-4111-8111-111111111111',
    array['sites.view','cms.view','cms.manage']
  );
  perform public.add_existing_member(
    'a7111111-1111-4111-8111-111111111111','site',
    'a7aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a7111111-aaaa-4111-8111-111111111111',
    array[customer_role],false
  );

  select id into launchpad_template
  from public.template_catalog where key='rava-service-living-system';
  select id into launchpad_version
  from public.template_versions
  where template_id=launchpad_template and status='published'
  order by version desc limit 1;

  insert into public.site_design_revisions(
    site_id,revision,source,template_id,template_version_id,theme_config,layout_config,created_by
  ) values(
    'a7111111-aaaa-4111-8111-111111111111',1,'template',launchpad_template,launchpad_version,
    '{}'::jsonb,'{}'::jsonb,'a7333333-3333-4333-8333-333333333333'
  ) returning id into launchpad_revision;
  insert into public.site_design_state(
    site_id,current_revision_id,current_template_id,current_template_version_id,updated_by
  ) values(
    'a7111111-aaaa-4111-8111-111111111111',launchpad_revision,launchpad_template,launchpad_version,
    'a7333333-3333-4333-8333-333333333333'
  );

  perform public.set_site_template_access(
    'a7111111-aaaa-4111-8111-111111111111',launchpad_template,true,'purchased'
  );
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','a7111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"a7111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

select ok(
  public.has_template_workspace_access('a7111111-aaaa-4111-8111-111111111111','rava-service-living-system'),
  'entitled Site customer can enter its active LaunchPad workspace'
);
select ok(
  not public.has_template_workspace_access('a7111111-aaaa-4111-8111-111111111111','rava-service-minimal'),
  'customer cannot use a different Template key for the active Site'
);

select set_config('request.jwt.claim.sub','a7333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"a7333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
select public.set_site_template_access(
  'a7111111-aaaa-4111-8111-111111111111',
  (select id from public.template_catalog where key='rava-service-living-system'),
  false,'purchased'
);
select ok(
  public.has_template_workspace_access('a7111111-aaaa-4111-8111-111111111111','rava-service-living-system'),
  'platform owner retains access to the active LaunchPad workspace after customer revocation'
);

select set_config('request.jwt.claim.sub','a7111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"a7111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select ok(
  not public.has_template_workspace_access('a7111111-aaaa-4111-8111-111111111111','rava-service-living-system'),
  'revoked Site customer cannot enter LaunchPad'
);

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select ok(
  not public.has_template_workspace_access('a7111111-aaaa-4111-8111-111111111111','rava-service-living-system'),
  'request without an authenticated identity cannot enter LaunchPad'
);

select * from finish();
rollback;
