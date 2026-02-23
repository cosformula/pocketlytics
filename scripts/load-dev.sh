#!/usr/bin/env bash
set -euo pipefail

# Load local backend env when available (for TEST_USER_* and related vars).
if [[ -f "./server/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "./server/.env"
  set +a
fi

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3001}"
CLIENT_ORIGIN="${CLIENT_ORIGIN:-http://127.0.0.1:3002}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@rybbit-lite.local}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-RybbitLite!12345}"
CONCURRENCY="${CONCURRENCY:-20}"
ROUNDS="${ROUNDS:-5}"

TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
URL_LIST="$TMP_DIR/urls.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

req() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local out="$TMP_DIR/resp.json"
  local code

  if [[ -n "$body" ]]; then
    code="$(curl -s -o "$out" -w '%{http_code}' "${BACKEND_URL}${path}" \
      -X "$method" \
      -H "Origin: ${CLIENT_ORIGIN}" \
      -H "Referer: ${CLIENT_ORIGIN}/" \
      -H 'content-type: application/json' \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      --data-raw "$body")"
  else
    code="$(curl -s -o "$out" -w '%{http_code}' "${BACKEND_URL}${path}" \
      -X "$method" \
      -H "Origin: ${CLIENT_ORIGIN}" \
      -H "Referer: ${CLIENT_ORIGIN}/" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR")"
  fi

  printf '%s' "$code"
}

json_get() {
  local expr="$1"
  node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const v=(function(){try{return ${expr}}catch(_){return ''}})();process.stdout.write(v===undefined||v===null?'':String(v));" "$TMP_DIR/resp.json"
}

echo "[load] health"
health_code="$(curl -s -o "$TMP_DIR/health.txt" -w '%{http_code}' "${BACKEND_URL}/api/health")"
if [[ "$health_code" != "200" ]]; then
  echo "[load] health failed: ${health_code}"
  cat "$TMP_DIR/health.txt"
  exit 1
fi

echo "[load] sign-in"
signin_payload="{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}"
signin_code="$(req POST '/api/auth/sign-in/email' "$signin_payload")"
if [[ "$signin_code" != "200" ]]; then
  echo "[load] sign-in failed: ${signin_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

orgs_code="$(req GET '/api/user/organizations')"
if [[ "$orgs_code" != "200" ]]; then
  echo "[load] organizations failed: ${orgs_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi
org_id="$(json_get 'x?.[0]?.id')"
if [[ -z "$org_id" ]]; then
  echo "[load] no organization found"
  exit 1
fi

SITE_ID="${SITE_ID:-}"
TODAY_UTC="$(date -u +%F)"
if [[ -z "$SITE_ID" ]]; then
  sites_code="$(req GET "/api/organizations/${org_id}/sites")"
  if [[ "$sites_code" != "200" ]]; then
    echo "[load] organization sites failed: ${sites_code}"
    cat "$TMP_DIR/resp.json"
    exit 1
  fi
  SITE_ID="$(json_get 'x?.sites?.[0]?.siteId')"
fi

if [[ -z "$SITE_ID" ]]; then
  echo "[load] no site found. Set SITE_ID=... or create one site first"
  exit 1
fi

echo "[load] org=${org_id}, site=${SITE_ID}, concurrency=${CONCURRENCY}, rounds=${ROUNDS}"

base_paths=(
  "/api/organizations/${org_id}/sites"
  "/api/sites/${SITE_ID}/overview?past_minutes_start=60&past_minutes_end=0"
  "/api/sites/${SITE_ID}/page-titles?past_minutes_start=60&past_minutes_end=0&page=1&limit=10"
  "/api/sites/${SITE_ID}/events/names?past_minutes_start=60&past_minutes_end=0"
  "/api/sites/${SITE_ID}/events/names?start_date=${TODAY_UTC}&end_date=${TODAY_UTC}&time_zone=UTC"
  "/api/sites/${SITE_ID}/metric?parameter=referrer&past_minutes_start=60&past_minutes_end=0&page=1&limit=20"
  "/api/sites/${SITE_ID}/metric?parameter=browser&past_minutes_start=60&past_minutes_end=0&page=1&limit=20"
  "/api/sites/${SITE_ID}/metric?parameter=referrer&start_date=${TODAY_UTC}&end_date=${TODAY_UTC}&time_zone=UTC&page=1&limit=20"
  "/api/sites/${SITE_ID}/metric?parameter=browser&start_date=${TODAY_UTC}&end_date=${TODAY_UTC}&time_zone=UTC&page=1&limit=20"
)

: > "$URL_LIST"
for ((r=1; r<=ROUNDS; r++)); do
  for p in "${base_paths[@]}"; do
    printf '%s\n' "$p" >> "$URL_LIST"
  done
done

export BACKEND_URL CLIENT_ORIGIN COOKIE_JAR TMP_DIR

set +e
xargs -P "$CONCURRENCY" -I{} sh -c '
  path="$1"
  out="$(mktemp "$TMP_DIR/load.XXXXXX")"
  code="$(curl -s -o "$out" -w "%{http_code}" "${BACKEND_URL}${path}" \
    -H "Origin: ${CLIENT_ORIGIN}" \
    -H "Referer: ${CLIENT_ORIGIN}/" \
    -b "$COOKIE_JAR")"
  if [ "$code" != "200" ]; then
    echo "[load] FAIL $code $path"
    cat "$out"
    rm -f "$out"
    exit 1
  fi
  rm -f "$out"
' _ {} < "$URL_LIST"
load_rc=$?
set -e

if [[ "$load_rc" -ne 0 ]]; then
  echo "[load] FAILED"
  exit "$load_rc"
fi

echo "[load] PASS"
