# M4E — Cut-over Automation & Backup Tooling Report

## 1. Outcome (base commit, branch, counts)

- **Base:** `m1-multitenancy-foundation` tip `9b50f83` (the brief named
  `4d45aa7`; the branch has since advanced through the M1 review + hardening
  passes, which are ancestors of the tip — Lane E branched from the tip per
  LANES-README). `rg verify-auth-matrix scripts/` hit confirmed before
  starting.
- **Branch / worktree:** `qasim/m4-ops` at `../scrimlypro-m4e`, port 3058,
  database `scrimlypro_ops` on the shared local PG 17.6 cluster
  (127.0.0.1:54329), migrations + seed applied via `npm run db:reset`.
- **Baseline gates on the tip:** `npx tsc --noEmit` exit 0 · `npm test`
  **460/460** (32 files) · `npm run build` exit 0 · `npm run lint` exit 1
  with exactly **one pre-existing error** in
  `lib/auth/action-guard.ts:5` (Lane A's restricted-import perimeter fires on
  Lane A's own file; verified identical in the pristine m1 worktree at the
  same commit — recorded as a baseline deviation, not introduced and not
  fixed by this lane).
- **Final gates after this lane:** identical shape — tsc 0, build 0, tests
  **460/460** (no count drift), lint still exactly the same single
  pre-existing error, `git diff --stat 9b50f83..HEAD` = 9 files, +869/−1,
  only owned paths (see §8).

## 2. Verifier design (rows, env contract, dev/prod Origin handling) + dev-mode output

`scripts/verify-production.sh` — one command, matrix output, exit 1 on any
FAIL, cookies only in an `mktemp -d` dir removed by an EXIT trap.

**Env contract:** `BASE_URL` (required, origin only) · `APP_ORIGIN`
(defaults to `BASE_URL`) · `OWNER_EMAIL/OWNER_PASSWORD` +
`ATTACKER_EMAIL/ATTACKER_PASSWORD` (optional — without them the
authenticated rows report SKIP). This mirrors `verify-auth-matrix.sh`'s
BASE_URL / OWNER_COOKIE / ATTACKER_COOKIE shape, upgraded to credential jars
because the hosted cut-over must exercise the REAL login endpoint, not
pre-made cookies (M1 §8.4: cookie flows were never live locally).

**Origin handling (the M1-review lesson):** every POST the script sends
carries `-H "Origin: $APP_ORIGIN"`. In production the origin guard rejects
Origin-less POSTs with 403 when `NODE_ENV=production` — a verifier that
posts without Origin would "pass in dev, 403 in prod". The foreign-Origin
row sends `https://evil.example` and must get that 403.

**Rows:**
1. Unauthenticated probes — `GET /` → 3xx, `GET /sessions/verify-probe` →
   3xx, `GET /globe.svg` (public asset) → 200, `POST /api/ocr` no cookies →
   401 **and** the 401 is JSON with `Cache-Control: no-store`, malformed
   JSON POST → 400, foreign-Origin POST → 403.
2. Open-redirect battery (G6) — six vectors (`//evil.com`, `/\evil.com`,
   `https://evil.com`, `javascript:alert(1)`, `%2F%2Fevil.com`,
   `\\evil.com`) sent as `?next=` to `/auth/callback` (the server-side
   `sanitizeNextOr` consumer); every resulting `Location` must be
   same-origin. Black-box limitation: the success-path redirect can only be
   observed with a valid PKCE code, so the battery proves no vector yields a
   cross-origin `Location` server-side; the deep sanitizer logic remains
   unit-tested in Lane A's `tests/auth-next-url.test.ts`.
