begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

select ok((select relrowsecurity from pg_class where oid='public.pages'::regclass), 'pages has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.media_assets'::regclass), 'media_assets has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.projects'::regclass), 'projects has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.leads'::regclass), 'leads has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.site_settings'::regclass), 'site_settings has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.revisions'::regclass), 'revisions has RLS enabled');
select is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('can_view_site_content','can_manage_site_resource') and p.prosecdef),
  2::bigint,
  'CMS scope helpers remain SECURITY DEFINER'
);
select is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('can_view_site_content','can_manage_site_resource') and has_function_privilege('anon',p.oid,'EXECUTE')),
  0::bigint,
  'anon cannot execute CMS scope helpers'
);

select ok(
  has_table_privilege('authenticated','public.pages','SELECT'),
  'authenticated receives base pages SELECT for RLS enforcement'
);
select ok(
  not has_table_privilege('anon','public.leads','SELECT')
  and not has_table_privilege('anon','public.media_assets','SELECT')
  and not has_table_privilege('anon','public.site_settings','SELECT')
  and not has_table_privilege('anon','public.revisions','SELECT'),
  'anon has no direct access to private CMS resources'
);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('c1111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cms-a@example.test',crypt('test-password-a',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"CMS Tenant A"}',now(),now()),
('c2222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cms-b@example.test',crypt('test-password-b',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"CMS Tenant B"}',now(),now()),
('c3333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cms-owner@example.test',crypt('test-password-owner',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"CMS Platform Owner"}',now(),now());

update public.profiles set role='super_admin' where id='c3333333-3333-4333-8333-333333333333';
select set_config('request.jwt.claim.sub','c3333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);

insert into public.organizations(id,name,slug) values
('caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','CMS Tenant A','cms-tenant-a'),
('cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','CMS Tenant B','cms-tenant-b');
insert into public.sites(id,organization_id,name,slug) values
('ca111111-1111-4111-8111-111111111111','caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','CMS Site A','main'),
('cb222222-2222-4222-8222-222222222222','cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','CMS Site B','main');

do $$
declare role_a uuid; role_b uuid;
begin
  role_a:=public.create_custom_role(
    'site','cms-editor-a','ویرایشگر CMS A','CMS Editor A','','',
    'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ca111111-1111-4111-8111-111111111111',
    array['sites.view','cms.view','cms.manage','media.manage','leads.view','leads.manage','settings.manage']
  );
  role_b:=public.create_custom_role(
    'site','cms-editor-b','ویرایشگر CMS B','CMS Editor B','','',
    'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cb222222-2222-4222-8222-222222222222',
    array['sites.view','cms.view','cms.manage','media.manage','leads.view','leads.manage','settings.manage']
  );
  perform public.add_existing_member(
    'c1111111-1111-4111-8111-111111111111','site',
    'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ca111111-1111-4111-8111-111111111111',array[role_a],false
  );
  perform public.add_existing_member(
    'c2222222-2222-4222-8222-222222222222','site',
    'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cb222222-2222-4222-8222-222222222222',array[role_b],false
  );
end $$;

insert into public.pages(id,site_id,title,slug,status) values
('ca100000-0000-4000-8000-000000000001','ca111111-1111-4111-8111-111111111111','Home A','home','draft'),
('cb200000-0000-4000-8000-000000000002','cb222222-2222-4222-8222-222222222222','Home B','home','draft'),
('cc300000-0000-4000-8000-000000000003',null,'Legacy Platform Page','legacy-platform','draft');
insert into public.page_blocks(id,page_id,block_type,position,data) values
('ca100000-0000-4000-8000-000000000011','ca100000-0000-4000-8000-000000000001','text',0,'{"text":"A"}'),
('cb200000-0000-4000-8000-000000000012','cb200000-0000-4000-8000-000000000002','text',0,'{"text":"B"}');
insert into public.media_assets(id,site_id,storage_path,file_name,mime_type) values
('ca100000-0000-4000-8000-000000000021','ca111111-1111-4111-8111-111111111111','ca/site-a.webp','site-a.webp','image/webp'),
('cb200000-0000-4000-8000-000000000022','cb222222-2222-4222-8222-222222222222','cb/site-b.webp','site-b.webp','image/webp');
insert into public.projects(id,site_id,title,slug,status,cover_media_id) values
('ca100000-0000-4000-8000-000000000031','ca111111-1111-4111-8111-111111111111','Project A','project','draft','ca100000-0000-4000-8000-000000000021'),
('cb200000-0000-4000-8000-000000000032','cb222222-2222-4222-8222-222222222222','Project B','project','draft','cb200000-0000-4000-8000-000000000022');
insert into public.leads(id,site_id,name,message) values
('ca100000-0000-4000-8000-000000000041','ca111111-1111-4111-8111-111111111111','Lead A','Message A'),
('cb200000-0000-4000-8000-000000000042','cb222222-2222-4222-8222-222222222222','Lead B','Message B');
insert into public.site_settings(site_id,key,value) values
('ca111111-1111-4111-8111-111111111111','brand','{"name":"A"}'),
('cb222222-2222-4222-8222-222222222222','brand','{"name":"B"}');
insert into public.revisions(id,site_id,entity_type,entity_id,snapshot) values
('ca100000-0000-4000-8000-000000000051','ca111111-1111-4111-8111-111111111111','page','ca100000-0000-4000-8000-000000000001','{}'),
('cb200000-0000-4000-8000-000000000052','cb222222-2222-4222-8222-222222222222','page','cb200000-0000-4000-8000-000000000002','{}');

select throws_ok(
  $$insert into public.projects(site_id,title,slug,status,cover_media_id) values('ca111111-1111-4111-8111-111111111111','Cross Cover','cross-cover','draft','cb200000-0000-4000-8000-000000000022')$$,
  '23503',
  'insert or update on table "projects" violates foreign key constraint "projects_cover_media_site_fkey"',
  'project cover media cannot cross site scope'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

select results_eq($$select count(*)::bigint from public.pages$$,array[1::bigint],'tenant A sees only its page');
select results_eq($$select count(*)::bigint from public.page_blocks$$,array[1::bigint],'tenant A sees only blocks from its page');
select results_eq($$select count(*)::bigint from public.media_assets$$,array[1::bigint],'tenant A sees only its media');
select results_eq($$select count(*)::bigint from public.projects$$,array[1::bigint],'tenant A sees only its project');
select results_eq($$select count(*)::bigint from public.leads$$,array[1::bigint],'tenant A sees only its lead');
select results_eq($$select count(*)::bigint from public.site_settings$$,array[1::bigint],'tenant A sees only its site settings');
select results_eq($$select count(*)::bigint from public.revisions$$,array[1::bigint],'tenant A sees only its revisions');
select is_empty($$select id from public.pages where site_id is null$$,'tenant A cannot see legacy unscoped pages');

select throws_ok(
  $$insert into public.pages(site_id,title,slug,status) values('cb222222-2222-4222-8222-222222222222','Tenant B Attack','tenant-b-attack','draft')$$,
  '42501',
  'new row violates row-level security policy for table "pages"',
  'tenant A cannot insert a page into tenant B'
);
select is_empty(
  $$update public.pages set title='Cross Tenant Update' where id='cb200000-0000-4000-8000-000000000002' returning id$$,
  'tenant A cannot update tenant B page'
);
select lives_ok(
  $$insert into public.pages(site_id,title,slug,status) values('ca111111-1111-4111-8111-111111111111','Second A Page','shared-slug','draft')$$,
  'tenant A can create a page in its own site'
);
select lives_ok(
  $$insert into public.projects(site_id,title,slug,status) values('ca111111-1111-4111-8111-111111111111','Second A Project','shared-project','draft')$$,
  'tenant A can create a project in its own site'
);

select * from finish();
rollback;
