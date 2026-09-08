#!/bin/sh
set -eu

umask 077
env_file=${RAVA_SUPABASE_ENV_FILE:-/opt/rava/staging/supabase/.env}
db_container=${RAVA_DB_CONTAINER:-supabase-db}
auth_admin_url=${RAVA_AUTH_ADMIN_URL:-http://127.0.0.1:18000/auth/v1/admin/users}
backup_script=${RAVA_BACKUP_SCRIPT:-/home/ravaops/projects/rava-team-website/infra/staging/backup-postgres.sh}
organization_slug=${RAVA_TEST_CUSTOMER_ORG_SLUG:-launchpad-test-customer}
site_slug=${RAVA_TEST_CUSTOMER_SITE_SLUG:-launchpad-test-site}
response_file=$(mktemp)
tty_echo_disabled=0
generated_credentials=0
credentials_file=${RAVA_TEST_CUSTOMER_CREDENTIALS_FILE:-/opt/rava/staging/test-credentials/launchpad-customer.txt}

if [ "${1:-}" = "--generate-credentials" ];then
  generated_credentials=1
elif [ "$#" -ne 0 ];then
  echo 'usage: provision-launchpad-test-customer.sh [--generate-credentials]' >&2
  exit 1
fi

cleanup(){
  if [ "$tty_echo_disabled" -eq 1 ];then stty echo 2>/dev/null||true;fi
  rm -f "$response_file"
}
trap cleanup EXIT INT TERM

[ "$(id -u)" -eq 0 ]||{ echo 'run this provisioning script as root' >&2;exit 1;}
[ -r "$env_file" ]||{ echo 'Supabase environment file is not readable' >&2;exit 1;}
[ -x "$backup_script" ]||{ echo 'Staging backup script is missing or not executable' >&2;exit 1;}
command -v curl >/dev/null 2>&1||{ echo 'curl is required' >&2;exit 1;}
command -v jq >/dev/null 2>&1||{ echo 'jq is required' >&2;exit 1;}
command -v openssl >/dev/null 2>&1||{ echo 'openssl is required' >&2;exit 1;}
printf '%s\n' "$organization_slug"|grep -Eq '^[a-z0-9][a-z0-9-]{1,62}$'||{ echo 'invalid organization slug' >&2;exit 1;}
printf '%s\n' "$site_slug"|grep -Eq '^[a-z0-9][a-z0-9-]{1,62}$'||{ echo 'invalid site slug' >&2;exit 1;}

db_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$db_container" 2>/dev/null||true)
[ "$db_health" = healthy ]||{ echo "$db_container is not healthy; refusing provisioning" >&2;exit 1;}

owner_id=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres -c "select id from public.profiles where active and role='super_admin' order by created_at limit 2" 2>/dev/null)
owner_count=$(printf '%s\n' "$owner_id"|awk 'NF {count++} END {print count+0}')
[ "$owner_count" -eq 1 ]||{ echo 'exactly one active platform owner is required' >&2;exit 1;}

existing_scope=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres -c "select (select count(*) from public.organizations where slug='$organization_slug')+(select count(*) from public.sites where slug='$site_slug')" 2>/dev/null)
[ "$existing_scope" = 0 ]||{ echo 'test customer organization or Site already exists; refusing duplicate provisioning' >&2;exit 1;}

service_role=$(sed -n 's/^SERVICE_ROLE_KEY=//p' "$env_file"|head -1)
service_role=${service_role#\"};service_role=${service_role%\"}
[ -n "$service_role" ]||{ echo 'SERVICE_ROLE_KEY is missing' >&2;exit 1;}

if [ "$generated_credentials" -eq 1 ];then
  display_name='مشتری خریدار لانچ پد'
  email='launchpad-test-buyer@staging.rava.local'
  password=$(openssl rand -base64 30 | tr -d '\n')
  password_repeat=$password
else
  printf 'Customer display name [LaunchPad Test Customer]: '
  IFS= read -r display_name
  display_name=${display_name:-LaunchPad Test Customer}
  printf 'Customer email: '
  IFS= read -r email
  printf 'Customer password (minimum 14 characters): '
  stty -echo;tty_echo_disabled=1;IFS= read -r password;stty echo;tty_echo_disabled=0
  printf '\nRepeat customer password: '
  stty -echo;tty_echo_disabled=1;IFS= read -r password_repeat;stty echo;tty_echo_disabled=0
  printf '\n'
fi

case "$email" in *@*.*);;*) echo 'invalid email format' >&2;exit 1;;esac
[ "${#display_name}" -ge 2 ]&&[ "${#display_name}" -le 120 ]||{ echo 'display name must be 2-120 characters' >&2;exit 1;}
[ "${#password}" -ge 14 ]||{ echo 'password must contain at least 14 characters' >&2;exit 1;}
[ "$password" = "$password_repeat" ]||{ echo 'passwords do not match' >&2;exit 1;}

echo 'creating a fresh Staging PostgreSQL backup before test-customer provisioning'
"$backup_script"