3. Security headers — X-Content-Type-Options, Referrer-Policy,
   X-Frame-Options, Permissions-Policy must be present; CSP must contain
   `frame-ancestors 'none'` (SKIP-with-note instead of FAIL if the CSP header
   is entirely absent — the documented "pending Lane A" fallback; on this
   base Lane A's CSP already landed, so it PASSES).
4. Authenticated round-trip (with credentials) — owner signs in via the real
   `POST /api/auth/login` (cookie jar), `Set-Cookie` asserted for httpOnly +
   SameSite=Lax (+ Secure when BASE_URL is https; cookie NAME printed, value
   never), owner loads `/` → 200, a real owned session id is scraped from the
   owner's dashboard HTML and loads → 200, attacker signs in separately and
   gets **404 on the same URL, byte-identical (`cmp`) to a nonexistent
   session id's 404** (no existence oracle), both sign out → 200, post-logout
   `/` → 3xx.
5. Health — `GET /api/health` → 200 with `{"status":"ok"}`.

**Dev-mode self-test on :3058 (exit 0):**

```
  ✓ GET / (unauth) redirects to login                    expected=3xx actual=307
  ✓ GET /sessions/verify-probe (unauth) 3xx              expected=3xx actual=307
  ✓ GET /globe.svg (public asset) 200                    expected=200 actual=200
  ✓ POST /api/ocr no cookies 401                         expected=401 actual=401
  ✓ POST /api/ocr 401 is JSON + no-store                 content-type/json cache-control/no-store
  ✓ POST /api/auth/login malformed JSON 400              expected=400 actual=400
  ✓ POST /api/auth/login foreign Origin 403              expected=403 actual=403
Open-redirect battery (G6):
  ✓ next=//evil.com → same-origin Location               OK(307,…/auth/error?reason=exchange_failed,loopback)
  ✓ next=/\evil.com → same-origin Location               OK(307,…,loopback)
  ✓ next=https://evil.com → same-origin Location         OK(307,…,loopback)
  ✓ next=javascript:alert(1) → same-origin Location      OK(307,…,loopback)
  ✓ next=%2F%2Fevil.com → same-origin Location           OK(307,…,loopback)
  ✓ next=\\evil.com → same-origin Location               OK(307,…,loopback)
  ✓ header X-Content-Type-Options present / Referrer-Policy / X-Frame-Options / Permissions-Policy
  ✓ CSP frame-ancestors 'none'
  · 4 authenticated rows SKIP cleanly without credentials
  ✓ GET /api/health 200 {status:ok}                      {"status":"ok","version":"0.1.0"}
Verifier result: 19 pass, 0 fail, 4 skip   (exit 0)
```

Negative evidence: against a dead port the script prints 12 FAIL rows and
exits 1; with a deliberately wrong expectation (injected in a temp copy by
the quality agent) the specific row FAILs and the exit is 1; with dummy
credentials in dev the sign-in gets 401 (GoTrue absent → the app's
enumeration-safe invalid-credentials mapping) and the authenticated rows
fail loudly rather than silently passing.

## 3. Backup/restore proof (real run output, manifest reconciliation)

`npm run db:backup` (pg_dump custom format, `PGPASSWORD` via env, host/port/
user/db via separate argv fields — the DSN is never printed; aborts without
`SUPABASE_DB_URL`; writes `backups/<yyyymmdd-hhmmss>/db.dump` + manifest):

```
✔ backup written to backups\20261024-173314/
  pg_dump: pg_dump (PostgreSQL) 17.6
  tables: 7, total rows: 118
  manifest.json written (reconciled by npm run db:restore-test)
```

`npm run db:restore-test` (restores the newest dump into a freshly created
`ops_restore_test_*` database, reconciles counts vs the manifest, drops the
throwaway in a `finally`):

```
Restore test — newest backup: 20261024-173314 (pg_dump: pg_dump (PostgreSQL) 17.6)
Throwaway database: ops_restore_test_20261024_173316 (dropped at the end, win or lose)
  table                                  manifest   restored   verdict
  --------------------------------------------------------------------
  match_results                                 32        32   PASS
  matches                                        2         2   PASS
  mvp_lists                                      0         0   PASS
  profiles                                       1         1   PASS
  rosters                                       66        66   PASS
  sessions                                       1         1   PASS
  teams                                         16        16   PASS
RESTORE TEST PASS — 7/7 tables match the manifest
✔ throwaway database ops_restore_test_20261024_173316 dropped
```

Independent reconciliation: the quality agent recomputed all seven counts
via psql against `scrimlypro_ops` directly — all match the manifest; the
manifest contains only the database NAME, never host/user/password.
Failure drill: a deliberately corrupt newest backup makes pg_restore abort
**and the throwaway is still dropped** (`pg_database` count for
`ops_restore_test%` = 0 afterwards). `backups/` is gitignored; nothing was
committed.

## 4. Health endpoint rationale

`app/api/health/route.ts` — GET-only, `noStore` (lib/http convention),
constant body `{"status":"ok","version":<package.json version>}`.

- **Public by design:** it is the one intentionally public API route.
  Registered in `lib/auth/public-paths.ts` via a new `PUBLIC_API_PATHS`
  constant wired into `isPublicPath` — a separate list rather than a seventh
  `PUBLIC_PAGES` entry because `tests/auth-public-paths.test.ts` asserts
  `PUBLIC_PAGES` is *exactly* the brief's six pages ("never classifies API
  routes as public"); the constant keeps that contract test green while the
  proxy's fail-closed branch (misconfigured auth env — exactly when a health
  check matters most) now lets `/api/health` through.
