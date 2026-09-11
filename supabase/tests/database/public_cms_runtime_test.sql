begin;
create extension if not exists pgtap;
select plan(15);

select is((select prosecdef from pg_proc where oid='public.get_published_page(text,text)'::regprocedure),true,'public page resolver remains SECURITY DEFINER');
select is(has_function_privilege('public','public.get_published_page(text,text)','EXECUTE'),false,'PUBLIC cannot execute page resolver');
select is(has_function_privilege('anon','public.get_published_page(text,text)','EXECUTE'),true,'anon can execute constrained page resolver');
select is(has_table_privilege('anon','public.pages','SELECT'),false,'anon cannot enumerate pages directly');
select is(has_table_privilege('anon','public.page_blocks','SELECT'),false,'anon cannot enumerate page blocks directly');

insert into public.organizations(id,name,slug,status) values
('a1000000-0000-4000-8000-000000000001','Public Org A','public-org-a','active'),
('a1000000-0000-4000-8000-000000000002','Public Org B','public-org-b','active');
insert into public.sites(id,organization_id,name,slug,status) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Public Site A','public-site-a','active'),
('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Public Site B','public-site-b','active');
insert into public.site_environments(id,site_id,kind,active) values
('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','staging',true),
('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','staging',true);
insert into public.site_domains(site_id,environment_id,hostname,is_primary,verified_at) values
('a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a.example.test',true,now()),
('a2000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000002','b.example.test',true,now());
insert into public.pages(id,site_id,title,slug,status) values
('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','A Services','services','published'),
('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','B Services','services','published'),
('a4000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000001','A Draft','draft-page','draft');
insert into public.page_blocks(page_id,block_type,position,visible,data) values
('a4000000-0000-4000-8000-000000000001','hero',0,true,'{"title":"Visible A"}'),
('a4000000-0000-4000-8000-000000000001','text',1,false,'{"title":"Hidden A"}'),
('a4000000-0000-4000-8000-000000000002','hero',0,true,'{"title":"Visible B"}');

set local role anon;
select is(public.get_published_page('a.example.test','services')->'page'->>'title','A Services','hostname resolves only its own page');
select is(public.get_published_page('a.example.test','services')->'site'->>'templateKey','rava-service-minimal','public payload has a safe renderer fallback');
select is(public.get_published_page('a.example.test','services')->'site'->>'templateVersion','1','public payload has a safe template-version fallback');
select is(public.get_published_page('b.example.test','services')->'page'->>'title','B Services','same slug remains tenant isolated');
select is(jsonb_array_length(public.get_published_page('a.example.test','services')->'blocks'),1,'hidden blocks are excluded');
select is(public.get_published_page('a.example.test','services')->'blocks'->0->'data'->>'title','Visible A','visible block data is returned');
select is(public.get_published_page('a.example.test','draft-page'),null,'draft pages are not public');
select is(public.get_published_page('unknown.example.test','services'),null,'unknown hostname returns no content');
select is(public.get_published_page('a.example.test/unsafe','services'),null,'invalid hostname fails safely');
select is(public.get_published_page('a.example.test','bad/slug'),null,'invalid slug fails safely');

reset role;
select * from finish();
rollback;
