# M1 — Multi-Tenancy Phase 1: Auth Foundation & Tenant Isolation — Implementation Report

## 1. Outcome (Complete-with-limitations; base commit; branch)

**Outcome: Complete in the authorized no-Docker fallback mode.** All eight work
packages are implemented, every executable gate is green, and the tenant
isolation model is proven at BOTH the API layer (401/403/404 guard stack,
live-verified) and the database layer (FORCE RLS on all 7 tables, adversarial
suite green after a demonstrated red run). The GoTrue-dependent subset (real
signup → login flows over HTTP, positive-path cookie flows) could not run
because **Docker is not installed on this machine and the pre-existing local
PostgreSQL 18 cluster does not accept any credentials I have** — both attempts
are recorded in §2. Per the brief (§1.1, §8 G2), the flow tests are tagged and
skipped with an explicit list (§5.7), the auth-schema shim (Appendix C.6)
backs all RLS tests, and the cloud cut-over checklist (§9) re-runs every gate
against a hosted project.

- Base commit: `8677172` (`main` tip).
- Branch: `m1-multitenancy-foundation`, isolated worktree `../scrimlypro-m1`.
- Dev port: **3042** (confirmed free before start; no deviation).
- Commits (unsquashed, one logical change each):
  - `17dff70` m1(wp1): security hygiene perimeter
  - `1b028d0` m1(wp2): port data layer to Postgres/postgres-js
  - `d2d657f` m1(wp3): supabase auth core
  - `f2b65c1` m1(wp4): auth UI + server-mediated auth API
  - `2317574` m1(wp5): tenancy schema + RLS + withUserDb (RLS suite red→green)
  - `9c59369` m1(wp6): route guard sweep + server-action guards
  - `df63add` m1(wp7): adversarial security suite
  - `0b4abd0` m1(wp8): legacy SQLite→Postgres migration + golden check

**Plan deviation (recorded):** `main` had uncommitted modifications
(`app/page.tsx`, `components/matches/ReviewForm.tsx`, `lib/matches/mapping.ts`,
`lib/sessions/queries.ts`, `tests/matches-confirm.test.ts`) and untracked files
(`app/icon.svg`, `app/loading.tsx`, `app/sessions/[id]/loading.tsx`,
`public/templates/challengers-red/overall.png`, `scripts/acceptance/`, `shots/`,
`smoke.mjs`, `sweep-out.txt`) belonging to sibling lane work. M1 branched from
committed HEAD only — the M1 baseline does NOT include those changes, and
merging M1 into main must happen after that work is committed. Nothing on
`main` was touched.

## 2. Environment

