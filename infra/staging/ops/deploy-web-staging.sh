#!/bin/sh
set -eu

repo_dir=${RAVA_REPO_DIR:-/home/ravaops/projects/rava-team-website}
compose_file=${RAVA_WEB_COMPOSE_FILE:-$repo_dir/infra/staging/web/compose.yml}
ai_env_file=${RAVA_STAGING_AI_ENV_FILE:-/opt/rava/staging/web/ai.env}
app_container=${RAVA_WEB_APP_CONTAINER:-rava-web-staging-app-1}
registry_image=${RAVA_STAGING_REGISTRY_IMAGE:-ghcr.io/mohamadghasemi23/rava-team-website}
new_tag=${1:-}

docker info >/dev/null 2>&1 || { echo 'Docker access is required to deploy Staging' >&2; exit 1; }
printf '%s\n' "$new_tag" | grep -Eq '^[0-9a-f]{7,40}$' || { echo 'usage: deploy-web-staging.sh <git-commit-sha>' >&2; exit 1; }
[ -f "$compose_file" ] || { echo 'Staging compose file is missing' >&2; exit 1; }
[ -f "$ai_env_file" ] || { echo "protected Staging AI environment file is missing: $ai_env_file" >&2; exit 1; }
[ -r "$ai_env_file" ] || { echo 'protected Staging AI environment file is not readable' >&2; exit 1; }
ai_env_mode=$(stat -c '%a' "$ai_env_file")
[ "$ai_env_mode" = 600 ] || { echo 'protected Staging AI environment file must have mode 600' >&2; exit 1; }
grep -Eq '^OPENAI_API_KEY=.+$' "$ai_env_file" || { echo 'OPENAI_API_KEY is missing from the protected Staging AI environment file' >&2; exit 1; }
grep -Eq '^RAVA_OPENAI_MODEL=.+$' "$ai_env_file" || { echo 'RAVA_OPENAI_MODEL is missing from the protected Staging AI environment file' >&2; exit 1; }

cd "$repo_dir"
head_sha=$(git -c safe.directory="$repo_dir" rev-parse HEAD)
case "$head_sha" in "$new_tag"*) ;; *) echo 'requested tag does not match repository HEAD' >&2; exit 1 ;; esac
[ -z "$(git -c safe.directory="$repo_dir" status --porcelain)" ] || { echo 'working tree is not clean; refusing deployment' >&2; exit 1; }

previous_image=$(docker inspect "$app_container" --format '{{.Config.Image}}' 2>/dev/null)
previous_health=$(docker inspect "$app_container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null)
[ "$previous_health" = healthy ] || { echo 'current Staging app is not healthy; refusing deployment' >&2; exit 1; }
previous_tag=${previous_image#rava-web:}
printf '%s\n' "$previous_tag" | grep -Eq '^[A-Za-z0-9_.-]+$' || { echo 'current image tag is invalid' >&2; exit 1; }

public_origin=$(docker inspect "$app_container" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^NEXT_PUBLIC_SUPABASE_URL=//p' | head -1)
publishable_key=$(docker inspect "$app_container" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=//p' | head -1)
[ -n "$public_origin" ] && [ -n "$publishable_key" ] || { echo 'public Staging build configuration is missing' >&2; exit 1; }
export STAGING_PUBLIC_ORIGIN="$public_origin" SUPABASE_PUBLISHABLE_KEY="$publishable_key"

remote_image="$registry_image:$head_sha"
docker pull "$remote_image"
image_revision=$(docker image inspect "$remote_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
image_source=$(docker image inspect "$remote_image" --format '{{index .Config.Labels "org.opencontainers.image.source"}}')
[ "$image_revision" = "$head_sha" ] || { echo 'registry image revision does not match repository HEAD' >&2; exit 1; }
[ "$image_source" = 'https://github.com/mohamadghasemi23/rava-team-website' ] || { echo 'registry image source is not the RAVA repository' >&2; exit 1; }

docker tag "$previous_image" rava-web:rollback-staging
docker tag "$remote_image" "rava-web:$new_tag"

rollback() {
  echo "Staging gate failed; rolling app back to $previous_image" >&2
  RAVA_IMAGE_TAG="$previous_tag" docker compose --env-file "$ai_env_file" -f "$compose_file" up -d --no-deps app
}
trap rollback INT TERM HUP

export RAVA_IMAGE_TAG="$new_tag"
docker compose --env-file "$ai_env_file" -f "$compose_file" up -d --no-deps app

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
unset publishable_key SUPABASE_PUBLISHABLE_KEY
printf 'Staging web deployment passed: previous=%s current=rava-web:%s rollback=rava-web:rollback-staging\n' "$previous_image" "$new_tag"
