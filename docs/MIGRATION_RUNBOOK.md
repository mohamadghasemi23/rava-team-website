# RAVA TEAM Migration Runbook

This project is intentionally designed to avoid vendor lock-in.

## Source code
- Canonical source lives in GitHub.
- Keep the default branch production-ready.

## Database
- Supabase is PostgreSQL-backed.
- Keep all schema changes in `supabase/migrations/`.
- CI rebuilds a PostgreSQL 17 database from all migrations, runs database linting, and executes the pgTAP suite in `supabase/tests/database/`.
- Any RLS, authorization, entitlement, billing, or data-integrity change must add or update database tests in the same pull request.
- Regularly export database backups outside Supabase.
- A future migration target can be any compatible PostgreSQL host.

## Media
- Keep media paths and metadata portable.
- Periodically export Storage objects and keep an external backup.

## Hosting
- Netlify is the current deployment platform.
- The Next.js application should remain portable to any Node.js-capable host or VPS.
- Avoid platform-only business logic unless documented and replaceable.

## Domain
- `ravateam.ir` remains independent from the hosting provider.
- A hosting migration should only require DNS changes after the new environment is verified.

## Migration order
1. Provision replacement PostgreSQL and restore database backup.
2. Restore/export media and update environment variables.
3. Deploy the Next.js application to the replacement host.
4. Verify authentication, CMS, forms, media, SEO, and redirects.
5. Switch DNS only after verification.
6. Keep the previous environment available briefly for rollback.

## Local database validation
Requires Docker and Supabase CLI `2.115.0`:

```bash
supabase start
supabase db reset --local
supabase db lint --local --level error
supabase test db
```

`db reset --local` is destructive only to the local Supabase development database. Never substitute `--linked` in this workflow.

## Backups
- Database: scheduled external dumps.
- Media: periodic external copy.
- Code and migrations: GitHub.
- Environment variables: secure inventory outside source control.
