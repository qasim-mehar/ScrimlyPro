#!/usr/bin/env bash
# G3 — API auth matrix verification (M1 §9).
# Env: BASE_URL (required, e.g. http://127.0.0.1:3042)
#      OWNER_COOKIE / ATTACKER_COOKIE (optional "name=value; ..." jars; when
#      absent the script verifies the FAIL-CLOSED columns — the ones that hold
#      in every environment, including the no-GoTrue local mode).
# Exits 1 on any mismatch.
set -u

BASE_URL="${BASE_URL:?BASE_URL is required (e.g. http://127.0.0.1:3042)}"
FAILS=0
PASS=0

row() { # name expected actual
  if [ "$2" = "$3" ]; then
    printf '  ✓ %-58s expected=%s\n' "$1" "$2"
    PASS=$((PASS + 1))
  else
    printf '  ✗ %-58s expected=%s actual=%s\n' "$1" "$2" "$3"
    FAILS=$((FAILS + 1))
  fi
}

code() { # method path [extra curl args...]
  local method="$1" path="$2"; shift 2
  curl -s -o /dev/null -w '%{http_code}' -X "$method" "$BASE_URL$path" "$@"
}

printf 'API auth matrix — %s\n' "$BASE_URL"

# --- Unauthenticated (fail-closed) columns --------------------------------
row "POST /api/ocr, no cookies"                 401 "$(code POST /api/ocr -H 'x-scrimly-no-origin-test: 1')"
row "POST /api/ocr, garbage cookie"             401 "$(code POST /api/ocr -H 'x-scrimly-no-origin-test: 1' -H 'Cookie: sb-auth-token=garbage')"
row "POST /api/ocr, foreign Origin"             403 "$(code POST /api/ocr -H 'Origin: https://evil.example')"
row "POST /api/auth/login, garbage JSON"        400 "$(code POST /api/auth/login -H 'x-scrimly-no-origin-test: 1' -H 'Content-Type: application/json' --data 'not-json{')"
row "POST /api/auth/login, no Origin"           403 "$(code POST /api/auth/login --data '{}')"

# --- Proxy / public surface (G5 probes) -----------------------------------
row "GET / (unauthenticated) redirects"         307 "$(code GET /)"
row "GET /sessions/abc (unauth) redirects"      307 "$(code GET /sessions/abc)"
row "GET /login is public"                      200 "$(code GET /login)"
row "GET /signup is public"                     200 "$(code GET /signup)"
row "GET /favicon.ico is public"                200 "$(code GET /favicon.ico)"
LOCATION=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE_URL/sessions/abc")
case "$LOCATION" in
  */login?next=%2Fsessions%2Fabc) printf '  ✓ %-58s %s\n' "redirect next param sanitized" "$LOCATION"; PASS=$((PASS+1));;
  *) printf '  ✗ %-58s %s\n' "redirect next param sanitized" "$LOCATION"; FAILS=$((FAILS+1));;
esac
OPENRED=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/login?next=%2F%2Fevil.com")
printf '  · %s next=%s\n' "open-redirect probe (G6): //evil.com → HTTP" "$OPENRED"

# --- Authenticated columns (only with cookie jars) -------------------------
if [ -n "${OWNER_COOKIE:-}" ]; then
  row "POST /api/ocr, owner cookie (no origin hdr)" 403 "$(code POST /api/ocr -H "Cookie: $OWNER_COOKIE")"
  code GET /sessions -H "Cookie: $OWNER_COOKIE" | grep -q . && true
  OWN=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/" -H "Cookie: $OWNER_COOKIE")
  row "GET / with owner cookie does NOT redirect" 200 "$OWN"
fi
if [ -n "${ATTACKER_COOKIE:-}" ]; then
  ATK=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/" -H "Cookie: $ATTACKER_COOKIE")
  row "GET / with attacker cookie does NOT redirect" 200 "$ATK"
fi

printf '\nMatrix result: %d pass, %d fail\n' "$PASS" "$FAILS"
[ "$FAILS" -eq 0 ] || exit 1