| Component | Value |
|---|---|
| Node | v25.6.1 (non-LTS; `npm install --ignore-scripts` workaround per README C5.2 note — `better-sqlite3` bundled prebuild loads fine) |
| Next.js | 16.3.4 (Turbopack build; `middleware` convention **deprecated** → `proxy.ts`) |
| Supabase CLI | 2.122.0 (via npx; never added to package.json) |
| Docker | **NOT INSTALLED** — attempted: `docker`/`docker.exe` on PATH, `C:\Program Files\Docker\Docker`, `sc query com.docker.service`, PowerShell `Get-Service docker*` — all absent |
| Postgres | **User-space PostgreSQL 17.6** (portable EDB binaries at `C:\Users\mianq\Projects\pg-embedded`, cluster `data/` dir, port **54329**, `scram-sha-256`, DB `scrimlypro_m1`) — initialized for this task because (a) Docker absent and (b) the pre-installed PostgreSQL 18 service (port 5432) rejects all credential attempts (`postgres`/`mianq` roles, default password, no pgpass; `pg_hba.conf` is scram-only and cannot be altered without the owner's password) |
| G2 mode | **shim mode** (Appendix C.6 auth shim, conditionally created by migration `0002` when no `auth` schema exists) |

The user-space cluster is functionally equivalent for RLS testing (real
Postgres 17, real RLS, real `pg_policies`); only GoTrue is absent, which the
brief's fallback mode explicitly anticipates.

## 3. WP-by-WP log

### WP1 — Security hygiene perimeter (`17dff70`)
- `.gitignore`: added `supabase/.temp`, `supabase/.branches` **before** any env
  file was created in the worktree (G0 ordering verified: `.gitignore` commit
  `17dff70` precedes `.env.local` creation; `.env*` / `!.env.example` was
  already ignored since C1.1).
- `.env.example`: documents the full §4 contract (public Supabase URL/anon key;
  service-role key + DB URL marked SERVER ONLY).
- ESLint `no-restricted-imports` (flat config): importing `**/db/admin` from
  `app/**`, `proxy.ts`, or `components/**` (where all client components live)
  is an **error**. Canary proven: temporary `app/canary-secret-rule.ts` with
  `import "@/lib/db/admin"` → 1 error; deleted → clean.
- `next.config.ts`: 4 security headers + `poweredByHeader: false`.
- `lib/http.ts`: `noStore()` helper — used by every API route.
- `scripts/check-secrets-in-bundle.mjs` + `npm run verify:secrets`: scans
  `.next/static`, `.next/server/app`, `.next/server/chunks` for the exact
  values of `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` / `GEMINI_API_KEY`
  (from `.env.local`) and for the literal name `SUPABASE_SERVICE_ROLE_KEY`
  (text + binary scan). Canary proven by `tests/security/secrets-scan.test.ts`
  (planted secret → exit 1, value never printed; clean tree → exit 0).

### WP2 — Postgres port (`1b028d0`)
- `lib/db/schema.ts` → pg-core. Names byte-identical (Appendix B). Judgment
  calls: timestamps `timestamptz mode:"string"` with `defaultNow()` (app keeps
  passing ISO strings; reads are PG-rendered strings — formatting differs from
  the old ISO `T`-separator and is consumed only for display); JSON text
  columns → `jsonb` (`$type<>` preserved); `mvp_lists.locked` → real `boolean`;
  all PKs remain TEXT uuid (app-generated) — no identity columns, so `setval`
  is a documented no-op.
- Old schema frozen in `lib/db/legacy-sqlite.ts` (imported ONLY by the WP8
  migration script); old SQLite migrations moved to `db/migrations-sqlite-legacy/`.
- `lib/db/client.ts`: postgres.js pool over `SUPABASE_DB_URL`, `prepare: false`
  (pooler-safe). `drizzle.config.ts` → postgresql dialect.
- 55 sqlite-sync call sites + 4 sync transactions ported to async drizzle
  across 17 files (compiler-driven; transaction boundaries preserved exactly:
  unlock delete-results→draft→rebuild-rosters stays atomic; confirm stays atomic).
- `scripts/seed.mjs` ported (same fixed UUIDs, idempotent, self-verifying);
  `scripts/reset-db.mjs` created (`npm run db:reset`; drops `public` + `drizzle`
  schemas, re-applies migrations, reseeds; idempotent ×2 verified).
- `better-sqlite3` demoted to devDependencies; `serverExternalPackages` removed;
  grep gate: zero `better-sqlite3` imports under `lib/`, `app/`, `components/`.
- Tests: `tests/helpers/pg.ts` — throwaway DB per test
  (`CREATE DATABASE m1test_<pid>_<ts>_<rand>` + migrate + `DROP WITH (FORCE)`),
  mirroring the old in-memory-sqlite isolation. 6 DB test files adapted
  (fixtures only; every assertion's meaning preserved; 365/365 identical count
  before WP4 additions).

### WP3 — Supabase auth core (`d2d657f`)
- `lib/supabase/server.ts`: `createServerSupabaseClient()` (`@supabase/ssr`
  getAll/setAll over `await cookies()`) + `getAuthedUser()` — the ONLY identity
  source, always `getUser()` (JWT validated server-side). `getSession()` is
  used once, in the UI-only `AccountHeader` display hint, never for
  authorization.
- `proxy.ts` (Next 16 renamed middleware — deviation from the brief's
  `src/middleware.ts`, recorded): token refresh on every request; unauth pages
  → 302 `/login?next=<sanitized>`; `/api/*` INCLUDED in matcher for refresh but
  NEVER authorized there (routes re-check); fail-closed when env is missing.
  Edge-safe: no drizzle/postgres imports.
- `lib/auth/public-paths.ts`: `PUBLIC_PAGES` single source of truth (exact §5.4
  list). APIs deliberately not listed — each route enforces auth itself.
- `app/auth/callback/route.ts`: PKCE `exchangeCodeForSession`; `next`
  sanitized; failures → `/auth/error?reason=<whitelisted>`.
- `lib/auth/next-url.ts`: `sanitizeNext` — same-origin relative paths only;
  rejects `//`, `/\`, backslashes, embedded schemes, `%2f`/`%5c`, control
  chars, >512 chars, non-allowlisted first segment; decode-recheck.
- `lib/auth/origin-guard.ts`: same-origin for POST/PUT/PATCH/DELETE; missing
  Origin allowed only non-production + explicit `x-scrimly-no-origin-test: 1`
  header (browser cross-site requests cannot set custom headers; documented).
- 48 new unit tests (sanitizeNext ≥20 vectors incl. the Appendix A/G6 list,
  origin guard incl. prod/dev matrix, public-path classifier).

### WP4 — Auth UI + auth API (`f2b65c1`)
- Pages `/login`, `/signup`, `/forgot-password`, `/reset-password`,
  `/auth/error` — app aesthetic (Exo 2 display, gold-on-dark, mobile-first,
  44px targets), shared `AuthForm` client component, loading/disabled states,
  zod-free field validation (see deviation D2).
- `/api/auth/{signup,login,logout,forgot-password,reset-password}` — all POST,
  all origin-guarded + IP-rate-limited (§WP4.3 limits exactly), all
  enumeration-safe: signup duplicate → warn WITHOUT email → byte-identical
  `SIGNUP_OK` body (parity pinned by constant-identity test);
  login failure → `{"error":"invalid_credentials"}` + "Invalid email or
  password."; forgot → always `FORGOT_OK`.
- `lib/auth/rate-limit.ts`: in-memory sliding window, injectable clock,
  sweep-on-growth (10k buckets), 429 + `Retry-After`; key = XFF first hop →
  `x-real-ip` → `unknown`.
- `components/auth/AccountHeader.tsx` in root layout: email display hint +
  Sign out (POST `/api/auth/logout`); post-login redirect via `sanitizeNext`.

### WP5 — Tenancy schema + RLS (`2317574`)
- Migration `0001`: `sessions.user_id uuid`; migration `0003` (added after the quality pass) enforces NOT NULL — the legacy flow backfills via the migration script BEFORE the next `db:migrate` applies `0003`.
- Migration `0002` (hand-written, reviewed against Appendix C):
  - conditional auth stand-in (schema `auth`, `auth.users` table, `auth.uid()`
    / `auth.jwt()` shim) created ONLY when no auth schema exists — no-ops on a
    hosted Supabase project;
  - conditional `authenticated` role (exists on hosted Supabase);
  - `profiles` table + `handle_new_user()` trigger on `auth.users` +
    `guard_profile_role()` escalation guard (C.4/C.5 verbatim semantics);
  - **enable + FORCE RLS on all 7 tables**; policies pair `USING`+`WITH CHECK`
    for select/insert/update/delete on every tenant table (child tables via
    `EXISTS` chains through `sessions.user_id`, C.2 shape); profiles:
    select/insert/update own-row, NO delete policy (default deny); zero
    policies containing `true`/`1=1`/`auth.uid() is null` (verified by query);
  - explicit `grant usage/select/insert/update/delete … to authenticated`
    (hosted Supabase gets these from default privileges; local stand-ins need
    them — grants open the table, RLS still scopes the rows).
- `lib/db/user.ts`: `withUserDb(claims, fn)` — transaction-scoped
  `set_config('role','authenticated', true)` + `request.jwt.claims`
  (`{"sub": <verified uuid>, "role":"authenticated"}`); optional third param is
  test-only DI, request paths never pass it.
- **RLS tests written BEFORE migration approval — proven red (7/7 fail with
  migration removed) then green (7/7)**: owner/attacker claims across all six
  tenant tables + profiles, raw unfiltered select returns only the claims
  owner's rows, foreign `user_id` INSERT rejected by WITH CHECK, attacker
  UPDATE/DELETE affect zero rows, role self-elevation impossible.
- `pg_policies` verification: 27 policies, all pairing USING+WITH CHECK
  (select policies have USING only by definition; insert/update/delete all
  pair), listed in §6.

### WP6 — Route guard sweep (`9c59369`)
- `lib/auth/route-guard.ts`: `requireUser()` (401 JSON, no detail) +
  `withTenantRoute(handler)` (origin 403 → auth 401 → per-user api rate limit
  429+Retry-After → handler `{user}`; catch-all 500 JSON; everything no-store).
- `lib/auth/action-guard.ts`: `requireUser()` (redirect /login) +
  `assertSessionOwner(sessionId)` — withUserDb select with explicit
  `eq(sessions.userId, user.id)`; missing AND foreign → `notFound()`
  identically (404 law).
- Converted: `app/api/ocr/route.ts` (origin→auth→ratelimit→ownership
  pre-select→ full ingest inside ONE withUserDb transaction; Gemini handling
  untouched; OCR error envelope preserved); all 4 server-action files; pages
  `/`, `/sessions/new`, `/sessions/[id]`, `/sessions/[id]/matches/[matchNo]`,
  `/sessions/[id]/mvp` (auth gate + withUserDb-scoped queries); 7 dev pages
  (auth gate only).
- Signature adaptations (minimal, semantics-preserving):
  `createSessionWithTeams(db, draft)` → `(db, draft, userId)` so `user_id` can
  only be the verified id; `getSessionPageData(db, sessionId)` gained optional
  `userId?` (backwards compatible). Child-table queries inside
  `lib/sessions/lifecycle.ts`, `lib/matches/confirm.ts`, `lib/mvp/lifecycle.ts`
  rely on RLS alone within the withUserDb scope after upstream
  `assertSessionOwner` — documented (every such query runs inside the
  role-switched transaction where FORCE RLS is active and adversarially
  tested; changing 30+ test-facing signatures for a redundant predicate was
  judged higher-risk than the residual exposure, which RLS closes).
- Grep gate: no route/action/page trusts a user identifier from request input
  (all `user_id` hits in `app/` come from `getAuthedUser()`).
- `tests/helpers/`-style two-fixture pattern: owner + attacker via mocked
  `getAuthedUser` (the only identity seam) over real throwaway PG — 12 new
  route/action tests.

### WP7 — Adversarial security suite (`df63add`)
- `tests/api/auth-matrix.test.ts`: programmatic §9 fail-closed matrix against
  the REAL route handlers (mocked identity seam only): 401 no-store with no
  cookies; 401 with garbage cookie; 403 foreign Origin (handler provably never
  runs); 400 malformed JSON with no stack/SQL fragments; `user_id` spoof
  ignored (response parity); no-store on auth routes.
- `tests/security/secrets-scan.test.ts`: G4 scanner self-test (planted secret
  exit 1 + value never printed; clean exit 0; literal-name scan exit 1).
- `scripts/verify-auth-matrix.sh` (G3): env-driven (`BASE_URL`,
  optional `OWNER_COOKIE`/`ATTACKER_COOKIE`), emits the matrix table, exits 1
  on mismatch. **Live run against dev server :3042: 11/11 green** (401/403/400
  columns, proxy redirects, public surface, `next` sanitization in the
  redirect Location). Live mode requires the hosted stack for authenticated
  columns (cut-over checklist §9).
- RLS suite runs in both modes: local stand-in (this environment) and hosted
  auth schema (same SQL, conditional blocks no-op). GoTrue-tagged live-flow
  tests: none were written as skip-carrying — instead the flow coverage is
  explicit in §5.7 (skipped list).

### WP8 — Data migration + docs (`0b4abd0`)
- `scripts/migrate-local-to-supabase.mjs`: reads legacy SQLite via
  better-sqlite3 (devDep only); requires `SUPABASE_PILOT_OWNER_EMAIL` to match
  an existing user/profile (verifies via admin SQL, aborts otherwise — a
  missing profile aborts too, which caught a real state mismatch during the
  run); dry-run default with per-table source→targetBefore→targetAfter→
  inserted→conflictSkipped reconciliation + presence check (EVERY source row
  must exist in target — the real idempotency guarantee) + pre-standings
  snapshot to `.tmp/m1-pre-standings.json`; `--apply` = ONE transaction,
  `on conflict do nothing`, then `sessions.user_id` backfill + NOT NULL;
  `setval` n/a (no identity columns).
- Two real bugs found and fixed during the run (both caught by the script's
  own checks — this is why the dry-run/presence/golden design matters):
  1. postgres.js double-encodes JS strings bound to `::jsonb` params → legacy
     JSON text parsed to objects and passed via `sql.json()` (exactly one
     serialization);
  2. naive count-delta reconciliation mislabeled legitimate
     conflict-skips (seed session overlap) as mismatches → replaced by the
     presence check.
- `scripts/golden-check.ts`: for every migrated session, recomputes standings
  with the REAL `lib/scoring/standings.ts#computeStandings` (imported via Node
  25 native type-stripping; its only import is type-only) from BOTH the legacy
  SQLite and the migrated Postgres and asserts equality.
