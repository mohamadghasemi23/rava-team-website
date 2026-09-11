begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('44444444-4444-4444-8444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated','provision-owner@example.test',crypt('test-password-owner',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Provision Owner"}',now(),now());

update public.profiles set role='super_admin' where id='44444444-4444-4444-8444-444444444444';
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);

do $$
begin
  perform public.provision_organization_site(
    'RAVA Test Customer','rava-test-customer','RAVA Test Site','rava-test-site','fa','IRR','Asia/Tehran'
  );
end $$;

select results_eq(
  $$select count(*)::bigint from public.organizations where slug='rava-test-customer'$$,
  array[1::bigint],
  'provisioning creates exactly one organization'
);

select results_eq(
  $$select count(*)::bigint from public.sites where slug='rava-test-site'$$,
  array[1::bigint],
  'provisioning creates exactly one site'
);

select results_eq(
  $$select count(*)::bigint from public.site_environments e join public.sites s on s.id=e.site_id where s.slug='rava-test-site'$$,
  array[3::bigint],
  'provisioning creates preview staging and production environments'
);

select results_eq(
  $$select string_agg(e.kind::text,',' order by e.kind::text) from public.site_environments e join public.sites s on s.id=e.site_id where s.slug='rava-test-site'$$,
  array['preview,production,staging'::text],
  'provisioning creates the expected environment kinds'
);

select results_eq(
  $$select count(*)::bigint from public.site_entitlements se join public.sites s on s.id=se.site_id where s.slug='rava-test-site' and se.enabled=true and se.status='active'$$,
  array[(select count(*)::bigint from public.module_catalog where core=true and status='active')],
  'provisioning enables every active core module'
);

select results_eq(
  $$select count(*)::bigint from public.sites s join public.organizations o on o.id=s.organization_id where s.slug='rava-test-site' and o.slug='rava-test-customer' and s.created_by='44444444-4444-4444-8444-444444444444' and o.created_by='44444444-4444-4444-8444-444444444444'$$,
  array[1::bigint],
  'provisioned site remains attached to the organization and audited actor identity'
);

select * from finish();
rollback;
