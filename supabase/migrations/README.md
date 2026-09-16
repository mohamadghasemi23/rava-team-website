# RAVA V1 migration gate

The legacy CMS migrations were intentionally removed from the reboot branch because they describe the old generic CMS / website-builder direction.

`supabase/schema.sql` is now the target RAVA Website V1 schema.

## Important

Do **not** apply destructive database changes to any existing Supabase/PostgreSQL environment yet.

Before creating the first RAVA V1 migration:

1. Inspect the actual live/staging database schema and applied migration history.
2. Export a backup.
3. Identify data that must be preserved (especially auth profiles, media, projects and leads).
4. Write an explicit forward migration from the real database state to the V1 target schema.
5. Test the migration on a disposable database first.
6. Verify RLS policies, auth, media upload, leads and admin access before production.

The archive branch `archive/pre-rava-reboot-2026-09-13` preserves the old migration history for reference.