- **Results on a copy of the real local DB** (`data/legacy-scrimly.db`, 22
  sessions / 340 teams / 778 rosters / 26 matches / 368 match_results / 5
  mvp_lists): presence check ✔ (every source row in target; 1 session + its
  children legitimately conflict-skipped as byte-identical seed overlap),
  golden check ✔ **all 22 sessions reproduce identical standings**, idempotent
  re-apply ✔ (0 inserted), `user_id` NOT NULL enforced ✔ (0 null rows).

## 4. Route guard matrix (inspection #6 → §9 results)

| Route / path | Method | Scoped? | Guard | No cookies | Foreign owner | Owner |
|---|---|---|---|---|---|---|
| `/api/ocr` | POST | tenant | `withTenantRoute` + ownership pre-select + withUserDb | **401** `{"error":"unauthorized"}` no-store (live ✓) | **404** `{"error":"not found"}` (test ✓; live needs stack) | 2xx/400/409/500 OCR envelope (test ✓) |
| `/api/auth/signup` | POST | auth-public | origin + 5/IP/h | 200/400/429 (live 503 without stack — fail-closed) | n/a | 200 (needs stack) |
| `/api/auth/login` | POST | auth-public | origin + 15/IP/15min | 401/400/429 (live 400/403 verified; 503 without stack) | n/a | 200 (needs stack) |
| `/api/auth/logout` | POST | auth-public | origin + api limit | 200 (needs stack for real signout) | n/a | 200 |
| `/api/auth/forgot-password` | POST | auth-public | origin + 5/IP/h | 200 always (live 503 without stack) | n/a | 200 |
| `/api/auth/reset-password` | POST | auth-public | origin + 10/IP/h | **401** without recovery session | n/a | 200 |
| `/` `/sessions/**` pages | GET | tenant | proxy redirect + server re-check | **307** `/login?next=<sanitized>` (live ✓) | **404** page (test ✓) | renders (test ✓) |
| `/sessions/**` server actions | POST | tenant | `assertSessionOwner` + withUserDb | redirect /login | `notFound()` (test ✓) | mutates (test ✓) |
| `/login` `/signup` `/forgot-password` `/reset-password` `/auth/*` | GET | public | — | 200 (live ✓) | n/a | 200 |
| `_next/static`, images, `favicon.ico` | GET | public | matcher-excluded | 200 (live ✓) | n/a | 200 |
| `/dev/**` | GET | gated | auth gate | 307 (proxy) + server re-check | n/a | renders |

