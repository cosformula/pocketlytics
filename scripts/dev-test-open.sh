#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3002}"
TMP_DIR="${ROOT_DIR}/.tmp"
mkdir -p "${TMP_DIR}"

# Load backend dev env if available.
if [[ -f "${ROOT_DIR}/server/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/server/.env"
  set +a
fi

# Force local file paths for non-Docker dev runs.
if [[ -z "${SQLITE_DB_PATH:-}" || "${SQLITE_DB_PATH}" == file:/app/* ]]; then
  SQLITE_DB_PATH="file:./data/rybbit.sqlite"
fi
if [[ -z "${DUCKDB_PATH:-}" || "${DUCKDB_PATH}" == /app/* ]]; then
  DUCKDB_PATH="./data/rybbit-analytics.duckdb"
fi
mkdir -p "${ROOT_DIR}/server/data"

BACKEND_LOG="${TMP_DIR}/backend.dev.log"
FRONTEND_LOG="${TMP_DIR}/frontend.dev.log"

wait_for_url() {
  local url="$1"
  local name="$2"
  local max_seconds="${3:-90}"
  local elapsed=0

  while (( elapsed < max_seconds )); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      echo "[dev-test-open] ${name} is ready: ${url}"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "[dev-test-open] ${name} failed to become ready in ${max_seconds}s"
  return 1
}

open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "${url}" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

ensure_shared_built() {
  if [[ ! -f "${ROOT_DIR}/shared/dist/index.js" ]]; then
    echo "[dev-test-open] shared/dist missing, building shared package..."
    (cd "${ROOT_DIR}/shared" && npm install && npm run build)
  fi
}

kill_port_listener() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "[dev-test-open] stopping existing listener(s) on :${port} (${pids})"
    # shellcheck disable=SC2086
    kill ${pids} >/dev/null 2>&1 || true
  fi
}

echo "[dev-test-open] workspace: ${ROOT_DIR}"
ensure_shared_built

echo "[dev-test-open] running analytics backend regression tests..."
(cd "${ROOT_DIR}/server" && npm run test:run -- src/__tests__/analytics-duckdb.test.ts)

kill_port_listener 3001
kill_port_listener 3002

echo "[dev-test-open] starting backend..."
(
  cd "${ROOT_DIR}/server"
  nohup env \
    SQLITE_DB_PATH="${SQLITE_DB_PATH}" \
    DUCKDB_PATH="${DUCKDB_PATH}" \
    npm run dev >"${BACKEND_LOG}" 2>&1 &
  echo $! >"${TMP_DIR}/backend.pid"
)
BACKEND_PID="$(cat "${TMP_DIR}/backend.pid")"
echo "[dev-test-open] backend pid=${BACKEND_PID} log=${BACKEND_LOG}"

echo "[dev-test-open] starting frontend..."
(
  cd "${ROOT_DIR}/client"
  nohup npm run dev >"${FRONTEND_LOG}" 2>&1 &
  echo $! >"${TMP_DIR}/frontend.pid"
)
FRONTEND_PID="$(cat "${TMP_DIR}/frontend.pid")"
echo "[dev-test-open] frontend pid=${FRONTEND_PID} log=${FRONTEND_LOG}"

wait_for_url "${BACKEND_URL}/api/health" "backend" 90
wait_for_url "${FRONTEND_URL}" "frontend" 120

echo "[dev-test-open] running smoke test..."
(cd "${ROOT_DIR}" && npm run smoke:dev)

if [[ "${RUN_ENDPOINT_SWEEP:-1}" == "1" ]]; then
  echo "[dev-test-open] running endpoint sweep..."
  (cd "${ROOT_DIR}" && npm run endpoints:dev)
fi

echo "[dev-test-open] opening browser..."
if ! open_url "${FRONTEND_URL}"; then
  echo "[dev-test-open] could not auto-open browser. Open this URL manually:"
  echo "  ${FRONTEND_URL}"
fi

echo "[dev-test-open] done."
echo "[dev-test-open] backend log:  ${BACKEND_LOG}"
echo "[dev-test-open] frontend log: ${FRONTEND_LOG}"
