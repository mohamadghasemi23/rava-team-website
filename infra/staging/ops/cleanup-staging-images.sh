#!/bin/sh
set -eu

apply=false
[ "${1:-}" = --apply ] && apply=true

for container in rava-web-staging-app-1 rava-web-staging-proxy-1; do
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)
  if [ "$health" != healthy ]; then
    echo "$container is not healthy; refusing cleanup" >&2
    exit 1
  fi
done

running_ref=$(docker inspect --format '{{.Config.Image}}' rava-web-staging-app-1)
printf 'preserve running image: %s\n' "$running_ref"
printf 'preserve rollback image: rava-web:rollback-staging\n'
docker image ls rava-web --format '{{.Repository}}:{{.Tag}}' | while IFS= read -r image_ref; do
  [ -n "$image_ref" ] || continue
  case "$image_ref" in "$running_ref"|rava-web:rollback-staging) continue ;; esac
  if $apply; then docker image rm "$image_ref"; else printf 'would remove: %s\n' "$image_ref"; fi
done

docker image ls ghcr.io/mohamadghasemi23/rava-team-website --format '{{.Repository}}:{{.Tag}}' | while IFS= read -r image_ref; do
  [ -n "$image_ref" ] || continue
  image_id=$(docker image inspect "$image_ref" --format '{{.Id}}')
  running_id=$(docker image inspect "$running_ref" --format '{{.Id}}')
  rollback_id=$(docker image inspect rava-web:rollback-staging --format '{{.Id}}' 2>/dev/null || true)
  case "$image_id" in "$running_id"|"$rollback_id") continue ;; esac
  if $apply; then docker image rm "$image_ref"; else printf 'would remove registry tag: %s\n' "$image_ref"; fi
done

if ! $apply; then echo 'dry run only; pass --apply after reviewing the exact list'; fi