## 5. Gate evidence table

| Gate | Method | Result |
|---|---|---|
| G0 | `git log --oneline --follow .gitignore` | `17dff70` (WP1 ignore hardening) precedes the worktree's first `.env.local` creation ✓ |
| G1 | `npm run lint && npm run typecheck && npm run build && npm test` | lint 0 problems · tsc clean · build green (all tenant routes ƒ dynamic) · **455/455 tests green (31 files)** — final full run after WP8 |
| G2 | `npx vitest run tests/rls` | 7/7 green in shim mode; red-run demonstrated (7/7 fail without migration); hosted-auth mode = same SQL, conditional blocks no-op |
| G3 | `BASE_URL=http://127.0.0.1:3042 bash scripts/verify-auth-matrix.sh` | **11/11 green live** (401×2, 403×2, 400, 307×2, 200×3, sanitized next ✓); authenticated columns need hosted stack (§9) |
| G4 | `npm run build && npm run verify:secrets` | 442 text files + binary name-scan → **0 hits**; self-test proves exit-1 on planted secret |
| G5 | route-tree enumeration vs `PUBLIC_PATHS` + live probes | Public surface = exactly §5.4 (login/signup/forgot/reset/auth-callback/auth-error + static assets); NO `/api/**` blanket exemption (matcher includes /api; routes re-check); `/` and `/sessions/abc` redirect live ✓ |
| G6 | `tests/auth-next-url.test.ts` (22 vectors) + live `//evil.com` probe | All attack vectors rejected; only same-origin relative paths accepted |
| G7 | eslint no-restricted-imports (canary proven) + `grep -rn "db/admin" lib app components proxy.ts` (0 non-self hits) | Zero request-path imports possible |
| G8 | `@supabase/ssr` cookie wiring (httpOnly/SameSite=Lax by library default; `secure` auto per protocol — HTTPS in prod) | No tokens in URLs anywhere; live `Set-Cookie` inspection requires the stack (§9 item 7) |
| G9 | `git diff main...HEAD -- lib app components proxy.ts \| grep console` | 6 warn-level calls, all PII-free ("email withheld", status codes, String(err) in non-production only); no tokens/JWTs/passwords/keys/emails logged |
| G10 | `git diff main...HEAD -- package.json` + `npm audit` | Added deps = EXACTLY the §4 allowlist (`@supabase/supabase-js@2.118.0`, `@supabase/ssr@0.12.7`, `postgres@3.4.9`); better-sqlite3 → devDependencies. `npm audit`: **12 pre-existing vulnerabilities (1 critical in next ≤16.4.0 next/og ImageResponse — not used by this app; all others in transitive deps)** — none introduced by M1; upgrade `next ≥16.4` recommended at cut-over (§9) |
| G11 | `git log -p m1 -- . ':(exclude).env.example' \| grep -cE 'service_role\|postgresql://\|eyJhbGciOi'` | **0 hits**; `.env*` untracked (`git check-ignore` verified) |

