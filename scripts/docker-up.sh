#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${CONTAINER_NAME:-pocketlytics-all}"
IMAGE_NAME="${IMAGE_NAME:-pocketlytics:all}"
HOST_BACKEND_PORT="${HOST_BACKEND_PORT:-3001}"
HOST_CLIENT_PORT="${HOST_CLIENT_PORT:-3002}"
DATA_VOLUME="${DATA_VOLUME:-pocketlytics-data}"
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-pocketlytics-local-dev-secret-change-me}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${HOST_BACKEND_PORT}}"

resolve_docker() {
  if [[ -n "${DOCKER_BIN:-}" && -x "${DOCKER_BIN}" ]]; then
    echo "${DOCKER_BIN}"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    command -v docker
    return
  fi

  if [[ -x "/Applications/Docker.app/Contents/Resources/bin/docker" ]]; then
    echo "/Applications/Docker.app/Contents/Resources/bin/docker"
    return
  fi

  if [[ -x "/opt/homebrew/bin/docker" ]]; then
    echo "/opt/homebrew/bin/docker"
    return
  fi

  echo "docker binary not found. Set DOCKER_BIN or add docker to PATH." >&2
  exit 1
}

DOCKER="$(resolve_docker)"
DOCKER_DIR="$(dirname "${DOCKER}")"
if [[ ":${PATH}:" != *":${DOCKER_DIR}:"* ]]; then
  export PATH="${DOCKER_DIR}:${PATH}"
fi

echo "[docker-up] docker binary: ${DOCKER}"
"${DOCKER}" version >/dev/null

echo "[docker-up] building image: ${IMAGE_NAME}"
"${DOCKER}" build -t "${IMAGE_NAME}" "${ROOT_DIR}"

if "${DOCKER}" ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "[docker-up] removing existing container: ${CONTAINER_NAME}"
  "${DOCKER}" rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "[docker-up] starting container: ${CONTAINER_NAME}"
"${DOCKER}" run -d \
  --name "${CONTAINER_NAME}" \
  -p "${HOST_BACKEND_PORT}:3001" \
  -p "${HOST_CLIENT_PORT}:3002" \
  -e BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}" \
  -e BASE_URL="${BASE_URL}" \
  -v "${DATA_VOLUME}:/app/data" \
  "${IMAGE_NAME}" >/dev/null

if command -v curl >/dev/null 2>&1; then
  echo "[docker-up] waiting for backend health..."
  for _ in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${HOST_BACKEND_PORT}/api/health" >/dev/null 2>&1; then
      echo "[docker-up] backend healthy"
      break
    fi
    sleep 1
  done

  if ! curl -fsS "http://127.0.0.1:${HOST_BACKEND_PORT}/api/health" >/dev/null 2>&1; then
    echo "[docker-up] backend health check failed, recent logs:" >&2
    "${DOCKER}" logs --tail 120 "${CONTAINER_NAME}" >&2 || true
    exit 1
  fi
fi

echo "[docker-up] done"
echo "[docker-up] backend: http://127.0.0.1:${HOST_BACKEND_PORT}"
echo "[docker-up] frontend: http://127.0.0.1:${HOST_CLIENT_PORT}"
echo "[docker-up] logs: ${DOCKER} logs -f ${CONTAINER_NAME}"
