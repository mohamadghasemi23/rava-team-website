#!/bin/sh
set -eu

umask 077
backup_dir=${RAVA_BACKUP_DIR:-/opt/rava/backups/staging}
db_container=${RAVA_DB_CONTAINER:-supabase-db}
repo_dir=${RAVA_REPO_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
test_db="rava_restore_test_${stamp}_$$"
test_output=''

case "$test_db" in
  rava_restore_test_[0-9A-Za-z_]*) ;;
  *) echo 'unsafe temporary database name' >&2; exit 1 ;;
esac

dump=$(find "$backup_dir" -maxdepth 1 -type f -name 'rava-staging-postgres-*.dump' -print | sort | tail -1)
[ -n "$dump" ] || { echo 'no staging PostgreSQL backup found' >&2; exit 1; }
checksum_file="$backup_dir/SHA256SUMS-${dump##*rava-staging-postgres-}"
checksum_file=${checksum_file%.dump}

health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$db_container" 2>/dev/null || true)
[ "$health" = healthy ] || { echo "$db_container is not healthy; refusing restore test" >&2; exit 1; }

if [ -f "$checksum_file" ]; then
  (cd "$backup_dir" && sha256sum -c "$(basename "$checksum_file")" --ignore-missing)
else
  echo 'matching checksum file is missing' >&2
  exit 1
fi

cleanup() {
  [ -z "$test_output" ] || rm -f "$test_output"
  docker exec "$db_container" dropdb -U supabase_admin --if-exists "$test_db" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker exec "$db_container" createdb -U supabase_admin "$test_db"
docker exec -i "$db_container" pg_restore -U supabase_admin -d "$test_db" --exit-on-error --no-owner < "$dump"

version=$(docker exec "$db_container" psql -XAt -U supabase_admin -d "$test_db" -c "show server_version")
case "$version" in 17.*) ;; *) echo "unexpected PostgreSQL version: $version" >&2; exit 1 ;; esac

docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d "$test_db" <<'SQL'
do $$
declare missing text;
begin
  select string_agg(name, ', ')
  into missing
  from unnest(array['public.organizations','public.sites','public.pages','public.page_blocks','auth.users','storage.objects']) name
  where to_regclass(name) is null;
  if missing is not null then raise exception 'missing restored relations: %', missing; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity
  ) then raise exception 'restored public tables without RLS'; end if;
end $$;
SQL

for test_file in "$repo_dir"/supabase/tests/database/*_test.sql; do
  [ -f "$test_file" ] || continue
  test_output=$(mktemp)
  if ! docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d "$test_db" < "$test_file" > "$test_output" 2>&1; then
    cat "$test_output"
    echo "database test command failed: $test_file" >&2
    exit 1
  fi
  cat "$test_output"
  if grep -Eq '(^|[[:space:]])not ok [0-9]+|Looks like you failed' "$test_output"; then
    echo "pgTAP assertions failed: $test_file" >&2
    exit 1
  fi
  rm -f "$test_output"
  test_output=''
done

printf 'restore test passed: backup=%s postgres=%s database=%s\n' "$(basename "$dump")" "$version" "$test_db"