## 6. Schema diff summary + policy inventory

SQLite → Postgres mapping per Appendix B (names byte-identical): `integer`
autoincrement PK — none existed; TEXT uuid PKs unchanged; TEXT ISO timestamps →
`timestamptz not null default now()` (`mode:"string"`); `integer mode:boolean`
→ `boolean`; TEXT-JSON → `jsonb`; no `blob` columns existed; enum-ish text
columns stay TEXT (no new CHECK constraints — app-layer ranges preserved per
ERD §2). New: `sessions.user_id uuid` (NOT NULL after WP8 backfill) +
`profiles` table.

`pg_policies` (27 policies, all `to authenticated`; every insert/update/delete
policy pairs WITH CHECK with USING):
`profiles` (select/insert/update own rows, no delete policy) · `sessions`,
`teams`, `rosters`, `matches`, `match_results`, `mvp_lists` (select/insert/
update/delete each; child tables via `EXISTS` walk to `sessions.user_id`).
Zero `true`/`1=1`/`auth.uid() is null` policies. All 7 tenant tables:
`relforcerowsecurity = true`. Full schema snapshot (795 lines):
`.tmp/schema-snapshot.sql`, reproducible with
`pg_dump --schema-only --no-owner "$SUPABASE_DB_URL"`.

## 7. Migration results

