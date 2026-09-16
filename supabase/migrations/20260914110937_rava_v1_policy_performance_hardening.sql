-- Applied to live Supabase on 2026-09-14.

-- Public-read policies apply to anon; authenticated staff use staff policies.
drop policy if exists "public read site content" on public.site_content;
create policy "public read site content" on public.site_content for select to anon using (true);
drop policy if exists "public read published services" on public.services;
create policy "public read published services" on public.services for select to anon using (published=true);
drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects" on public.projects for select to anon using (published=true);
drop policy if exists "public read media metadata" on public.media_assets;
create policy "public read media metadata" on public.media_assets for select to anon using (deleted_at is null);
drop policy if exists "public read published project media" on public.project_media;
create policy "public read published project media" on public.project_media for select to anon using (exists(select 1 from public.projects p where p.id=project_media.project_id and p.published=true));
drop policy if exists "public read public settings" on public.site_settings;
create policy "public read public settings" on public.site_settings for select to anon using (is_public=true);

-- Avoid overlapping permissive SELECT policies.
drop policy if exists "admin manage profiles" on public.profiles;
drop policy if exists "staff read own profile" on public.profiles;
create policy "staff read own profile" on public.profiles for select to authenticated using (id=(select auth.uid()) or private.is_rava_admin());
create policy "admin insert profiles" on public.profiles for insert to authenticated with check (private.is_rava_admin());
create policy "admin update profiles" on public.profiles for update to authenticated using (private.is_rava_admin()) with check (private.is_rava_admin());
create policy "admin delete profiles" on public.profiles for delete to authenticated using (private.is_rava_admin());

drop policy if exists "admin manage settings" on public.site_settings;
create policy "admin insert settings" on public.site_settings for insert to authenticated with check (private.is_rava_admin());
create policy "admin update settings" on public.site_settings for update to authenticated using (private.is_rava_admin()) with check (private.is_rava_admin());
create policy "admin delete settings" on public.site_settings for delete to authenticated using (private.is_rava_admin());

-- Cover foreign keys flagged by Supabase Performance Advisor.
create index if not exists media_assets_uploaded_by_idx on public.media_assets(uploaded_by);
create index if not exists project_media_media_id_idx on public.project_media(media_id);
create index if not exists projects_cover_media_id_idx on public.projects(cover_media_id);
create index if not exists projects_og_media_id_idx on public.projects(og_media_id);
create index if not exists services_og_media_id_idx on public.services(og_media_id);
create index if not exists site_content_updated_by_idx on public.site_content(updated_by);
create index if not exists site_settings_updated_by_idx on public.site_settings(updated_by);
create index if not exists legacy_audit_log_actor_id_idx on legacy.audit_log(actor_id);
create index if not exists legacy_page_blocks_page_id_idx on legacy.page_blocks(page_id);
create index if not exists legacy_pages_created_by_idx on legacy.pages(created_by);
create index if not exists legacy_pages_updated_by_idx on legacy.pages(updated_by);
create index if not exists legacy_revisions_created_by_idx on legacy.revisions(created_by);
