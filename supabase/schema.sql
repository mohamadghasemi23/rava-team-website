create extension if not exists pgcrypto;

-- RAVA Website V1
-- Focused agency website schema. This is NOT a website-builder or multi-tenant CMS.
-- Public API exposure and authorization are intentionally least-privilege.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

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

create table public.page_view_visitors_daily (
  day date not null,
  path text not null,
  visitor_hash text not null,
  primary key (day, path, visitor_hash)
);

create table public.public_rate_limits (
  bucket text not null,
  bucket_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (bucket, bucket_key, window_start)
);

create index projects_home_order_idx on public.projects (show_on_home, sort_order) where published = true;
create index services_public_order_idx on public.services (sort_order) where published = true;
create index leads_status_created_idx on public.leads (status, created_at desc);
create index page_views_day_idx on public.page_views_daily (day desc);
create index rate_limits_window_idx on public.public_rate_limits (window_start desc);
create index media_assets_uploaded_by_idx on public.media_assets(uploaded_by);
create index project_media_media_id_idx on public.project_media(media_id);
create index projects_cover_media_id_idx on public.projects(cover_media_id);
create index projects_og_media_id_idx on public.projects(og_media_id);
create index services_og_media_id_idx on public.services(og_media_id);
create index site_content_updated_by_idx on public.site_content(updated_by);
create index site_settings_updated_by_idx on public.site_settings(updated_by);

-- Authorization helpers live outside the exposed public API schema.
create or replace function private.is_rava_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role in ('admin', 'editor')
  );
$$;

create or replace function private.is_rava_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'admin'
  );
$$;

revoke all on function private.is_rava_staff() from public, anon;
revoke all on function private.is_rava_admin() from public, anon;
grant execute on function private.is_rava_staff() to authenticated, service_role;
grant execute on function private.is_rava_admin() to authenticated, service_role;

-- New Auth users get an editor profile; admin promotion is an explicit privileged action.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, display_name, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''), split_part(coalesce(new.email,''), '@', 1), 'User'),
    'editor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- Server-only analytics and rate-limit RPCs.
create or replace function public.record_page_view(p_path text, p_visitor_hash text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_day date := (now() at time zone 'UTC')::date;
  inserted_count integer := 0;
  is_unique boolean := false;
begin
  if p_path is null or length(p_path) = 0 or length(p_path) > 240 then return; end if;
  if p_visitor_hash is null or length(p_visitor_hash) <> 64 then return; end if;

  insert into public.page_view_visitors_daily(day, path, visitor_hash)
  values (current_day, p_path, p_visitor_hash)
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  is_unique := inserted_count > 0;

  insert into public.page_views_daily(day, path, views, unique_estimate)
  values (current_day, p_path, 1, case when is_unique then 1 else 0 end)
  on conflict (day, path) do update
  set views = public.page_views_daily.views + 1,
      unique_estimate = public.page_views_daily.unique_estimate + case when is_unique then 1 else 0 end;
end;
$$;

create or replace function public.consume_contact_rate_limit(p_key_hash text, p_window_start timestamptz, p_limit integer default 5)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare next_count integer;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then return false; end if;
  if p_window_start is null or p_limit < 1 or p_limit > 100 then return false; end if;

  insert into public.public_rate_limits(bucket, bucket_key, window_start, request_count)
  values ('contact', p_key_hash, p_window_start, 1)
  on conflict (bucket, bucket_key, window_start) do update
  set request_count = public.public_rate_limits.request_count + 1
  returning request_count into next_count;

  return next_count <= p_limit;
end;
$$;

revoke all on function public.record_page_view(text, text) from public, anon, authenticated;
grant execute on function public.record_page_view(text, text) to service_role;
revoke all on function public.consume_contact_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text, timestamptz, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_content enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.project_media enable row level security;
alter table public.leads enable row level security;
alter table public.site_settings enable row level security;
alter table public.page_views_daily enable row level security;
alter table public.page_view_visitors_daily enable row level security;
alter table public.public_rate_limits enable row level security;

-- Public browsing uses anon policies only; authenticated users use staff policies.
create policy "public read site content" on public.site_content for select to anon using (true);
create policy "public read published services" on public.services for select to anon using (published = true);
create policy "public read published projects" on public.projects for select to anon using (published = true);
create policy "public read media metadata" on public.media_assets for select to anon using (deleted_at is null);
create policy "public read published project media" on public.project_media for select to anon using (
  exists (select 1 from public.projects p where p.id = project_media.project_id and p.published = true)
);
create policy "public read public settings" on public.site_settings for select to anon using (is_public = true);

create policy "staff manage media" on public.media_assets for all to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff manage site content" on public.site_content for all to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff manage services" on public.services for all to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff manage projects" on public.projects for all to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff manage project media" on public.project_media for all to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff read leads" on public.leads for select to authenticated using (private.is_rava_staff());
create policy "staff update leads" on public.leads for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff read analytics" on public.page_views_daily for select to authenticated using (private.is_rava_staff());
create policy "staff read settings" on public.site_settings for select to authenticated using (private.is_rava_staff());

create policy "staff read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_rava_admin());
create policy "admin insert profiles" on public.profiles for insert to authenticated with check (private.is_rava_admin());
create policy "admin update profiles" on public.profiles for update to authenticated using (private.is_rava_admin()) with check (private.is_rava_admin());
create policy "admin delete profiles" on public.profiles for delete to authenticated using (private.is_rava_admin());

create policy "admin insert settings" on public.site_settings for insert to authenticated with check (private.is_rava_admin());
create policy "admin update settings" on public.site_settings for update to authenticated using (private.is_rava_admin()) with check (private.is_rava_admin());
create policy "admin delete settings" on public.site_settings for delete to authenticated using (private.is_rava_admin());

create policy "service role analytics visitors" on public.page_view_visitors_daily for all to service_role using (true) with check (true);
create policy "service role rate limits" on public.public_rate_limits for all to service_role using (true) with check (true);

-- Explicit Data API grants. RLS is a second layer, not a substitute for grants.
revoke all privileges on table public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.leads, public.site_settings, public.page_views_daily, public.page_view_visitors_daily, public.public_rate_limits from anon, authenticated;
grant select on public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.site_settings to anon;
grant select,insert,update,delete on public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.site_settings to authenticated;
grant select,update on public.leads to authenticated;
grant select on public.page_views_daily to authenticated;
grant all on public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.leads, public.site_settings, public.page_views_daily, public.page_view_visitors_daily, public.public_rate_limits to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rava-media', 'rava-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "rava media staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'rava-media' and private.is_rava_staff());
create policy "rava media staff update" on storage.objects for update to authenticated using (bucket_id = 'rava-media' and private.is_rava_staff()) with check (bucket_id = 'rava-media' and private.is_rava_staff());
create policy "rava media staff delete" on storage.objects for delete to authenticated using (bucket_id = 'rava-media' and private.is_rava_staff());
create policy "public read rava media" on storage.objects for select to public using (bucket_id = 'rava-media');

-- No anonymous INSERT policies exist for leads, analytics or rate limits.
-- Public forms use server-only service-role credentials, validate payloads and never store raw IP addresses.