- **Rate-limit exempt by design:** health checks are high-frequency,
  fixed-source GETs; rate limiting them turns a monitoring interval into an
  outage signal. GET is also a safe method, so the origin guard never
  applies (documented in the route file).
- **No DB ping — liveness only:** a DB-coupled check is a *readiness* probe
  and belongs to the hosting platform's checks (added later), not to a
  public endpoint that must answer even during a DB incident.
- **Leaks nothing:** version + status only; no DSNs, counts, uptime, or env.
  Quality agent grepped `.next` build output for server env — no leakage
  (the only planted-secret hits are the scanner's own test fixtures written
  to temp dirs).

## 5. Runbook summary (step list + which are automated vs manual)

`docs/deploy/cut-over.md` — 12 ordered steps, each with exact command +
expected observable, plus a sign-off table:

| # | Step | Mode |
|---|---|---|
| 1 | Hosted project creation, keys/DSN recorded | MANUAL |
| 2 | Env matrix (source + server-only marking, `APP_ORIGIN`, `TRUST_PROXY`) | MANUAL |
| 3 | Migration push 0000→0003 + `on_auth_user_created` trigger assertion + `pg_policies ≥ 27` | AUTO (psql assertions) |
| 4 | Pilot user creation + `profiles` trigger verification | MANUAL + AUTO |
| 5 | `migrate-local-to-supabase.mjs` dry-run → `--apply` → `golden-check.ts` exit 0 | AUTO |
| 6 | `next ≥ 16.4` gate (Lane D merge-order dependency, stated up front) | AUTO |
| 7 | Deploy + `verify:secrets` + `/api/health` smoke | AUTO + MANUAL |
| 8 | `verify-production.sh` full run **with two real accounts** (0 fail, 0 skip required) + M1 matrix re-run | AUTO |
| 9 | MANUAL-only tests: cross-device email confirmation (desktop signup → phone link → friendly login path), live cookie inspection in a real browser, timing-enumeration caveat acknowledgment (recorded, M1 §8.1) | MANUAL |
| 10 | First `db:backup` + `db:restore-test` (mandatory proof) + recurring schedule / off-host copy | AUTO + MANUAL |
| 11 | Rollback: `pg_restore --clean --if-exists` of previous good backup (never via this repo's tooling into a live DB) + hosting/DNS revert | AUTO + MANUAL |
| 12 | Kill-switch rehearsal via admin panel — explicitly marked **post-M3** (Lane C) | MANUAL, deferred |

## 6. Verification (commands, exit codes, test counts)

| Command | Exit | Result |
|---|---|---|
| `npx tsc --noEmit` | 0 | clean |
| `npm run lint` | 1 | only the pre-existing `lib/auth/action-guard.ts:5` error (baseline-identical, Lane A file) |
| `npm run build` | 0 | success, 18 static pages |
| `npm test` | 0 | **460/460** (32 files) — same as baseline; includes the A2 meta-test with the new allowlist entry |
| `BASE_URL=http://127.0.0.1:3058 bash scripts/verify-production.sh` | 0 | 19 pass / 0 fail / 4 skip (dev self-test) |
| dead-port + wrong-expectation injections | 1 | FAIL rows print, non-zero exit |
| `npm run db:backup` | 0 | §3 output |
| `npm run db:restore-test` | 0 | 7/7 tables; corrupt-backup drill also drops the throwaway |
| `curl :3058/api/health` | — | 200 `{"status":"ok","version":"0.1.0"}`, `no-store` |
| `git diff --stat 9b50f83..HEAD` | — | 9 files, only owned paths + registrations |

## 7. Quality-agent findings

Full adversarial pass (independent psql recount, temp-copy expectation
injection, corruption drill, ownership diff): **8/8 PASS** — health route
leak-free (handler read + build-output grep), verifier FAIL paths exit 1,
all six open-redirect vectors present and passing, cookie jars temp-only and
never echoed, manifest reconciles independently, restore-test naming guard
(`^ops_restore_test_[0-9_]+$` + refuse-if-equals-source + finally-drop) is
sound, runbook commands/flags/env names all match the actual scripts, no
file outside ownership touched.

Findings fixed in `m4e(5)`:
1. **restore-test.mjs leak (moderate, real):** `process.exit(1)` on
   pg_restore failure would skip the `finally` and strand the throwaway
   database. Fixed: abort now throws; outer catch prints and exits 1 after
   the drop. Proven by the corrupt-backup drill.
2. **backup-db.mjs same-second collision:** a re-run within one second
   silently overwrote the previous dump. Fixed: abort if the stamp dir
   already exists.
3. Runbook Node-version wording aligned with the README (22 LTS primary,
   Node 25 tested with the `--ignore-scripts` workaround).

Accepted observations (no change): default `PG_BIN_DIR` is this machine's
path by design (env-overridable, loud abort if missing); a missing CSP
header reports SKIP rather than FAIL per the brief's pending-Lane-A rule
(tighten after Lane A's CSP is guaranteed merged).

## 8. Limitations + merge points (public-paths line, Lane A/D dependencies)

**Merge points (mechanical, expected — flagged for whoever sequences the
merges):**
- `lib/auth/public-paths.ts` — added `PUBLIC_API_PATHS` (+1 line in
  `isPublicPath` + doc-comment note). Lane B also touches this file (share
  links); union on merge. The exact-list contract test stays green because
  `PUBLIC_PAGES` itself is unchanged.
- `tests/architecture/guards.test.ts` — one allowlist entry
  (`api/health/route.ts`) in the A2 meta-test with a why-comment; that test's
  own header documents this as the way to add a public route.
- `package.json` — two script lines only (`db:backup`, `db:restore-test`);
  Lane D owns the rest of that file; re-run `npm install` after D merges.
- `.gitignore` — `/backups/` entry.

**Dependencies:** Lane D must merge first (`next ≥ 16.4` is runbook step 6
and a stated merge-order prerequisite). Lane A's CSP landed before this
branch, so the verifier's CSP row is a hard PASS here; the SKIP fallback
remains for robustness. The kill-switch runbook step is deferred to post-M3
by design.

**Limitations:**
1. The authenticated verifier rows are dev-untestable (no GoTrue locally —
   M1 §8.4): they were exercised only to the extent the 401/503 failure
   branches allow; the real proof is runbook step 8 against the hosted
   project with two real accounts.
2. The open-redirect battery is black-box: it proves no vector produces a
   cross-origin `Location`; success-path redirect targets are covered by
   unit tests (Lane A), not by this script.
3. Restore-test reconciles the restored DB against the manifest written at
   backup time (stable, deterministic). Reconciling against the *live*
   source instead would race with concurrent writes; manifest-vs-source
   equality was verified independently on the idle lane DB.
4. The verifier's owner-session discovery scrapes the dashboard HTML for
   `/sessions/<uuid>`; if the dashboard's shape changes, that row SKIPs
   rather than false-PASSes.
5. Backups are machine-local (gitignored, off-host copy is runbook step
   10.3); pg binaries resolve via `PG_BIN_DIR` with the lane's default.

## 9. Post-approval review response (E-1…E-5)

The critical review APPROVED the lane with findings E-1…E-5. Disposition:

- **E-1 (backup coverage boundary) — FIXED (docs + decision).** Runbook
  step 10.4 now states the boundary explicitly (dump = `public` app schema
  only; NO `auth.users`/identities, NO Storage objects), records the
  mitigation decision (Supabase platform backups for the auth schema —
  plan tier verified at step 1; re-invite procedure as the pilot fallback;
  auth-schema dumps are credential material and never go into `backups/`
  unencrypted), and the sign-off table carries the acknowledgment. Step 11
  gained 11.3 (re-provision what the dump does not contain).
- **E-2 (step 5 breaks on integrated schema) — FIXED (re-sequenced, zero
  script changes).** Step 5 now: push 0000–0003 → legacy dry-run/apply →
  push 0010+ (Lane B's `0011` backfill stamps orgs on migrated rows) →
  assert zero NULL `org_id` → golden check → count reconciliation, with a
  never-NULL-buster warning. Step 3 asserts the FULL chain, `pg_policies
  ≥ 58` (exact floor pinned at rehearsal) and integrated-table presence.
  Step 12 kill-switch is un-deferred (in-sequence; M3 merges before
  cut-over per the wave runbook v3). The header mandates the local
  scratch-DB rehearsal of the whole sequence — including first real
  exercise of the legacy script's auth-user provisioning path — before
  anyone opens the hosted console; that rehearsal is necessarily
  post-merge (this lane may not merge/rebase other lanes' branches).
- **E-3 (table enumeration hardcoded?) — VERIFIED DYNAMIC, no fix.** Both
  `backup-db.mjs` and `restore-test.mjs` enumerate via
  `information_schema.tables where table_schema='public'`; post-merge
  tables are covered automatically. Documented in runbook step 10.1.
- **E-4 (share-link verifier row) — SCHEDULED post-merge.** Cannot exist on
  this M1-era base (Lane B's surface is absent); runbook now carries a
  "Post-integration verifier extension" section defining the row exactly
  (create → 200 + no-store + noindex + zero-PII markers → revoke → 404)
  for the merge sequencer.
- **E-5.1 — DONE.** `PUBLIC_API_PATHS` matching was already exact; the
  invariant is now stated in the file comment.
- **E-5.2 — FIXED.** Rollback step 11.1: maintenance mode / traffic stop
  precedes `pg_restore --clean`; resume is step 11.5.
- **E-5.3 (content-level restore check) — IMPLEMENTED.** `db:backup` now
  writes a per-session standings digest (real `computeStandings` via Node
  type-stripping, sha-256) into the manifest; `db:restore-test` recomputes
  standings from the RESTORED rows and compares against the backup-time
  digests — deterministic (no race against live writes), count-level PASS
  degrades visibly to "PASS (count-level)" with a SKIP note when digests
  are unavailable. Proof (real runs on `scrimlypro_ops`):

```
RESTORE TEST PASS — 7/7 tables match the manifest, standings identical for 1/1 sessions
```
  Tamper drill (flipped digest char in a manifest copy):
```
  standings content DIFFERS for session seed-00000000-…-0001
RESTORE TEST FAIL — counts match the manifest but standings differ in 1/1 session(s)
```
  exit 1; throwaway still dropped.

Gates after the review fixes: tsc 0 · build unaffected · `npm test`
460/460 (one transient 5s timeout in `tests/api/auth-matrix.test.ts` on a
loaded machine re-ran green — flake, no repo delta touches that path) ·
backup + restore-test green with content-level check.
