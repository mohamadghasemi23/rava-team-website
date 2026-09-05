#!/bin/sh
set -eu

repo_dir=${RAVA_REPO_DIR:-/home/ravaops/projects/rava-team-website}
host=${RAVA_PREVIEW_HOST:-127.0.0.1}
port=${RAVA_PREVIEW_PORT:-13100}
runtime_dir=${RAVA_PREVIEW_RUNTIME_DIR:-/tmp/rava-preview-$(id -u)}
pid_file="$runtime_dir/server.pid"
log_file="$runtime_dir/server.log"
node_bin=${RAVA_PREVIEW_NODE:-/home/ravaops/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node}
preview_url="http://$host:$port/design-preview/rava-living-system"

mkdir -p "$runtime_dir"
chmod 700 "$runtime_dir"

if [ ! -x "$node_bin" ]; then node_bin=$(command -v node || true); fi
[ -n "$node_bin" ] && [ -x "$node_bin" ] || { echo 'Node.js is unavailable' >&2; exit 1; }
[ -f "$repo_dir/node_modules/next/dist/bin/next" ] || { echo 'Project dependencies are unavailable; run npm ci first' >&2; exit 1; }

running() {
  [ -f "$pid_file" ] || return 1
  pid=$(cat "$pid_file")
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

start() {
  if running; then echo "RAVA design preview is already running: $preview_url"; return; fi
  rm -f "$pid_file"
  cd "$repo_dir"
  setsid env RAVA_DESIGN_PREVIEW=1 NODE_ENV=development \
    "$node_bin" node_modules/next/dist/bin/next dev --hostname "$host" --port "$port" \
    >"$log_file" 2>&1 &
  pid=$!
  printf '%s\n' "$pid" >"$pid_file"
  attempt=0
  while [ "$attempt" -lt 40 ]; do
    if curl -fsS --max-time 2 -o /dev/null "$preview_url" 2>/dev/null; then
      echo "RAVA design preview is ready: $preview_url"
      return
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "RAVA design preview failed; inspect: rava-preview logs" >&2
      tail -n 30 "$log_file" >&2 || true
      rm -f "$pid_file"
      exit 1
    fi
    attempt=$((attempt+1))
    sleep 1
  done
  echo "RAVA design preview did not become ready; inspect: rava-preview logs" >&2
  exit 1
}

stop() {
  if ! running; then rm -f "$pid_file"; echo 'RAVA design preview is not running'; return; fi
  pid=$(cat "$pid_file")
  kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  attempt=0
  while kill -0 "$pid" 2>/dev/null && [ "$attempt" -lt 20 ]; do attempt=$((attempt+1)); sleep 1; done
  rm -f "$pid_file"
  echo 'RAVA design preview stopped'
}

status() {
  if running && curl -fsS --max-time 3 -o /dev/null "$preview_url"; then
    echo "RAVA design preview is healthy: $preview_url"
    return
  fi
  echo 'RAVA design preview is stopped or unhealthy'
  exit 1
}

case ${1:-start} in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  logs) touch "$log_file"; tail -n 80 "$log_file" ;;
  *) echo 'usage: rava-preview [start|stop|restart|status|logs]' >&2; exit 2 ;;
esac
