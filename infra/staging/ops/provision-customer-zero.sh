#!/bin/sh
set -eu

umask 077
db_container=${RAVA_DB_CONTAINER:-supabase-db}
backup_script=${RAVA_BACKUP_SCRIPT:-/home/ravaops/projects/rava-team-website/infra/staging/backup-postgres.sh}
organization_slug=${RAVA_CUSTOMER_ZERO_ORG_SLUG:-rava-team}
site_slug=${RAVA_CUSTOMER_ZERO_SITE_SLUG:-rava-team}

[ "$(id -u)" -eq 0 ] || { echo 'run this provisioning script as root' >&2; exit 1; }
[ -x "$backup_script" ] || { echo 'staging backup script is missing or not executable' >&2; exit 1; }
printf '%s\n' "$organization_slug" | grep -Eq '^[a-z0-9][a-z0-9-]{1,62}$' || { echo 'invalid organization slug' >&2; exit 1; }
printf '%s\n' "$site_slug" | grep -Eq '^[a-z0-9][a-z0-9-]{1,62}$' || { echo 'invalid site slug' >&2; exit 1; }

db_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$db_container" 2>/dev/null || true)
[ "$db_health" = healthy ] || { echo "$db_container is not healthy; refusing provisioning" >&2; exit 1; }

owner_id=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres \
  -c "select id from public.profiles where active and role='super_admin' order by created_at limit 2" 2>/dev/null)
owner_count=$(printf '%s\n' "$owner_id" | awk 'NF {count++} END {print count+0}')
[ "$owner_count" -eq 1 ] || { echo 'exactly one active platform owner is required' >&2; exit 1; }

existing=$(docker exec "$db_container" psql -XAt -U supabase_admin -d postgres \
  -c "select (select count(*) from public.organizations where slug='$organization_slug') + (select count(*) from public.sites where slug='$site_slug')" 2>/dev/null)
[ "$existing" = 0 ] || { echo 'Customer Zero organization or site already exists; refusing duplicate provisioning' >&2; exit 1; }

echo 'creating a fresh Staging PostgreSQL backup before Customer Zero provisioning'
"$backup_script"

docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres \
  -v actor_id="$owner_id" -v organization_slug="$organization_slug" -v site_slug="$site_slug" <<'SQL'
begin;
select pg_advisory_xact_lock(hashtext('rava.customer_zero.provision'));
select set_config('request.jwt.claim.sub',:'actor_id',true);
select set_config('request.jwt.claims',jsonb_build_object('sub',:'actor_id','role','authenticated')::text,true);
set local role authenticated;

select public.provision_organization_site(
  'RAVA TEAM', :'organization_slug', 'RAVA TEAM', :'site_slug', 'fa', 'IRR', 'Asia/Tehran'
) as provision_result \gset

select
  (:'provision_result'::jsonb->>'organization_id')::uuid as organization_id,
  (:'provision_result'::jsonb->>'site_id')::uuid as site_id
\gset

select v.id as starter_pack_version_id
from public.starter_content_pack_versions v
join public.starter_content_packs p on p.id=v.starter_pack_id
where p.key='services.digital-agency.rava-team' and v.version=1 and v.status='published'
\gset

select v.id as template_version_id
from public.template_versions v
join public.template_catalog t on t.id=v.template_id
where t.key='rava-service-minimal' and v.version=1 and v.status='published'
\gset

select public.install_starter_pack(
  :'site_id'::uuid,
  :'starter_pack_version_id'::uuid,
  :'template_version_id'::uuid,
  gen_random_uuid(),
  array['fa','en']::text[],
  jsonb_build_object('name','RAVA TEAM')
) as installation_result \gset

select public.record_audit_event(
  'customer_zero.provisioned','site',:'site_id',:'organization_id'::uuid,:'site_id'::uuid,
  null,jsonb_build_object('state','draft'),jsonb_build_object('source','staging_root_provisioning'),
  null,null,'critical'
);
commit;

select
  :'organization_id' as organization_id,
  :'site_id' as site_id,
  (:'installation_result'::jsonb->>'installation_id') as installation_id,
  (select count(*) from public.site_environments where site_id=:'site_id'::uuid) as environments,
  (select count(*) from public.pages where site_id=:'site_id'::uuid and status='draft') as draft_pages,
  (select count(*) from public.pages where site_id=:'site_id'::uuid and status='published') as published_pages,
  (select count(*) from public.site_domains where site_id=:'site_id'::uuid) as domains;
SQL

echo 'Customer Zero provisioned in Staging as draft-only; no domain or Production deployment was created'
