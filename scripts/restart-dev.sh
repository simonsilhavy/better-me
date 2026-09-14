#!/usr/bin/env bash
# Restarts the local server against the dev database.
#
# Written because the obvious `pkill -f next-server` kills the shell running
# it — the pattern matches the command itself — and because a server left
# alive while `.next` is rebuilt under it goes on serving HTML that points at
# chunk files the rebuild replaced. That failure looks like a broken page, not
# like a stale server, and costs a while to work out.
#
#   scripts/restart-dev.sh          # rebuild and start
#   scripts/restart-dev.sh --stop   # only stop
set -euo pipefail

stop() {
  # By PID, never by pattern: matching on the command line catches this script.
  local pids
  pids=$(ps ax -o pid=,command= | grep '[n]ext-server' | awk '{print $1}' || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs -r kill
    sleep 2
  fi
  echo "zastaveno"
}

stop
[ "${1:-}" = "--stop" ] && exit 0

cd "$(dirname "$0")/.."
# Rebuilding only once nothing is serving the old build.
npm run build
npm run start > /tmp/next.log 2>&1 &

for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login || true)" = "200" ]; then
    echo "server běží na http://localhost:3000"
    exit 0
  fi
  sleep 1
done

echo "server nenaskočil, poslední řádky logu:" >&2
tail -20 /tmp/next.log >&2
exit 1
