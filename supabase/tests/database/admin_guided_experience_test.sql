begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (select count(*)::bigint from public.help_topics where key='admin.guided_experience' and status='published'),
  1::bigint,
  'guided admin experience has one published help topic'
);
select is(
  (select count(*)::bigint from public.help_translations t join public.help_topics h on h.id=t.topic_id where h.key='admin.guided_experience' and t.locale in('fa','en')),
  2::bigint,
  'guided admin experience has Persian and English help'
);
select is(
  (select count(*)::bigint from public.help_context_bindings b join public.help_topics h on h.id=b.topic_id where h.key='admin.guided_experience' and b.route_pattern='/admin'),
  1::bigint,
  'dashboard contextual help binding exists'
);
select ok(
  (select jsonb_array_length(steps)>=8 from public.help_translations t join public.help_topics h on h.id=t.topic_id where h.key='admin.guided_experience' and t.locale='fa'),
  'Persian setup help includes the complete numbered journey'
);

select * from finish();
rollback;
