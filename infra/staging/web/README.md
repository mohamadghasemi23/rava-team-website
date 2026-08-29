# RAVA self-hosted frontend staging

This stack keeps the Next.js application and Supabase gateway behind Caddy. Until an approved staging hostname exists, Caddy binds only to `127.0.0.1:19080` and is reachable through an SSH tunnel.

## Safety properties

- No Production or DNS dependency.
- PostgreSQL remains unexposed.
- App runs as an unprivileged user with a read-only root filesystem.
- Caddy exposes only the loopback staging port.
- GitHub Actions builds immutable images outside the VPS and publishes them to the private GitHub Container Registry.
- The VPS only pulls an image whose source and exact Git revision labels match the checked-out repository commit.
- The running and immediately previous images are retained for rollback.
- The public Supabase key is allowed in browser code; secret/service-role keys are never supplied to the app.

## Verification and rollback

Before switching a tag, the deploy script records the current image, pulls the exact commit-tagged image from GHCR, validates its OCI source/revision labels, starts only the app service, and requires both healthchecks plus HTTP, login, admin authorization, and database isolation tests. A failed gate automatically recreates the app with the previous image. DNS remains unchanged until an explicitly approved Production cutover.

The GitHub repository must define `STAGING_PUBLIC_ORIGIN` as an Actions variable and `STAGING_SUPABASE_PUBLISHABLE_KEY` as an Actions secret. The VPS Docker client must have read access to the repository's private GHCR package. Neither the Supabase service-role key nor any server secret is used in the image build.

The owner-only SEO assistant reads its server-only provider configuration from `/opt/rava/staging/web/ai.env` by default. The file must be readable by the deployment operator, have mode `600`, and define `OPENAI_API_KEY` and `RAVA_OPENAI_MODEL`. It stays outside the repository and image. The deployment script passes it to Docker Compose only at runtime; neither value uses a `NEXT_PUBLIC_` prefix or becomes browser-visible.

Operations may run as `root` or as the restricted `ravaops` user when its Docker group membership is active. The backup script defaults to `/opt/rava/backups/staging`; `RAVA_BACKUP_DIR` may select another protected, persistent directory owned by the backup operator when root access is intentionally unavailable.

The operations scripts in `../ops` provide a read-only health check, a full read-only runtime gate, a temporary-database restore test, and dry-run-first image cleanup. Cleanup refuses to run unless both web containers are healthy and preserves the running image plus `rollback-staging`.

Run `verify-staging-gates.sh` from the repository root to verify the local web, Auth, REST, Storage, admin redirect, loopback binding, and absence of a Netlify runtime URL. Run `restore-test-postgres.sh` with the privileges used by the backup service; it verifies the latest checksum, restores into a uniquely named temporary database, validates PostgreSQL 17 and RLS, runs every database test, and removes only that temporary database on exit.
