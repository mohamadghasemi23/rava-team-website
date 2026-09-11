#!/bin/sh
set -eu

origin=${RAVA_STAGING_ORIGIN:-http://127.0.0.1:19080}
compose_file=${RAVA_WEB_COMPOSE_FILE:-infra/staging/web/compose.yml}
ai_env_file=${RAVA_STAGING_AI_ENV_FILE:-/opt/rava/staging/web/ai.env}
failed=0

pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1" >&2; failed=1; }

container_health() {
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || true
}

for container in rava-web-staging-app-1 rava-web-staging-proxy-1 supabase-db supabase-auth supabase-rest supabase-storage; do
  health=$(container_health "$container")
  if [ "$health" = healthy ]; then pass "container:$container"; else fail "container:$container:${health:-missing}"; fi
done

check_http() {
  label=$1
  path=$2
  expected=$3
  code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$origin$path" 2>/dev/null || true)
  case ",$expected," in
    *",$code,"*) pass "$label:http_$code" ;;
    *) fail "$label:http_${code:-failed}:expected_$expected" ;;
  esac
}

check_http infrastructure /_infra/health 200
check_http homepage / 200
check_http login /login 200
check_http admin_guard /admin 302,303,307,308
check_http auth_gateway /auth/v1/health 200,401
check_http rest_gateway /rest/v1/ 200,401
check_http storage_gateway /storage/v1/status 200,401,404

if docker inspect rava-web-staging-app-1 --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -Eq '(^|=)https?://[^ ]*netlify' ; then
  fail runtime_netlify_reference
else
  pass runtime_without_netlify
fi

if docker inspect rava-web-staging-proxy-1 --format '{{json .HostConfig.PortBindings}}' \
  | grep -q '127.0.0.1' ; then
  pass proxy_loopback_only
else
  fail proxy_not_loopback_only
fi

compose_image=$(docker inspect rava-web-staging-app-1 --format '{{.Config.Image}}' 2>/dev/null || true)
compose_tag=${compose_image#rava-web:}
compose_env=$(docker inspect rava-web-staging-app-1 --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true)
STAGING_PUBLIC_ORIGIN=${STAGING_PUBLIC_ORIGIN:-$(printf '%s\n' "$compose_env" | sed -n 's/^NEXT_PUBLIC_SUPABASE_URL=//p' | head -1)}
SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY:-$(printf '%s\n' "$compose_env" | sed -n 's/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=//p' | head -1)}
RAVA_IMAGE_TAG=${RAVA_IMAGE_TAG:-$compose_tag}
export STAGING_PUBLIC_ORIGIN SUPABASE_PUBLISHABLE_KEY RAVA_IMAGE_TAG

if printf '%s\n' "$compose_env" | grep -Eq '^OPENAI_API_KEY=.+$' && \
  printf '%s\n' "$compose_env" | grep -Eq '^RAVA_OPENAI_MODEL=.+$'; then
  pass ai_provider_config_present
else
  pass ai_provider_disabled
fi

if [ -r "$ai_env_file" ] && [ -n "$STAGING_PUBLIC_ORIGIN" ] && [ -n "$SUPABASE_PUBLISHABLE_KEY" ] && \
  printf '%s\n' "$RAVA_IMAGE_TAG" | grep -Eq '^[A-Za-z0-9_.-]+$' && \
  docker compose --env-file "$ai_env_file" -f "$compose_file" config >/dev/null 2>&1; then
  pass compose_valid
else
  fail compose_invalid
fi

[ "$failed" -eq 0 ]
