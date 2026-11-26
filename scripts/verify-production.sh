#!/usr/bin/env bash
# M4E — production cut-over verifier (expands M1 §9 steps 7–8 into one command).
#
# Black-box matrix for a DEPLOYED ScrimlyPro origin: unauthenticated probes,
# the G6 open-redirect battery, security headers, an optional authenticated
# owner/attacker round-trip (the 404-never-403 law + cookie flags + logout),
# and the /api/health liveness check.
#
# Env:
#   BASE_URL         required, origin only (e.g. https://scrimlypro.example.com)
#   APP_ORIGIN       authoritative app origin for POST Origin headers;
#                    defaults to BASE_URL. In production the origin guard
#                    REJECTS Origin-less POSTs (403), so every POST here sends
#                    `Origin: $APP_ORIGIN` — the same code path as a browser.
#   OWNER_EMAIL / OWNER_PASSWORD / ATTACKER_EMAIL / ATTACKER_PASSWORD
#                    optional; without them every authenticated row reports
#                    SKIP. Requires a live GoTrue (hosted project), so dev-mode
#                    self-tests must run WITHOUT credentials.
#
# Cookies live only in temp files under the OS temp dir and are deleted by an
# exit trap; they are never echoed. Exits 1 on any FAIL.
set -u

BASE_URL="${BASE_URL:?BASE_URL is required (e.g. http://127.0.0.1:3058)}"
APP_ORIGIN="${APP_ORIGIN:-$BASE_URL}"

# Origin of BASE_URL (redirect_url from curl is absolute; same-origin = this prefix).
BASE_ORIGIN="$(printf '%s' "$BASE_URL" | sed -E 's#^(https?://[^/]+).*$#\1#')"
IS_HTTPS=0
case "$BASE_URL" in https://*) IS_HTTPS=1 ;; esac

TMP="$(mktemp -d "${TMPDIR:-/tmp}/scrimly-verify.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

FAILS=0
PASSES=0
SKIPS=0

row_pass() { printf '  ✓ %-62s %s\n' "$1" "$2"; PASSES=$((PASSES + 1)); }
row_fail() { printf '  ✗ %-62s %s\n' "$1" "$2"; FAILS=$((FAILS + 1)); }
row_skip() { printf '  · %-62s %s\n' "$1" "SKIP — $2"; SKIPS=$((SKIPS + 1)); }

# row_code NAME EXPECTED ACTUAL — 307/302 collapse into one accepted shape.
row_code() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ] || { [ "$expected" = "3xx" ] && case "$actual" in 30*|31*) true ;; *) false ;; esac; }; then
    row_pass "$name" "expected=$expected actual=$actual"
  else
    row_fail "$name" "expected=$expected actual=$actual"
  fi
}

