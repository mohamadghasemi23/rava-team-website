create extension if not exists pgcrypto;

create type public.publish_status as enum ('draft','published','hidden','scheduled');
create type public.lead_status as enum ('new','in_progress','replied','closed','spam');
create type public.role_key as enum ('super_admin','admin','content_manager','crm','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.role_key not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status public.publish_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  block_type text not null,
  position integer not null default 0,
  visible boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  alt_text text not null default '',
  width integer,
  height integer,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status public.publish_status not null default 'draft',
  summary text,
  content jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  cover_media_id uuid references public.media_assets(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text,
  message text not null,
  status public.lead_status not null default 'new',
  assigned_to uuid references public.profiles(id),
  internal_notes text,
  source text not null default 'website',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.page_blocks enable row level security;
alter table public.media_assets enable row level security;
alter table public.projects enable row level security;
alter table public.leads enable row level security;
alter table public.site_settings enable row level security;
alter table public.revisions enable row level security;
alter table public.audit_log enable row level security;

-- Public visitors can only read published content. Admin policies are added after auth bootstrap.
create policy "public read published pages" on public.pages for select using (status = 'published');
create policy "public read published projects" on public.projects for select using (status = 'published');

-- Intentionally no public SELECT policy for leads, profiles, audit logs, revisions or settings.
-- Production migration 002 will add role-aware policies after the first Super Admin is provisioned.
