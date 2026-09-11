begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (select count(*)::integer from public.help_topics where key='platform.design.manage' and status='published'),
  1,
  'simplified design experience has one published help topic'
);

select is(
  (select count(*)::integer from public.help_translations ht join public.help_topics t on t.id=ht.topic_id where t.key='platform.design.manage' and ht.locale in ('fa','en')),
  2,
  'simplified design help is bilingual'
);

select ok(
  exists(select 1 from public.help_translations ht join public.help_topics t on t.id=ht.topic_id where t.key='platform.design.manage' and ht.locale='fa' and jsonb_array_length(ht.steps)=4 and ht.body_markdown like '%بخش پیشرفته%'),
  'Persian help explains the simple path and advanced area'
);

select ok(
  exists(select 1 from public.help_context_bindings b join public.help_topics t on t.id=b.topic_id where t.key='platform.design.manage' and b.route_pattern='/admin/platform/sites/:siteId/design'),
  'design help remains bound to the admin route'
);

select * from finish();
rollback;