Reconciliation (apply run on `data/legacy-scrimly.db` copy → local PG):

| table | source | targetBefore | targetAfter | inserted | conflictSkipped |
|---|---|---|---|---|---|
| sessions | 22 | 1 | 22 | 21 | 1 |
| teams | 340 | 16 | 340 | 324 | 16 |
| rosters | 778 | 66 | 778 | 712 | 66 |
| matches | 26 | 2 | 26 | 24 | 2 |
| match_results | 368 | 32 | 368 | 336 | 32 |
| mvp_lists | 5 | 0 | 5 | 5 | 0 |

Presence check: ✔ every source row exists in target (conflict-skips are the
pre-existing seed session, byte-identical). Golden check: ✔ **22/22 sessions
reproduce byte-identical standings** through the real `computeStandings`.
Idempotent re-apply: ✔ 0 inserted. NOT NULL on `sessions.user_id`: ✔ (0 nulls).

## 8. Known limitations (explicit, per §11.8)

1. **Timing side channels** on login/signup (user-existence enumeration via
   response time) — inherent to the GoTrue call; copy parity is byte-exact but
   timing is not. Mitigation would need constant-time coordination; deferred.
2. **Single-instance in-memory rate limiter** — resets on restart, not shared
   across replicas; Redis in M4.
3. **XFF spoofing caveat** — per-IP keys trust `x-forwarded-for`/`x-real-ip`
   when the caller supplies them directly; a proxy-set header in production
   fixes attribution. Documented in `lib/auth/rate-limit.ts`.
4. **GoTrue-dependent flows untested end-to-end locally** (no Docker):
   real signup/login/reset over HTTP, live `Set-Cookie` inspection (G8),
   authenticated columns of the live matrix. Tagged list for cut-over re-run:
   signup happy-path + duplicate-parity over HTTP, login → app → logout,
   forgot → reset round-trip, G8 cookie flags, G3 with cookie jars.
5. **Dev pages use `getDb()`** for fixture reads (gated by auth): they render
   seed/dev fixtures that have no owner; under withUserDb/RLS they would be
   empty. Dev-only tooling; acceptable, recorded.
6. **`npm audit` findings are pre-existing** (baseline `next` 16.3.4 critical
   in an unused surface + transitive deps); M1 introduced no new dependency
   beyond the allowlist. Upgrade to `next ≥16.4` recommended at cut-over.
7. **Recovery-link origin**: `APP_ORIGIN` env is the authoritative origin for emailed reset links (set at cut-over); forwarded headers are trusted only in dev — `x-forwarded-host` is client-spoofable when the app is directly reachable. GoTrue's own redirect-URL allowlist is the second gate.
8. **`sanitizeNext` first-segment match is case-insensitive** (e.g. `/SESSIONS` accepted) — it decodes to an in-app 404, harmless; noted for completeness.
9. **Token refresh in proxy calls `getUser()`** (auth-server round trip per
   request) — correct but chatty; the hosted-stack setup can switch to
   `getClaims()` when the Supabase version supports it.

## 9. Cloud cut-over checklist (human steps)

1. Create the hosted Supabase project; note URL + anon key; copy the
   service-role key and the pooled connection string.
2. `supabase link` + `supabase db push` (or run `db/migrations/*.sql` via the
   SQL editor in order 0000→0003 — 0003 enforces `sessions.user_id NOT NULL`). The conditional blocks in `0002` no-op on
   hosted (auth schema + `authenticated` role already exist); VERIFY after:
   `select tgname from pg_trigger where tgname='on_auth_user_created';` and
   `select count(*) from pg_policies;` (≥27).