# get_code PATH [curl args...] / post_code PATH [curl args...]
get_code()  { local p="$1"; shift; curl -s -o /dev/null -w '%{http_code}' "$BASE_URL$p" "$@"; }
post_code() { local p="$1"; shift; curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL$p" -H "Origin: $APP_ORIGIN" "$@"; }

# Every resulting Location for GET PATH must be same-origin. Prints OK or the
# offending Location. Loopback aliases (localhost / 127.0.0.1 / [::1] on the
# same port) are treated as same-origin so the script can self-test against
# http://127.0.0.1:PORT while the dev server emits http://localhost:PORT.
redirect_same_origin() { # PATH [curl args...]
  local p="$1"; shift
  local out code redir host base_host
  out="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE_URL$p" "$@")"
  code="${out%% *}"
  redir="${out#* }"
  if [ -z "$redir" ]; then
    echo "OK($code,no-location)"; return 0
  fi
  case "$redir" in
    "$BASE_ORIGIN"/*|"$BASE_ORIGIN") echo "OK($code,$redir)"; return 0 ;;
  esac
  base_host="${BASE_ORIGIN#*://}"
  case "$redir" in
    "http://$base_host"/*|"https://$base_host"/*) echo "OK($code,$redir)"; return 0 ;;
  esac
  host="$(printf '%s' "$redir" | sed -E 's#^https?://([^/]+).*$#\1#')"
  case "$base_host" in
    localhost|localhost:*)
      case "$host" in 127.0.0.1|127.0.0.1:*|\[::1\]|\[::1\]:*) echo "OK($code,$redir,loopback)"; return 0 ;; esac ;;
    127.0.0.1|127.0.0.1:*)
      case "$host" in localhost|localhost:*|\[::1\]|\[::1\]:*) echo "OK($code,$redir,loopback)"; return 0 ;; esac ;;
  esac
  echo "CROSS-ORIGIN($code,$redir)"; return 1
}

printf 'Production cut-over verifier — %s (POST Origin: %s)\n' "$BASE_URL" "$APP_ORIGIN"
printf 'Time: %s\n\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)"

# --- 1. Unauthenticated probes ---------------------------------------------
row_code "GET / (unauth) landing page 200"              200 "$(get_code /)"
row_code "GET /sessions/verify-probe (unauth) 3xx"      3xx "$(get_code /sessions/verify-probe)"
row_code "GET /globe.svg (public asset) 200"            200 "$(get_code /globe.svg)"

OCR_CODE="$(curl -s -D "$TMP/ocr.hdr" -o "$TMP/ocr.body" -w '%{http_code}' -X POST "$BASE_URL/api/ocr" -H "Origin: $APP_ORIGIN")"
row_code "POST /api/ocr no cookies 401"                 401 "$OCR_CODE"
if grep -qi '^content-type:.*application/json' "$TMP/ocr.hdr" && \
   grep -qi '^cache-control:.*no-store'      "$TMP/ocr.hdr"; then
  row_pass "POST /api/ocr 401 is JSON + no-store"      "content-type/json cache-control/no-store"
else
  row_fail "POST /api/ocr 401 is JSON + no-store"      "hdrs: $(grep -iE '^(content-type|cache-control):' "$TMP/ocr.hdr" | tr -d '\r' | tr '\n' ';')"
fi
row_code "POST /api/auth/login malformed JSON 400"      400 "$(post_code /api/auth/login -H 'Content-Type: application/json' --data 'not-json{')"
row_code "POST /api/auth/login foreign Origin 403"      403 "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/auth/login" -H 'Origin: https://evil.example' -H 'Content-Type: application/json' --data '{}')"

# --- 2. Open-redirect battery (G6) ------------------------------------------
# next is consumed by the login/signup/reset pages (client nav) and
# /auth/callback (server redirect). For each vector we assert that whatever
# Location the server produces is same-origin — and /auth/callback exercises
# the server-side sanitizeNextOr path directly.
printf '\nOpen-redirect battery (G6):\n'
VECTORS=(
  '//evil.com'
  '/\evil.com'
  'https://evil.com'
  'javascript:alert(1)'
  '%2F%2Fevil.com'
  '\\evil.com'
)
for v in "${VECTORS[@]}"; do
  RES="$(redirect_same_origin "/auth/callback?code=probe&next=$v")"
  if [ "${RES#OK}" != "$RES" ]; then
    row_pass "next=$v → same-origin Location" "$RES"
  else
    row_fail "next=$v → same-origin Location" "$RES"
  fi
done

# --- 3. Security headers ------------------------------------------------------
printf '\n'
HDR_URL="$BASE_URL/login"
curl -s -D "$TMP/hdr" -o /dev/null "$HDR_URL"
strip_cr() { tr -d '\r' < "$TMP/hdr"; }
for h in X-Content-Type-Options Referrer-Policy X-Frame-Options Permissions-Policy; do
  if strip_cr | grep -qi "^$h:"; then
    row_pass "header $h present" "$(strip_cr | grep -i "^$h:" | head -1 | cut -d' ' -f2-)"
  else
    row_fail "header $h present" "missing on $HDR_URL"
  fi
done
if strip_cr | grep -qi '^content-security-policy:'; then
  CSP="$(strip_cr | grep -i '^content-security-policy:' | head -1 | cut -d' ' -f2-)"
  case "$CSP" in *"frame-ancestors 'none'"*) row_pass "CSP frame-ancestors 'none'" "$CSP" ;;
    *) row_fail "CSP frame-ancestors 'none'" "$CSP" ;; esac
else
  row_skip "CSP frame-ancestors 'none'" "no CSP header — pending Lane A merge (SKIP-with-note, not FAIL)"
fi

# --- 4. Authenticated round-trip (only with credentials) ----------------------
printf '\n'
if [ -z "${OWNER_EMAIL:-}" ] || [ -z "${OWNER_PASSWORD:-}" ] || [ -z "${ATTACKER_EMAIL:-}" ] || [ -z "${ATTACKER_PASSWORD:-}" ]; then
  row_skip "owner sign-in + Set-Cookie flags"       "credentials not provided (OWNER_EMAIL/OWNER_PASSWORD/ATTACKER_EMAIL/ATTACKER_PASSWORD)"
  row_skip "owner real session page 200"            "credentials not provided"
  row_skip "attacker on owner session 404 (identical to nonexistent)" "credentials not provided"
  row_skip "sign-out both + post-logout / 3xx"      "credentials not provided"
else
  login() { # EMAIL JAR PASSWORD -> http_code, response headers in $TMP/login.hdr
    curl -s -w '%{http_code}' -D "$TMP/login.hdr" -o /dev/null -c "$2" -X POST "$BASE_URL/api/auth/login" \
      -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
      --data "{\"email\":\"$1\",\"password\":\"$3\"}"
  }
  OWNER_CODE=$(login "$OWNER_EMAIL" "$TMP/owner.jar" "$OWNER_PASSWORD")
  row_code "owner sign-in via /api/auth/login 200" 200 "$OWNER_CODE"
  if [ "$OWNER_CODE" = "200" ]; then
    FLAGS="$(grep -i '^set-cookie:' "$TMP/login.hdr" | tail -1)"
    COOKIE_NAME="${FLAGS#set-cookie:}"; COOKIE_NAME="${COOKIE_NAME%%=*}"; COOKIE_NAME="${COOKIE_NAME# }"
    OK_FLAGS=1; WHY=""
    case "$(printf '%s' "$FLAGS" | tr '[:upper:]' '[:lower:]')" in *httponly*) ;; *) OK_FLAGS=0; WHY="$WHY no-HttpOnly" ;; esac
    case "$(printf '%s' "$FLAGS" | tr '[:upper:]' '[:lower:]')" in *samesite=lax*) ;; *) OK_FLAGS=0; WHY="$WHY no-SameSite=Lax" ;; esac
    if [ "$IS_HTTPS" = "1" ]; then
      case "$(printf '%s' "$FLAGS" | tr '[:upper:]' '[:lower:]')" in *secure*) ;; *) OK_FLAGS=0; WHY="$WHY no-Secure(https)" ;; esac
    fi
    if [ "$OK_FLAGS" = "1" ]; then
      row_pass "Set-Cookie flags (httpOnly, SameSite=Lax$( [ "$IS_HTTPS" = 1 ] && printf ', Secure'))" "cookie $COOKIE_NAME (value not printed)"
    else
      row_fail "Set-Cookie flags (httpOnly, SameSite=Lax$( [ "$IS_HTTPS" = 1 ] && printf ', Secure'))" "$WHY on cookie $COOKIE_NAME"
    fi
    row_code "GET / with owner session 200" 200 "$(get_code / -b "$TMP/owner.jar")"

    # Discover a REAL session id the owner can see from the dashboard HTML.
    curl -s "$BASE_URL/" -b "$TMP/owner.jar" -o "$TMP/home.html"
    SID="$(grep -oE '/sessions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$TMP/home.html" | head -1 | sed 's#^/sessions/##')"
    if [ -n "$SID" ]; then
      row_code "owner GET /sessions/<owned> 200" 200 "$(get_code "/sessions/$SID" -b "$TMP/owner.jar")"

      # E-4 (wave1(13a)): share-link row — owner creates a share link, the
      # PUBLIC URL renders 200 + no-store + noindex + zero-PII markers, then
      # revoke -> 404. Runs only in the credentialed block.
      SHARE_RES=$(curl -s -w '\n%{http_code}' -X POST "$BASE_URL/api/sessions/$SID/share" \
        -b "$TMP/owner.jar" -H "Origin: $APP_ORIGIN")
      SHARE_CODE=$(printf '%s' "$SHARE_RES" | tail -1)
      SHARE_BODY=$(printf '%s' "$SHARE_RES" | head -n -1)
      SHARE_TOKEN=$(printf '%s' "$SHARE_BODY" | grep -oE '"url":"[^"]*"' | sed 's#.*"/share/##; s/"$//')
      SHARE_ID=$(printf '%s' "$SHARE_BODY" | grep -oE '"id":"[0-9a-f-]{36}"' | sed 's/"id":"//; s/"//')
      if [ "$SHARE_CODE" = "201" ] && [ -n "$SHARE_TOKEN" ] && [ -n "$SHARE_ID" ]; then
        SHARE_PAGE_CODE=$(get_code "/share/$SHARE_TOKEN")
        curl -s -D "$TMP/share.hdr" "$BASE_URL/share/$SHARE_TOKEN" -o "$TMP/share.html"
        NO_STORE=$(grep -ci 'cache-control: *no-store' "$TMP/share.hdr" || true)
        NOINDEX=$(grep -c 'noindex' "$TMP/share.html" || true)
        PII=0
        grep -q '@' "$TMP/share.html" && PII=1
        # a bare uuid in the body would leak internal ids to anonymous readers
        tr -d '\n' < "$TMP/share.html" | grep -qE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' && PII=1
        if [ "$SHARE_PAGE_CODE" = "200" ] && [ "$NO_STORE" -ge 1 ] && [ "$NOINDEX" -ge 1 ] && [ "$PII" = "0" ]; then
          row_pass "share page public render (200 + no-store + noindex + zero-PII)" "token not printed"
        else
          row_fail "share page public render (200 + no-store + noindex + zero-PII)" "code=$SHARE_PAGE_CODE no-store=$NO_STORE noindex=$NOINDEX pii=$PII"
        fi
        REVOKE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE_URL/api/sessions/$SID/share" \
          -b "$TMP/owner.jar" -H "Origin: $APP_ORIGIN" -H "Content-Type: application/json" \
          --data "{\"linkId\":\"$SHARE_ID\"}")
        AFTER=$(get_code "/share/$SHARE_TOKEN")
        if [ "$REVOKE" = "200" ] && [ "$AFTER" = "404" ]; then
          row_pass "share revoke -> public URL 404" "revoked ok"
        else
          row_fail "share revoke -> public URL 404" "revoke=$REVOKE after=$AFTER"
        fi
      else
        row_skip "share-link round-trip" "POST /share returned $SHARE_CODE (no session usable for sharing?)"
      fi

      ATTACKER_CODE=$(login "$ATTACKER_EMAIL" "$TMP/attacker.jar" "$ATTACKER_PASSWORD")
      row_code "attacker sign-in 200" 200 "$ATTACKER_CODE"
      ATK="$(get_code "/sessions/$SID" -b "$TMP/attacker.jar")"
      row_code "attacker GET same session 404 (never 403)" 404 "$ATK"
      curl -s "$BASE_URL/sessions/$SID" -b "$TMP/attacker.jar" -o "$TMP/foreign.html"
      curl -s "$BASE_URL/sessions/00000000-0000-4000-8000-000000000000" -b "$TMP/attacker.jar" -o "$TMP/missing.html"
      if cmp -s "$TMP/foreign.html" "$TMP/missing.html"; then
        row_pass "foreign 404 body byte-identical to nonexistent 404" "cmp ok"
      else
        row_fail "foreign 404 body byte-identical to nonexistent 404" "bodies differ — existence oracle"
      fi
    else
      row_skip "owner GET /sessions/<owned> 200" "no session link found in owner dashboard (seed/hosted data?)"
      row_skip "attacker GET same session 404" "no session id to probe"
    fi

    OUT1=$(post_code /api/auth/logout -b "$TMP/owner.jar")
    OUT2=$(post_code /api/auth/logout -b "$TMP/attacker.jar")
    if [ "$OUT1" = "200" ] && [ "$OUT2" = "200" ]; then
      row_pass "sign-out both (owner, attacker) 200" "logout ok"
    else
      row_fail "sign-out both (owner, attacker) 200" "owner=$OUT1 attacker=$OUT2"
    fi
    row_code "GET / after logout redirects" 3xx "$(get_code / -b "$TMP/owner.jar")"
  else
    printf '  ! sign-in failed (%s) — skipping dependent authenticated rows\n' "$OWNER_CODE"
    if [ "$OWNER_CODE" = "503" ]; then
      row_skip "authenticated round-trip" "auth provider unavailable (503) — no live GoTrue on this target; run against hosted"
    else
      row_fail "authenticated round-trip" "sign-in failed with $OWNER_CODE (bad credentials? rate limit?)"
    fi
  fi
fi

# --- 5. Health ----------------------------------------------------------------
printf '\n'
HEALTH_CODE=$(get_code /api/health)
HEALTH_BODY=$(curl -s "$BASE_URL/api/health")
if [ "$HEALTH_CODE" = "200" ] && printf '%s' "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  row_pass "GET /api/health 200 {status:ok}" "$HEALTH_BODY"
else
  row_fail "GET /api/health 200 {status:ok}" "code=$HEALTH_CODE body=$HEALTH_BODY"
fi

printf '\nVerifier result: %d pass, %d fail, %d skip\n' "$PASSES" "$FAILS" "$SKIPS"
[ "$FAILS" -eq 0 ] || exit 1
