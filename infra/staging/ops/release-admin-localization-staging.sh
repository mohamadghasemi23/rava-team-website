#!/bin/sh
set -eu

repo_dir=${RAVA_REPO_DIR:-/home/ravaops/projects/rava-team-website}
db_container=${RAVA_DB_CONTAINER:-supabase-db}
requested_sha=${1:-}
migration="$repo_dir/supabase/migrations/20260827030000_admin_sites_observability_help.sql"
database_test="$repo_dir/supabase/tests/database/admin_core_contextual_help_test.sql"

[ "$(id -u)" -eq 0 ] || { echo 'run this Staging release as root' >&2; exit 1; }
printf '%s\n' "$requested_sha" | grep -Eq '^[0-9a-f]{7,40}$' || {
  echo 'usage: release-admin-localization-staging.sh <git-commit-sha>' >&2
  exit 1
}

cd "$repo_dir"
head_sha=$(git -c safe.directory="$repo_dir" rev-parse HEAD)
case "$head_sha" in "$requested_sha"*) ;; *) echo 'requested SHA does not match repository HEAD' >&2; exit 1 ;; esac
[ -z "$(git -c safe.directory="$repo_dir" status --porcelain)" ] || {
  echo 'working tree is not clean; refusing Staging release' >&2
  exit 1
}
[ -f "$migration" ] && [ -f "$database_test" ] || {
  echo 'localization migration or database test is missing' >&2
  exit 1
}

db_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$db_container" 2>/dev/null || true)
[ "$db_health" = healthy ] || { echo 'Staging database is not healthy' >&2; exit 1; }

"$repo_dir/infra/staging/backup-postgres.sh"

docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < "$migration"
docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < "$database_test"

"$repo_dir/infra/staging/ops/deploy-web-staging.sh" "$requested_sha"
printf 'Admin localization Staging release passed: %s\n' "$head_sha"
