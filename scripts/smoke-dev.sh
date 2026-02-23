#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3001}"
CLIENT_ORIGIN="${CLIENT_ORIGIN:-http://127.0.0.1:3002}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@rybbit-lite.local}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-RybbitLite!12345}"
TEST_USER_NAME="${TEST_USER_NAME:-rybbit-lite-test}"
TRACK_WAIT_SECONDS="${TRACK_WAIT_SECONDS:-2}"
SMOKE_EVENT_PREFIX="${SMOKE_EVENT_PREFIX:-smoke_dev}"
SMOKE_UA="${SMOKE_UA:-Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36}"

TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
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

echo "[smoke] 1/7 health check"
health_code="$(curl -s -o "$TMP_DIR/health.txt" -w '%{http_code}' "${BACKEND_URL}/api/health")"
if [[ "$health_code" != "200" ]]; then
  echo "[smoke] health failed: ${health_code}"
  cat "$TMP_DIR/health.txt"
  exit 1
fi

echo "[smoke] 2/7 sign-in"
signin_payload="{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}"
signin_code="$(req POST '/api/auth/sign-in/email' "$signin_payload")"

if [[ "$signin_code" != "200" ]]; then
  echo "[smoke] sign-in failed (${signin_code}), trying sign-up"
  signup_payload="{\"name\":\"${TEST_USER_NAME}\",\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}"
  signup_code="$(req POST '/api/auth/sign-up/email' "$signup_payload")"

  if [[ "$signup_code" != "200" && "$signup_code" != "201" && "$signup_code" != "409" ]]; then
    echo "[smoke] sign-up failed: ${signup_code}"
    cat "$TMP_DIR/resp.json"
    exit 1
  fi

  signin_code="$(req POST '/api/auth/sign-in/email' "$signin_payload")"
  if [[ "$signin_code" != "200" ]]; then
    echo "[smoke] sign-in retry failed: ${signin_code}"
    cat "$TMP_DIR/resp.json"
    exit 1
  fi
fi

echo "[smoke] 3/7 fetch organizations"
orgs_code="$(req GET '/api/user/organizations')"
if [[ "$orgs_code" != "200" ]]; then
  echo "[smoke] organizations failed: ${orgs_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

org_id="$(json_get 'x?.[0]?.id')"
if [[ -z "$org_id" ]]; then
  echo "[smoke] no organization found for ${TEST_USER_EMAIL}"
  echo "[smoke] create one in UI, then re-run"
  exit 1
fi

echo "[smoke] 4/7 fetch sites for org ${org_id}"
sites_code="$(req GET "/api/organizations/${org_id}/sites")"
if [[ "$sites_code" != "200" ]]; then
  echo "[smoke] organization sites failed: ${sites_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

site_id="$(json_get 'x?.sites?.[0]?.siteId')"
site_public_id="$(json_get 'x?.sites?.[0]?.id')"
if [[ -z "$site_id" ]]; then
  echo "[smoke] no site found in org ${org_id}"
  echo "[smoke] create one site in UI, then re-run"
  exit 1
fi
if [[ -z "$site_public_id" ]]; then
  echo "[smoke] site public id missing in org ${org_id}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

echo "[smoke] 5/7 send custom event to /api/track"
event_name="${SMOKE_EVENT_PREFIX}_$(date +%s)"
track_payload="{\"type\":\"custom_event\",\"site_id\":\"${site_public_id}\",\"event_name\":\"${event_name}\",\"properties\":\"{\\\"source\\\":\\\"smoke-dev\\\"}\",\"hostname\":\"smoke.local\",\"pathname\":\"/smoke\",\"querystring\":\"\",\"page_title\":\"Smoke\",\"user_agent\":\"${SMOKE_UA}\",\"language\":\"en-US\"}"
track_code="$(req POST '/api/track' "$track_payload")"
if [[ "$track_code" != "200" ]]; then
  echo "[smoke] track failed: ${track_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

track_success="$(json_get 'x?.success')"
track_message="$(json_get 'x?.message')"
if [[ "$track_success" != "true" ]]; then
  echo "[smoke] track response not successful"
  cat "$TMP_DIR/resp.json"
  exit 1
fi
if [[ "$track_message" == "Event not tracked - bot detected" || "$track_message" == "Event not tracked - IP excluded" ]]; then
  echo "[smoke] track filtered unexpectedly: ${track_message}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

sleep "$TRACK_WAIT_SECONDS"

echo "[smoke] 6/7 verify event appears in analytics"
events_code="$(req GET "/api/sites/${site_id}/events/names?past_minutes_start=10&past_minutes_end=0")"
if [[ "$events_code" != "200" ]]; then
  echo "[smoke] events/names failed: ${events_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

event_found="$(EVENT_NAME="$event_name" node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const ok=Array.isArray(x?.data)&&x.data.some(i=>i?.eventName===process.env.EVENT_NAME);process.stdout.write(ok?'yes':'no');" "$TMP_DIR/resp.json")"
if [[ "$event_found" != "yes" ]]; then
  echo "[smoke] tracked event not found in events/names: ${event_name}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

echo "[smoke] 7/7 analytics overview (site ${site_id})"
overview_code="$(req GET "/api/sites/${site_id}/overview?past_minutes_start=60&past_minutes_end=0")"
if [[ "$overview_code" != "200" ]]; then
  echo "[smoke] overview failed: ${overview_code}"
  cat "$TMP_DIR/resp.json"
  exit 1
fi

echo "[smoke] PASS (org_id=${org_id}, site_id=${site_id}, event_name=${event_name})"
