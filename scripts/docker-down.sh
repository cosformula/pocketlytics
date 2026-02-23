#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-pocketlytics-all}"

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

if "${DOCKER}" ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "[docker-down] removing container: ${CONTAINER_NAME}"
  "${DOCKER}" rm -f "${CONTAINER_NAME}" >/dev/null
  echo "[docker-down] done"
else
  echo "[docker-down] container not found: ${CONTAINER_NAME}"
fi