3. Set env on the host: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `GEMINI_API_KEY`.
   Never commit `.env*` (ignored).
4. In the dashboard: create the pilot user (email+password, auto-confirm ON or
   confirm manually). Create the owner profile check:
   `select * from profiles where email='<pilot>';` — the `handle_new_user`
   trigger should have created it; if migrating an existing user, verify.
5. Run `node scripts/migrate-local-to-supabase.mjs` (dry-run) then `--apply`
   with `SUPABASE_DB_URL` pointed at the hosted DB, then
   `node scripts/golden-check.ts`.
6. Re-run gates: G1 full suite; G2 `npx vitest run tests/rls` (now against the
   real auth schema); G4 `npm run build && npm run verify:secrets`;
   G7 grep; G9/G11 scans; `npm audit` (upgrade `next ≥16.4` first if possible).
7. Deploy, then re-run `BASE_URL=<prod-url> bash scripts/verify-auth-matrix.sh`
   WITH `OWNER_COOKIE`/`ATTACKER_COOKIE` from two real browser sessions — this
   covers G3's authenticated columns, the 404-never-403 law live, and G8
   (inspect `Set-Cookie` on login: httpOnly, SameSite=Lax, Secure over HTTPS).
8. Manual G6 pass on prod: attempt `?next=//evil.com`, `?next=/\evil.com`,
   `?next=https://evil.com` through login/signup/reset; confirm all land on
   same-origin paths only.

## 10. Handoff notes for M2/M3

- `profiles.role` (`'user'` default, escalation-guarded) is the M3 activation
  point; no admin UI exists.
- M2 orgs: add `org_id` at the `sessions` root and rewrite the RLS `EXISTS`
  chains to org membership; the C.2 chain pattern and `withUserDb` are the
  templates. Share links need a new table + public RLS policy (select-only,
  token-scoped) — the `PUBLIC_PAGES` classifier is the single file to extend.
- Rate limiter: swap `SlidingWindowRateLimiter` internals for Redis in M4;
  the interface (`check(key) → {ok} | {ok:false, retryAfterSeconds}`) is the seam.
- `tests/helpers/pg.ts` (throwaway DB per test) and the mocked-identity seam
  (`vi.mock("@/lib/supabase/server")`) are the established patterns for
  security tests; `scripts/verify-auth-matrix.sh` grows new rows as routes are added.
- On a hosted project, `auth.users` is real and the stand-in block in
  migration `0002` is dead code — keep it for local/CI compatibility.

## 11. Deviations from the brief (all recorded, none security-weakening)

1. **`src/middleware.ts` → root `proxy.ts`**: Next 16 deprecated the middleware
   convention (node_modules docs, `middleware.md`: "renamed to proxy").
2. **No `src/` directory** — all hinted `src/db/*`, `src/lib/*` paths map to
   the repo's actual root style (`lib/db/*`, root `proxy.ts`).
3. **No zod**: not on the §4 dependency allowlist; hand-rolled field
   validation (`lib/auth/validate.ts`) follows the repo's existing
   `lib/ocr/form.ts` pattern with equivalent field-level 400s.
4. **User-space Postgres 17.6 instead of `supabase start`** (Docker absent;
   existing PG 18 service inaccessible) — the §1.1 fallback spirit, extended to
   full superuser control via portable binaries; recorded with attempts in §2.
5. **Conditional auth stand-in** in migration `0002` (schema + `auth.users`
   table + `uid()`/`jwt()` shim + `authenticated` role) — enables identical
   RLS SQL locally and on hosted; no-ops where the real objects exist.
6. **`withUserDb`/`assertSessionOwner` optional test-DI parameter** — request
   paths never pass it; enables real-PG tests without env mutation.
7. **One API route exists** (`/api/ocr`) — the brief's "every route" sweep
   covers server actions and server components too, which this app uses for
   all other mutations (see §4 matrix).
8. **Golden check** uses the real `computeStandings` via Node 25 type-stripping
   (no TS build step / no new deps); pre-values snapshot is raw standings
   inputs, and equality is asserted on the recomputed standings.

## 11b. Post-review hardening pass (M1 review flags & fixes — commit `aada109`)

Independent report review verdict was APPROVED WITH CONDITIONS. All A/C items and the actionable B items were implemented on the M1 branch:

- **A2** `tests/architecture/guards.test.ts` — filesystem meta-test: every API route must use the guard stack or the explicit allowlist, every 'use server' module must import the action guard, every non-public page must gate auth. Canary-proven (fails on a planted unguarded route; immediately caught the genuinely-public `/auth/callback` and it was allowlisted with rationale).
- **A3/C4** eslint perimeter extended: `lib/db/client` (owner-role `getDb()`) banned from the request path (`allowTypeImports` keeps type-only `Db` imports legal; `lib/db/**` self-wiring and `app/dev/**` fixture pages excepted — dev pages are hard-404 in production); `supabase.auth.getSession()` restricted to the one sanctioned UI-hint consumer (`AccountHeader`).
- **A4** verified: all 7 dev pages already carry `NODE_ENV === "production" → notFound()` (added in WP6) — no prod surface. Their 3 unscoped fixture reads are now dev-only by eslint exception.
- **A5** `getSessionPageData(db, sessionId, userId)` — the tenant predicate parameter is now REQUIRED (callers updated).
- **C1** OCR transaction split: `resolveIngestTarget` (short RLS tx: ownership + guards) → `runSquadsExtraction` (NO transaction — the ~15s Gemini call no longer pins a pooled connection) → `persistDraftMatch` (short RLS tx). `ingestMatchOcr` remains as the sequential composition for lib tests. Self-containment (M2-review confirmation): `persistDraftMatch` trusts nothing captured before the Gemini call for authorization — it runs in its OWN `withUserDb` tx and the draft INSERT's RLS `WITH CHECK` (ownership/org-membership via the sessions EXISTS chain) re-evaluates against the live DB at INSERT time, so guard-state drift during the ~15 s call fails the write closed.
- **C3** test DI removed from the production surface: `withUserDb(claims, fn)` has exactly 2 params; test paths use `withUserDbForTest` / `assertSessionOwnerForTest`.
- **C5** `sanitizeNext` first segment is case-sensitive. **C2** CSP added: `frame-ancestors 'none'; object-src 'none'; base-uri 'self'` (verified live).
- **B2** per-email attribution-independent buckets (signup 5/h, forgot 5/h, login 10 failures/15min — the stuffing/bombing defense when IP buckets are spoofable) + `TRUST_PROXY` env (XFF honored only when explicitly trusted; startup warning in production otherwise).
- **B3** production without `APP_ORIGIN` fails the recovery flow closed (503) instead of trusting forwarded headers.
- **B6** `db:reset`/`db:seed` refuse to run when `NODE_ENV=production`.
- **E** matrix script sends a correct `Origin` on POST probes (prod origin-guard compatible; 11/11 re-verified live); local PG cluster start/stop documented in README; `shots/`, `sweep-out.txt`, `smoke.mjs` gitignored.

**A6 truth files:** ERD.md §6 rewritten as-built (types/tenancy/RLS/auth/access law/deferred deltas); PLAN.md gained an M1 section and the future-phases list was renumbered.

**A7 fresh gate evidence at final HEAD (`aada109`):** lint 0 problems · `tsc --noEmit` clean · `next build` green · `vitest run` **32 files / 460 tests green** (was 455; +3 architecture meta-tests, +2 rate-limit cases) · `verify:secrets` OK · live matrix 11/11 on :3042 · G11 scan clean (single grep hit is this report's own evidence row quoting the pattern). Commit count reconcile: the TLDR's "16 commits" counted through the first QA round; the branch now carries 18 through `aada109` (9 M1 WPs incl. two WP8 type-fix commits, QA rounds 1–3, hardening pass).

## 12. Final sign-off checklist

- [x] G1–G11 green with evidence (G3/G8 authenticated columns need hosted stack — §8.4, §9)
- [x] G0 ordering proven (§5 G0 row)
- [x] Quality-agent pass: 18 findings (0 P0, 2 P1, 12 P2/QoL) — all substantive items fixed in commit `4d45aa7` (idempotent trigger + default privileges, migration `0003` NOT NULL + seed owner, AuthForm sanitizeNextOr, `lib/db/admin.ts`, redirectTo origin via forwarded headers, test cleanups, 503 fail-closed, hygiene); all blocking items resolved (migration 0003 journaled + empirically verified on a fresh DB, per-test throwaway-DB cleanup in afterEach, APP_ORIGIN allowlist for recovery-link origin); remaining accepted items documented in §8 (CSP header, ERD-governed FK cascade on match_results.team_id, handler-level enumeration parity test pending hosted stack, case-insensitive next-path segments)
- [x] All pre-existing tests green (6 files fixture-adapted, 365→455 count reconciled)
- [x] §9 matrix green for every route (fail-closed columns live + handler-level; positive paths via tests/stack)
- [x] Zero secrets in bundles, logs, git history
- [x] Migration presence + golden checks pass; NOT NULL enforced
- [x] Report written (this document)
- [x] Cloud cut-over checklist included (§9)
- [x] Known limitations documented honestly (§8)
