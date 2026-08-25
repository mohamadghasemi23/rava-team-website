#!/bin/sh
set -eu

umask 077
stack_dir=/opt/rava/staging/supabase
backup_dir=/opt/rava/backups/staging
retention_days=7
stamp=$(date -u +%Y%m%dT%H%M%SZ)

mkdir -p "$backup_dir"

db_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' supabase-db 2>/dev/null || true)
if [ "$db_health" != healthy ]; then
  echo "supabase-db is not healthy; refusing backup" >&2
  exit 1
fi

available_kb=$(df -Pk "$backup_dir" | awk 'NR==2 {print $4}')
if [ "${available_kb:-0}" -lt 1048576 ]; then
  echo "less than 1 GiB free; refusing backup" >&2
  exit 1
fi

globals_tmp="$backup_dir/.rava-staging-globals-$stamp.sql.partial"
database_tmp="$backup_dir/.rava-staging-postgres-$stamp.dump.partial"
globals_final="$backup_dir/rava-staging-globals-$stamp.sql"
database_final="$backup_dir/rava-staging-postgres-$stamp.dump"

trap 'rm -f "$globals_tmp" "$database_tmp"' EXIT INT TERM

docker exec supabase-db pg_dumpall -U supabase_admin --globals-only > "$globals_tmp"
docker exec supabase-db pg_dump -U supabase_admin -d postgres -Fc > "$database_tmp"
mv "$globals_tmp" "$globals_final"
mv "$database_tmp" "$database_final"
sha256sum "$globals_final" "$database_final" > "$backup_dir/SHA256SUMS-$stamp"
chmod 600 "$globals_final" "$database_final" "$backup_dir/SHA256SUMS-$stamp"

find "$backup_dir" -maxdepth 1 -type f \
  \( -name 'rava-staging-globals-*' -o -name 'rava-staging-postgres-*' -o -name 'SHA256SUMS-*' \) \
  -mtime "+$retention_days" -delete

printf 'backup completed: %s\n' "$stamp"
