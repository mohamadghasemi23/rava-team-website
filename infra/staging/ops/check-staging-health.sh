#!/bin/sh
set -eu

min_disk_kb=${RAVA_MIN_DISK_KB:-1048576}
min_memory_mb=${RAVA_MIN_MEMORY_MB:-512}
origin=${RAVA_STAGING_ORIGIN:-http://127.0.0.1:19080}
status=ok
reasons=''

append_reason() {
  status=warning
  if [ -n "$reasons" ]; then reasons="$reasons,$1"; else reasons=$1; fi
}

available_kb=$(df -Pk / | awk 'NR==2 {print $4}')
available_mb=$(free -m | awk '/^Mem:/ {print $7}')
[ "${available_kb:-0}" -ge "$min_disk_kb" ] || append_reason low_disk
[ "${available_mb:-0}" -ge "$min_memory_mb" ] || append_reason low_memory

for container in rava-web-staging-app-1 rava-web-staging-proxy-1 supabase-db supabase-auth supabase-rest supabase-storage; do
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)
  [ "$health" = healthy ] || append_reason "container_${container}_${health:-missing}"
done

http_code=$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "$origin/_infra/health" 2>/dev/null || true)
[ "$http_code" = 200 ] || append_reason "http_${http_code:-failed}"
printf 'status=%s disk_available_kb=%s memory_available_mb=%s http=%s reasons=%s\n' "$status" "${available_kb:-0}" "${available_mb:-0}" "${http_code:-failed}" "${reasons:-none}"
[ "$status" = ok ]
