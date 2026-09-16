-- Applied to live Supabase on 2026-09-14.

-- Site content.
drop policy if exists "public read site content" on public.site_content;
drop policy if exists "staff manage site content" on public.site_content;
create policy "anon read site content" on public.site_content for select to anon using (true);
create policy "authenticated read site content" on public.site_content for select to authenticated using (true);
create policy "staff insert site content" on public.site_content for insert to authenticated with check (private.is_rava_staff());
create policy "staff update site content" on public.site_content for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete site content" on public.site_content for delete to authenticated using (private.is_rava_staff());

-- Services.
drop policy if exists "public read published services" on public.services;
drop policy if exists "staff manage services" on public.services;
create policy "anon read published services" on public.services for select to anon using (published=true);
create policy "authenticated read services" on public.services for select to authenticated using (published=true or private.is_rava_staff());
create policy "staff insert services" on public.services for insert to authenticated with check (private.is_rava_staff());
create policy "staff update services" on public.services for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete services" on public.services for delete to authenticated using (private.is_rava_staff());

-- Projects.
drop policy if exists "public read published projects" on public.projects;
drop policy if exists "staff manage projects" on public.projects;
create policy "anon read published projects" on public.projects for select to anon using (published=true);
create policy "authenticated read projects" on public.projects for select to authenticated using (published=true or private.is_rava_staff());
create policy "staff insert projects" on public.projects for insert to authenticated with check (private.is_rava_staff());
create policy "staff update projects" on public.projects for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete projects" on public.projects for delete to authenticated using (private.is_rava_staff());

-- Media metadata.
drop policy if exists "public read media metadata" on public.media_assets;
drop policy if exists "staff manage media" on public.media_assets;
create policy "anon read media metadata" on public.media_assets for select to anon using (deleted_at is null);
create policy "authenticated read media metadata" on public.media_assets for select to authenticated using (deleted_at is null or private.is_rava_staff());
create policy "staff insert media" on public.media_assets for insert to authenticated with check (private.is_rava_staff());
create policy "staff update media" on public.media_assets for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete media" on public.media_assets for delete to authenticated using (private.is_rava_staff());

-- Project media.
drop policy if exists "public read published project media" on public.project_media;
drop policy if exists "staff manage project media" on public.project_media;
create policy "anon read published project media" on public.project_media for select to anon using (exists(select 1 from public.projects p where p.id=project_media.project_id and p.published=true));
create policy "authenticated read project media" on public.project_media for select to authenticated using (exists(select 1 from public.projects p where p.id=project_media.project_id and (p.published=true or private.is_rava_staff())));
create policy "staff insert project media" on public.project_media for insert to authenticated with check (private.is_rava_staff());
create policy "staff update project media" on public.project_media for update to authenticated using (private.is_rava_staff()) with check (private.is_rava_staff());
create policy "staff delete project media" on public.project_media for delete to authenticated using (private.is_rava_staff());

-- Settings.
drop policy if exists "public read public settings" on public.site_settings;
drop policy if exists "staff read settings" on public.site_settings;
create policy "anon read public settings" on public.site_settings for select to anon using (is_public=true);
create policy "authenticated read settings" on public.site_settings for select to authenticated using (is_public=true or private.is_rava_staff());
