create extension if not exists pgcrypto;

-- RAVA Website V1
-- Focused agency website schema. This is NOT a website-builder or multi-tenant CMS.

create type public.admin_role as enum ('admin', 'editor');
create type public.lead_status as enum ('new', 'in_progress', 'replied', 'closed', 'spam');
create type public.project_kind as enum ('real', 'concept');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.admin_role not null default 'editor',
  active boolean not null default true,
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
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.site_content (
  section_key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  content jsonb not null default '{}'::jsonb,
  icon_key text,
  sort_order integer not null default 0,
  published boolean not null default false,
  seo_title text,
  seo_description text,
  canonical_url text,
  og_media_id uuid references public.media_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  project_kind public.project_kind not null default 'real',
  published boolean not null default false,
  summary text not null default '',
  content jsonb not null default '{}'::jsonb,
  client_name text,
  project_year integer,
  role_text text,
  scope jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  cover_media_id uuid references public.media_assets(id),
  featured boolean not null default false,
  show_on_home boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  og_media_id uuid references public.media_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_media (
  project_id uuid not null references public.projects(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  caption text,
  primary key (project_id, media_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  service_interest text,
  message text not null,
  status public.lead_status not null default 'new',
  internal_notes text,
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.page_views_daily (
  day date not null,
  path text not null,
  views bigint not null default 0 check (views >= 0),
  unique_estimate bigint not null default 0 check (unique_estimate >= 0),
  primary key (day, path)
);

-- Server-only abuse protection. Never exposed through public RLS policies.
create table public.rate_limit_buckets (
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (key_hash, window_start)
);

create index projects_home_order_idx on public.projects (show_on_home, sort_order) where published = true;
create index services_public_order_idx on public.services (sort_order) where published = true;
create index leads_status_created_idx on public.leads (status, created_at desc);
create index page_views_day_idx on public.page_views_daily (day desc);
create index rate_limit_window_idx on public.rate_limit_buckets (window_start);

create or replace function public.consume_contact_rate_limit(
  p_key_hash text,
  p_window_start timestamptz,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted integer;
begin
  insert into public.rate_limit_buckets (key_hash, window_start, request_count)
  values (p_key_hash, p_window_start, 1)
  on conflict (key_hash, window_start)
  do update set request_count = public.rate_limit_buckets.request_count + 1
  where public.rate_limit_buckets.request_count < p_limit
  returning request_count into accepted;

  return accepted is not null;
end;
$$;

create or replace function public.is_rava_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('admin', 'editor')
  );
$$;

create or replace function public.is_rava_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_content enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.project_media enable row level security;
alter table public.leads enable row level security;
alter table public.site_settings enable row level security;
alter table public.page_views_daily enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy "public read site content" on public.site_content for select to anon, authenticated using (true);
create policy "public read published services" on public.services for select to anon, authenticated using (published = true);
create policy "public read published projects" on public.projects for select to anon, authenticated using (published = true);
create policy "public read media metadata" on public.media_assets for select to anon, authenticated using (deleted_at is null);
create policy "public read published project media" on public.project_media for select to anon, authenticated using (exists (select 1 from public.projects p where p.id = project_media.project_id and p.published = true));
create policy "public read public settings" on public.site_settings for select to anon, authenticated using (is_public = true);

create policy "staff manage media" on public.media_assets for all to authenticated using (public.is_rava_staff()) with check (public.is_rava_staff());
create policy "staff manage site content" on public.site_content for all to authenticated using (public.is_rava_staff()) with check (public.is_rava_staff());
create policy "staff manage services" on public.services for all to authenticated using (public.is_rava_staff()) with check (public.is_rava_staff());
create policy "staff manage projects" on public.projects for all to authenticated using (public.is_rava_staff()) with check (public.is_rava_staff());
create policy "staff manage project media" on public.project_media for all to authenticated using (public.is_rava_staff()) with check (public.is_rava_staff());
create policy "staff read leads" on public.leads for select to authenticated using (public.is_rava_staff());
create policy "staff update leads" on public.leads for update to authenticated using (public.is_rava_staff()) with check (public.is_rava_staff());
create policy "staff read analytics" on public.page_views_daily for select to authenticated using (public.is_rava_staff());
create policy "staff read settings" on public.site_settings for select to authenticated using (public.is_rava_staff());
create policy "admin manage settings" on public.site_settings for all to authenticated using (public.is_rava_admin()) with check (public.is_rava_admin());
create policy "staff read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_rava_admin());
create policy "admin manage profiles" on public.profiles for all to authenticated using (public.is_rava_admin()) with check (public.is_rava_admin());

-- Media bucket: public read for website assets, staff-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rava-media', 'rava-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "rava media staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'rava-media' and public.is_rava_staff());
create policy "rava media staff update" on storage.objects for update to authenticated using (bucket_id = 'rava-media' and public.is_rava_staff()) with check (bucket_id = 'rava-media' and public.is_rava_staff());
create policy "rava media staff delete" on storage.objects for delete to authenticated using (bucket_id = 'rava-media' and public.is_rava_staff());

-- No anonymous INSERT policy exists for leads, analytics, or rate-limit buckets on purpose.
-- Public forms and page-view tracking MUST go through rate-limited server routes using server-only credentials.
