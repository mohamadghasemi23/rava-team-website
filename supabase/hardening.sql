-- RAVA V1 post-schema hardening.
-- Safe to review independently; do not run blindly against an unknown legacy schema.

-- Server-only RPCs must never be executable from public client roles.
revoke all on function public.record_page_view(text, text) from public, anon, authenticated;
grant execute on function public.record_page_view(text, text) to service_role;
revoke all on function public.consume_contact_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text, timestamptz, integer) to service_role;

-- Internal authorization helpers live in private schema and are not API endpoints.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
revoke all on function private.is_rava_staff() from public, anon;
revoke all on function private.is_rava_admin() from public, anon;
grant execute on function private.is_rava_staff() to authenticated, service_role;
grant execute on function private.is_rava_admin() to authenticated, service_role;

-- Least-privilege Data API grants. RLS remains enabled as a second authorization layer.
revoke all privileges on table public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.leads, public.site_settings, public.page_views_daily, public.page_view_visitors_daily, public.public_rate_limits from anon, authenticated;
grant select on public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.site_settings to anon;
grant select,insert,update,delete on public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.site_settings to authenticated;
grant select,update on public.leads to authenticated;
grant select on public.page_views_daily to authenticated;
revoke all privileges on table public.page_view_visitors_daily, public.public_rate_limits from anon, authenticated;

-- Split read and mutation policies so anonymous/public access, authenticated public access,
-- and staff draft access do not rely on overlapping permissive SELECT policies.
drop policy if exists "public read site content" on public.site_content;
drop policy if exists "staff manage site content" on public.site_content;
create policy "anon read site content" on public.site_content for select to anon using (true);
create policy "authenticated read site content" on public.site_content for select to authenticated using (true);
create policy "staff insert site content" on public.site_content for insert to authenticated with check (private.is_rava_staff());
create policy "staff update site content" on public.site_content for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete site content" on public.site_content for delete to authenticated using (private.is_rava_staff());

drop policy if exists "public read published services" on public.services;
drop policy if exists "staff manage services" on public.services;
create policy "anon read published services" on public.services for select to anon using (published=true);
create policy "authenticated read services" on public.services for select to authenticated using (published=true or private.is_rava_staff());
create policy "staff insert services" on public.services for insert to authenticated with check (private.is_rava_staff());
create policy "staff update services" on public.services for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete services" on public.services for delete to authenticated using (private.is_rava_staff());

drop policy if exists "public read published projects" on public.projects;
drop policy if exists "staff manage projects" on public.projects;
create policy "anon read published projects" on public.projects for select to anon using (published=true);
create policy "authenticated read projects" on public.projects for select to authenticated using (published=true or private.is_rava_staff());
create policy "staff insert projects" on public.projects for insert to authenticated with check (private.is_rava_staff());
create policy "staff update projects" on public.projects for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete projects" on public.projects for delete to authenticated using (private.is_rava_staff());

drop policy if exists "public read media metadata" on public.media_assets;
drop policy if exists "staff manage media" on public.media_assets;
create policy "anon read media metadata" on public.media_assets for select to anon using (deleted_at is null);
create policy "authenticated read media metadata" on public.media_assets for select to authenticated using (deleted_at is null or private.is_rava_staff());
create policy "staff insert media" on public.media_assets for insert to authenticated with check (private.is_rava_staff());
create policy "staff update media" on public.media_assets for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete media" on public.media_assets for delete to authenticated using (private.is_rava_staff());

drop policy if exists "public read published project media" on public.project_media;
drop policy if exists "staff manage project media" on public.project_media;
create policy "anon read published project media" on public.project_media for select to anon using (exists(select 1 from public.projects p where p.id=project_media.project_id and p.published=true));
create policy "authenticated read project media" on public.project_media for select to authenticated using (exists(select 1 from public.projects p where p.id=project_media.project_id and (p.published=true or private.is_rava_staff())));
create policy "staff insert project media" on public.project_media for insert to authenticated with check (private.is_rava_staff());
create policy "staff update project media" on public.project_media for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete project media" on public.project_media for delete to authenticated using (private.is_rava_staff());

drop policy if exists "public read public settings" on public.site_settings;
drop policy if exists "staff read settings" on public.site_settings;
create policy "anon read public settings" on public.site_settings for select to anon using (is_public=true);
create policy "authenticated read settings" on public.site_settings for select to authenticated using (is_public=true or private.is_rava_staff());
