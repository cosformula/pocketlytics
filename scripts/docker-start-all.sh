#!/usr/bin/env bash
set -euo pipefail

mkdir -p /app/data

if [[ -z "${NEXT_PUBLIC_BACKEND_URL:-}" ]]; then
  export NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:${PORT:-3001}"
fi

cd /app/backend
npx drizzle-kit push 2>/dev/null || true
node dist/index.js &
BACKEND_PID=$!

cd /app/client
PORT="${CLIENT_PORT:-3002}" HOSTNAME=0.0.0.0 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 node server.js &
CLIENT_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$CLIENT_PID" 2>/dev/null || true
}

trap cleanup INT TERM

wait -n "$BACKEND_PID" "$CLIENT_PID"
EXIT_CODE=$?
cleanup
wait "$BACKEND_PID" "$CLIENT_PID" 2>/dev/null || true
exit "$EXIT_CODE"
