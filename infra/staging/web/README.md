# RAVA self-hosted frontend staging

This stack keeps the Next.js application and Supabase gateway behind Caddy. Until an approved staging hostname exists, Caddy binds only to `127.0.0.1:19080` and is reachable through an SSH tunnel.

## Safety properties

- No Production or DNS dependency.
- PostgreSQL remains unexposed.
- App runs as an unprivileged user with a read-only root filesystem.
- Caddy exposes only the loopback staging port.
- Images are tagged with the exact Git commit for rollback.
- The public Supabase key is allowed in browser code; secret/service-role keys are never supplied to the app.

## Verification and rollback

Before switching a tag, record the current image from `docker compose ps`. Build the new commit-tagged image, start the stack, and require both healthchecks plus HTTP, login, admin authorization, and database isolation tests. Rollback sets `RAVA_IMAGE_TAG` to the recorded previous tag and recreates only the app service. DNS remains unchanged until an explicitly approved Production cutover.

The operations scripts in `../ops` provide a read-only health check, a full read-only runtime gate, a temporary-database restore test, and dry-run-first image cleanup. Cleanup refuses to run unless both web containers are healthy and preserves the running image plus `rollback-baseline`.

Run `verify-staging-gates.sh` from the repository root to verify the local web, Auth, REST, Storage, admin redirect, loopback binding, and absence of a Netlify runtime URL. Run `restore-test-postgres.sh` with the privileges used by the backup service; it verifies the latest checksum, restores into a uniquely named temporary database, validates PostgreSQL 17 and RLS, runs every database test, and removes only that temporary database on exit.
