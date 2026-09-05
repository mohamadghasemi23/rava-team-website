begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
select ok(exists(select 1 from public.permissions where key='seo.ai.generate' and module_key='seo_ai'),'AI SEO permission is registered');
select is((select count(*)::integer from public.help_topics where key='seo.ai.owner_assistant' and status='published'),1,'AI SEO help topic is published');
select is((select count(*)::integer from public.help_translations ht join public.help_topics h on h.id=ht.topic_id where h.key='seo.ai.owner_assistant'),2,'AI SEO help is bilingual');
select ok(exists(select 1 from public.help_context_bindings b join public.help_topics h on h.id=b.topic_id where h.key='seo.ai.owner_assistant' and b.route_pattern='/admin/pages/:id'),'AI SEO help is bound to page editor');
select * from finish();
rollback;
