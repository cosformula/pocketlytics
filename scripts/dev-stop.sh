#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="${ROOT_DIR}/.tmp"

stop_pid_file() {
  local pid_file="$1"
  local name="$2"

  if [[ ! -f "${pid_file}" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}" 2>/dev/null || true)"
  if [[ -z "${pid}" ]]; then
    rm -f "${pid_file}"
    return 0
  fi

  if kill -0 "${pid}" >/dev/null 2>&1; then
    echo "[dev-stop] stopping ${name} pid=${pid}"
    kill "${pid}" >/dev/null 2>&1 || true
  fi

  rm -f "${pid_file}"
}

stop_port_listener() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "[dev-stop] stopping listener(s) on :${port} (${pids})"
    # shellcheck disable=SC2086
    kill ${pids} >/dev/null 2>&1 || true
  fi
}

stop_pid_file "${TMP_DIR}/backend.pid" "backend"
stop_pid_file "${TMP_DIR}/frontend.pid" "frontend"

# Fallback by port in case pid files are stale/missing.
stop_port_listener 3001
stop_port_listener 3002

echo "[dev-stop] done."

