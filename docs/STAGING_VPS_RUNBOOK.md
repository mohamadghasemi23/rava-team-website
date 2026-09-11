# RAVA Staging VPS Runbook

## Scope

This VPS hosts an isolated self-hosted Supabase staging stack only. Production, DNS, and `ravateam.ir` are outside this rollout and must not be changed before all gates pass and explicit production approval is given.

- Supabase source pin: `500dddc20c3f0961b0a7163c5812ece00fa05195`
- PostgreSQL image: `supabase/postgres:17.6.1.136`
- Stack directory: `/opt/rava/staging/supabase`
- Local backup directory: `/opt/rava/backups/staging`
- API: `127.0.0.1:18000`
- PostgreSQL session pooler: `127.0.0.1:15432`
- PostgreSQL transaction pooler: `127.0.0.1:16543`
- Public signup and phone authentication remain disabled until SMTP/provider configuration is approved.

Use an SSH tunnel for local-only services. Do not expose PostgreSQL, Studio, or service-role credentials publicly.

## Health checks

```bash
sudo sh -c 'cd /opt/rava/staging/supabase && docker compose ps'
sudo docker stats --no-stream
sudo ss -lntup
```

All Supabase containers must be healthy and all three staging ports must remain bound to `127.0.0.1`.

## Database validation

Apply migrations in lexical order with `psql -X -v ON_ERROR_STOP=1`. Run both pgTAP suites in `supabase/tests/database/`. A clean rebuild must restore the baseline Supabase schema into a separate database, apply every migration, and pass the same suite.

## Backups

`rava-staging-backup.timer` creates daily globals and custom-format PostgreSQL dumps with SHA-256 checksums. Local retention is seven days. Backup files are mode `0600` and owned by root.

A restore test requires a separate temporary database and the `supabase_admin` role because the self-hosted Supabase `postgres` role is intentionally not a full superuser. After restore, validate PostgreSQL version, expected tables, privileged RPC ACLs, and the pgTAP suite before deleting the temporary database.

From a clean repository checkout, execute `infra/staging/ops/restore-test-postgres.sh` with Docker and backup-directory access. The script refuses an unhealthy database, verifies the matching SHA-256 manifest, uses only a uniquely named `rava_restore_test_*` database, runs all repository database tests, and drops only that temporary database on exit. Execute `infra/staging/ops/verify-staging-gates.sh` separately for the read-only Web/Auth/API/Storage and Netlify-independence gate.

Local backup is not disaster recovery. Configure an encrypted off-box destination and periodically test restoration from that copy before Production approval.

## Rollback

Application/database rollback before Production consists of:

1. Stop the isolated stack with `sudo docker compose down` from `/opt/rava/staging/supabase`.
2. Preserve the failed database and logs for investigation.
3. Restore the last verified custom-format dump into a new database rather than overwriting the failed database.
4. Point only Staging services at the restored database and rerun health, migration, ACL, pgTAP, TypeScript, and build gates.
5. Do not change Production or DNS during rollback.

Do not use `docker compose down -v`, delete `/opt/rava/staging/supabase/volumes/db/data`, or overwrite a database until a verified backup and explicit destructive-action approval exist.

## Open production gates

- Encrypted off-box backup and restore test
- Firewall policy and SSH hardening without lockout
- Monitoring and alert delivery
- SMTP/provider configuration and auth flow testing
- Capacity expansion or documented acceptance of the current 2 vCPU / 4 GiB RAM / 20 GiB disk single point of failure
- Explicit Production deployment approval
