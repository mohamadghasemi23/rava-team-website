#!/bin/sh
set -eu

umask 077
env_file=${RAVA_SUPABASE_ENV_FILE:-/opt/rava/staging/supabase/.env}
db_container=${RAVA_DB_CONTAINER:-supabase-db}
auth_admin_url=${RAVA_AUTH_ADMIN_URL:-http://127.0.0.1:18000/auth/v1/admin/users}
response_file=$(mktemp)
tty_echo_disabled=0
cleanup() {
  if [ "$tty_echo_disabled" -eq 1 ]; then stty echo 2>/dev/null || true; fi
  rm -f "$response_file"
}
trap cleanup EXIT INT TERM

[ "$(id -u)" -eq 0 ] || { echo 'run this bootstrap as root' >&2; exit 1; }
[ -r "$env_file" ] || { echo 'Supabase environment file is not readable' >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo 'curl is required' >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo 'jq is required' >&2; exit 1; }

db_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$db_container" 2>/dev/null || true)
[ "$db_health" = healthy ] || { echo "$db_container is not healthy; refusing bootstrap" >&2; exit 1; }

existing_owner=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres -c "select count(*) from public.profiles where active and role='super_admin'" 2>/dev/null)
[ "$existing_owner" = 0 ] || { echo 'a platform owner already exists; refusing bootstrap' >&2; exit 1; }

service_role=$(sed -n 's/^SERVICE_ROLE_KEY=//p' "$env_file" | head -1)
service_role=${service_role#\"}
service_role=${service_role%\"}
[ -n "$service_role" ] || { echo 'SERVICE_ROLE_KEY is missing' >&2; exit 1; }

printf 'Owner display name [Mohammad Ghasemi]: '
IFS= read -r display_name
display_name=${display_name:-Mohammad Ghasemi}
printf 'Owner email: '
IFS= read -r email
printf 'Owner password (minimum 14 characters): '
stty -echo
tty_echo_disabled=1
IFS= read -r password
stty echo
tty_echo_disabled=0
printf '\nRepeat owner password: '
stty -echo
tty_echo_disabled=1
IFS= read -r password_repeat
stty echo
tty_echo_disabled=0
printf '\n'

case "$email" in *@*.*) ;; *) echo 'invalid email format' >&2; exit 1 ;; esac
[ "${#display_name}" -ge 2 ] && [ "${#display_name}" -le 120 ] || { echo 'display name must be 2-120 characters' >&2; exit 1; }
[ "${#password}" -ge 14 ] || { echo 'password must contain at least 14 characters' >&2; exit 1; }
[ "$password" = "$password_repeat" ] || { echo 'passwords do not match' >&2; exit 1; }

payload=$(jq -cn --arg email "$email" --arg password "$password" --arg display_name "$display_name" \
  '{email:$email,password:$password,email_confirm:true,user_metadata:{display_name:$display_name},app_metadata:{rava_bootstrap:true}}')
unset password password_repeat

http_code=$(curl -sS --max-time 20 -o "$response_file" -w '%{http_code}' \
  -X POST "$auth_admin_url" \
  -H "Authorization: Bearer $service_role" \
  -H "apikey: $service_role" \
  -H 'Content-Type: application/json' \
  --data "$payload")
unset payload

case "$http_code" in 200|201) ;; *) unset service_role; echo "GoTrue owner creation failed safely (HTTP $http_code)" >&2; exit 1 ;; esac
user_id=$(jq -r '.id // empty' "$response_file")
case "$user_id" in
  ????????-????-????-????-????????????) ;;
  *) echo 'GoTrue returned an invalid user identifier' >&2; exit 1 ;;
esac

if ! docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres \
  -v actor_id="$user_id" -v display_name="$display_name" <<'SQL'
begin;
select pg_advisory_xact_lock(hashtext('rava.platform_owner.bootstrap'));
do $$
begin
  if exists(select 1 from public.profiles where active and role='super_admin') then
    raise exception 'platform owner already exists';
  end if;
end $$;
update public.profiles
set display_name=:'display_name',role='super_admin',active=true,updated_at=now()
where id=:'actor_id'::uuid;
insert into public.memberships(user_id,scope_type,status,is_owner,invited_by,joined_at)
values(:'actor_id'::uuid,'platform','active',true,:'actor_id'::uuid,now())
on conflict do nothing;
insert into public.audit_log(actor_id,action,entity_type,entity_id,severity,context)
values(:'actor_id'::uuid,'platform.owner.bootstrapped','profile',:'actor_id','critical',jsonb_build_object('source','staging_root_bootstrap'));
commit;
SQL
then
  curl -sS --max-time 20 -o /dev/null -X DELETE "$auth_admin_url/$user_id" \
    -H "Authorization: Bearer $service_role" -H "apikey: $service_role" || true
  unset service_role
  echo 'database promotion failed; the partially created Auth user was removed' >&2
  exit 1
fi
unset service_role

owner_ready=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres -v actor_id="$user_id" \
  -c "select count(*) from public.profiles where id=:'actor_id'::uuid and active and role='super_admin'" 2>/dev/null)
[ "$owner_ready" = 1 ] || { echo 'owner profile verification failed' >&2; exit 1; }

printf 'platform owner bootstrap completed and audited: user_id=%s\n' "$user_id"