payload=$(jq -cn --arg email "$email" --arg password "$password" --arg display_name "$display_name" '{email:$email,password:$password,email_confirm:true,user_metadata:{display_name:$display_name},app_metadata:{rava_test_customer:true}}')
http_code=$(curl -sS --max-time 20 -o "$response_file" -w '%{http_code}' -X POST "$auth_admin_url" -H "Authorization: Bearer $service_role" -H "apikey: $service_role" -H 'Content-Type: application/json' --data "$payload")
unset payload
case "$http_code" in 200|201);;*) unset service_role;echo "GoTrue customer creation failed safely (HTTP $http_code)" >&2;exit 1;;esac
user_id=$(jq -r '.id // empty' "$response_file")
case "$user_id" in ????????-????-????-????-????????????);;*) echo 'GoTrue returned an invalid user identifier' >&2;exit 1;;esac

if ! docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres \
  -v actor_id="$owner_id" -v customer_id="$user_id" -v display_name="$display_name" \
  -v organization_slug="$organization_slug" -v site_slug="$site_slug" <<'SQL'
begin;
select pg_advisory_xact_lock(hashtext('rava.launchpad_test_customer.provision'));
select set_config('request.jwt.claim.sub',:'actor_id',true);
select set_config('request.jwt.claims',jsonb_build_object('sub',:'actor_id','role','authenticated')::text,true);
set local role authenticated;

select public.provision_organization_site(
  :'display_name'||' Test',:'organization_slug',:'display_name'||' Site',:'site_slug','fa','IRR','Asia/Tehran'
) as provision_result \gset
select (:'provision_result'::jsonb->>'organization_id')::uuid as organization_id,(:'provision_result'::jsonb->>'site_id')::uuid as site_id \gset

select public.create_custom_role(
  'site','launchpad-customer','مشتری لانچ‌پد','LaunchPad customer','','',
  :'organization_id'::uuid,:'site_id'::uuid,
  array['sites.view','cms.view','cms.manage','media.manage','leads.view','leads.manage','seo.manage','help.view']
) as customer_role_id \gset
select public.add_existing_member(
  :'customer_id'::uuid,'site',:'organization_id'::uuid,:'site_id'::uuid,array[(:'customer_role_id')::uuid],true
);

select id as template_id from public.template_catalog where key='rava-service-living-system' and status='active' \gset
select id as template_version_id from public.template_versions where template_id=:'template_id'::uuid and status='published' order by version desc limit 1 \gset
select spv.id as starter_pack_version_id
from public.starter_pack_template_compatibility compatibility
join public.starter_content_pack_versions spv on spv.id=compatibility.starter_pack_version_id and spv.status='published'
where compatibility.template_version_id=:'template_version_id'::uuid and compatibility.active
order by compatibility.is_default desc,spv.version desc limit 1 \gset

select public.set_site_template_access(:'site_id'::uuid,:'template_id'::uuid,true,'complimentary');
select public.install_starter_pack(
  :'site_id'::uuid,:'starter_pack_version_id'::uuid,:'template_version_id'::uuid,
  gen_random_uuid(),array['fa','en']::text[],jsonb_build_object('name',:'display_name')
);
select public.record_audit_event(
  'staging.launchpad_test_customer.provisioned','site',:'site_id',:'organization_id'::uuid,:'site_id'::uuid,
  null,jsonb_build_object('customer_id',:'customer_id','template_key','rava-service-living-system'),
  jsonb_build_object('source','staging_root_provisioning'),null,null,'notice'
);
commit;
select :'site_id' as site_id;
SQL
then
  curl -sS --max-time 20 -o /dev/null -X DELETE "$auth_admin_url/$user_id" -H "Authorization: Bearer $service_role" -H "apikey: $service_role"||true
  unset service_role
  echo 'database provisioning failed; the partially created Auth user was removed' >&2
  exit 1
fi
unset service_role

ready=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres -c "select count(*) from public.memberships m join public.site_template_access a on a.site_id=m.site_id and a.active join public.template_catalog t on t.id=a.template_id and t.key='rava-service-living-system' where m.user_id='$user_id'::uuid and m.status='active'" 2>/dev/null)
[ "$ready" = 1 ]||{ echo 'test customer verification failed' >&2;exit 1;}
if [ "$generated_credentials" -eq 1 ];then
  credentials_dir=$(dirname "$credentials_file")
  mkdir -p "$credentials_dir"
  chmod 700 "$credentials_dir"
  {
    printf 'Name: %s\n' "$display_name"
    printf 'Email: %s\n' "$email"
    printf 'Password: %s\n' "$password"
    printf 'User ID: %s\n' "$user_id"
    printf 'Organization slug: %s\n' "$organization_slug"
    printf 'Site slug: %s\n' "$site_slug"
  } > "$credentials_file"
  chmod 600 "$credentials_file"
  printf 'Credentials saved to %s (mode 600).\n' "$credentials_file"
fi
unset password password_repeat
printf 'LaunchPad test customer provisioned and audited: user_id=%s login=/login\n' "$user_id"
