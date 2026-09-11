begin;
create extension if not exists pgtap;
select plan(11);

select has_table('public','site_home_pages','site homepage mapping exists');
select is((select relrowsecurity from pg_class where oid='public.site_home_pages'::regclass),true,'site homepage mapping uses RLS');
select has_function('public','get_published_home_page',array['text','text'],'public homepage resolver exists');
select has_function('public','set_site_home_page',array['uuid','text','uuid'],'audited homepage setter exists');
select is(has_function_privilege('anon','public.get_published_home_page(text,text)','EXECUTE'),true,'anon can resolve a published homepage');
select is(has_function_privilege('anon','public.set_site_home_page(uuid,text,uuid)','EXECUTE'),false,'anon cannot mutate homepage mapping');

insert into public.organizations(id,name,slug,status)
values('91000000-0000-0000-0000-000000000001','Homepage test org','homepage-test-org','active');
insert into public.sites(id,organization_id,name,slug,status,primary_locale)
values('91000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','Homepage test','homepage-test','active','fa');
insert into public.site_environments(id,site_id,kind,active)
values('91000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000002','production',true);
insert into public.site_domains(id,site_id,environment_id,hostname,is_primary,verified_at)
values('91000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000003','homepage.example.test',true,now());
insert into public.pages(id,site_id,title,slug,status,published_at)
values
('91000000-0000-0000-0000-000000000005','91000000-0000-0000-0000-000000000002','خانه','khane','published',now()),
('91000000-0000-0000-0000-000000000006','91000000-0000-0000-0000-000000000002','Home','welcome','published',now()),
('91000000-0000-0000-0000-000000000007','91000000-0000-0000-0000-000000000002','Draft','draft-home','draft',null);
insert into public.site_home_pages(site_id,locale,page_id)
values
('91000000-0000-0000-0000-000000000002','fa','91000000-0000-0000-0000-000000000005'),
('91000000-0000-0000-0000-000000000002','en','91000000-0000-0000-0000-000000000006');

select is(public.get_published_home_page('homepage.example.test','en-US')->'page'->>'slug','welcome','requested language wins for a regional browser locale');
select is(public.get_published_home_page('homepage.example.test','en-US')->'site'->>'canonicalHostname','homepage.example.test','homepage payload includes its canonical hostname without another public query');
select is(public.get_published_home_page('homepage.example.test','de')->'page'->>'slug','khane','primary locale is the fallback');
select is(public.get_published_home_page('unknown.example.test','fa'),null,'unknown hosts do not leak a homepage');

update public.site_home_pages set page_id='91000000-0000-0000-0000-000000000007' where site_id='91000000-0000-0000-0000-000000000002' and locale='fa';
select is(public.get_published_home_page('homepage.example.test','fa'),null,'a draft homepage is never public');

select * from finish();
rollback;
