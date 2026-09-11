begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (select count(*)::integer from public.help_topics where key in ('platform.sites.manage','platform.observability.review') and status='published'),
  2,
  'remaining core admin routes have published help topics'
);
select is(
  (select count(*)::integer from public.help_translations t join public.help_topics h on h.id=t.topic_id where h.key in ('platform.sites.manage','platform.observability.review') and t.locale in ('fa','en')),
  4,
  'core admin help topics have Persian and English translations'
);
select is(
  (select count(*)::integer from public.help_context_bindings b join public.help_topics h on h.id=b.topic_id where h.key='platform.sites.manage' and b.route_pattern='/admin/platform/sites*'),
  1,
  'site management route has contextual help'
);
select is(
  (select count(*)::integer from public.help_context_bindings b join public.help_topics h on h.id=b.topic_id where h.key='platform.observability.review' and b.route_pattern in ('/admin/system/logs*','/admin/system/errors*')),
  2,
  'logs and errors routes have contextual help'
);

select * from finish();
rollback;
