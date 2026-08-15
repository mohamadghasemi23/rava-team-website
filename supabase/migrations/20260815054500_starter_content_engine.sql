-- RAVA Starter Content Engine
-- New tenants should never feel empty. Starter/demo content is traceable and removable without touching real content.
create table if not exists public.starter_content_runs(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 archetype text not null,
 locale text not null default 'fa-IR',
 seed text not null,
 pack_version text not null default '1.0.0',
 status text not null default 'completed' check(status in('running','completed','failed','cleared')),
 summary jsonb not null default '{}'::jsonb,
 started_by uuid references public.profiles(id) on delete set null,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 cleared_at timestamptz,
 unique(tenant_id,pack_version)
);
create index if not exists starter_content_runs_tenant_idx on public.starter_content_runs(tenant_id,started_at desc);
alter table public.starter_content_runs enable row level security;
create policy starter_runs_read on public.starter_content_runs for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy starter_runs_manage on public.starter_content_runs for all to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[])) with check(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));

-- Starter data is marked inside existing JSON fields rather than adding brittle columns to every content table.
-- pages.seo._starter, page_blocks.data._starter, projects.content._starter, products.metadata._starter.
-- Real user edits may clear these markers later; cleanup must only target records still explicitly marked starter.
