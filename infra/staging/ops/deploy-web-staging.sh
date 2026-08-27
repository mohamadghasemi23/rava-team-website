#!/bin/sh
set -eu

repo_dir=${RAVA_REPO_DIR:-/home/ravaops/projects/rava-team-website}
compose_file=${RAVA_WEB_COMPOSE_FILE:-$repo_dir/infra/staging/web/compose.yml}
app_container=${RAVA_WEB_APP_CONTAINER:-rava-web-staging-app-1}
new_tag=${1:-}

[ "$(id -u)" -eq 0 ] || { echo 'run this Staging deployment as root' >&2; exit 1; }
printf '%s\n' "$new_tag" | grep -Eq '^[0-9a-f]{7,40}$' || { echo 'usage: deploy-web-staging.sh <git-commit-sha>' >&2; exit 1; }
[ -f "$compose_file" ] || { echo 'Staging compose file is missing' >&2; exit 1; }

cd "$repo_dir"
head_sha=$(git rev-parse HEAD)
case "$head_sha" in "$new_tag"*) ;; *) echo 'requested tag does not match repository HEAD' >&2; exit 1 ;; esac
[ -z "$(git status --porcelain)" ] || { echo 'working tree is not clean; refusing deployment' >&2; exit 1; }

previous_image=$(docker inspect "$app_container" --format '{{.Config.Image}}' 2>/dev/null)
previous_health=$(docker inspect "$app_container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null)
[ "$previous_health" = healthy ] || { echo 'current Staging app is not healthy; refusing deployment' >&2; exit 1; }
previous_tag=${previous_image#rava-web:}
printf '%s\n' "$previous_tag" | grep -Eq '^[A-Za-z0-9_.-]+$' || { echo 'current image tag is invalid' >&2; exit 1; }

public_origin=$(docker inspect "$app_container" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^NEXT_PUBLIC_SUPABASE_URL=//p' | head -1)
publishable_key=$(docker inspect "$app_container" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=//p' | head -1)
[ -n "$public_origin" ] && [ -n "$publishable_key" ] || { echo 'public Staging build configuration is missing' >&2; exit 1; }

docker tag "$previous_image" rava-web:rollback-admin-p0
docker build \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=$public_origin" \
  --build-arg "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$publishable_key" \
  --build-arg "NEXT_PUBLIC_SITE_URL=$public_origin" \
  -t "rava-web:$new_tag" .

rollback() {
  echo "Staging gate failed; rolling app back to $previous_image" >&2
  RAVA_IMAGE_TAG="$previous_tag" STAGING_PUBLIC_ORIGIN="$public_origin" SUPABASE_PUBLISHABLE_KEY="$publishable_key" \
    docker compose -f "$compose_file" up -d --no-deps app
}
trap rollback INT TERM HUP

RAVA_IMAGE_TAG="$new_tag" STAGING_PUBLIC_ORIGIN="$public_origin" SUPABASE_PUBLISHABLE_KEY="$publishable_key" \
  docker compose -f "$compose_file" up -d --no-deps app

attempt=0
while [ "$attempt" -lt 30 ]; do
  health=$(docker inspect "$app_container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)
  [ "$health" = healthy ] && break
  attempt=$((attempt+1))
  sleep 2
done

if [ "${health:-}" != healthy ] || ! "$repo_dir/infra/staging/ops/verify-staging-gates.sh"; then
  rollback
  exit 1
fi
trap - INT TERM HUP
unset publishable_key
printf 'Staging web deployment passed: previous=%s current=rava-web:%s rollback=rava-web:rollback-admin-p0\n' "$previous_image" "$new_tag"
