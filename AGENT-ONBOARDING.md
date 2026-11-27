# ScrimlyPro — Master Onboarding Prompt for AI Agents

> You are being onboarded onto **ScrimlyPro**, a production-grade Next.js SaaS.
> This document is your complete map: what the product is, how the system
> flows end-to-end, every folder and module, and the non-negotiable laws of
> the codebase. Read it fully before writing any code. When this document and
> the code disagree, **the code wins** — PRD.md / ERD.md / PLAN.md are the
> "truth files" for product scope, data, and build order, but they still carry
> v1-era drift (§2), so read them for intent and verify against the code.

---

## 0. First five minutes (do these before anything else)

1. Check the working tree first (`git status --short --branch`). Feature
   branches here routinely carry **uncommitted graphics/template work** —
   never revert, stash, or "clean up" changes you did not make.
2. Read `AGENTS.md` (and `CLAUDE.md`, which just points at it). It warns that
   this repo's Next.js APIs/conventions differ from older Next you may know
   (`proxy.ts` replaces `middleware.ts`; the error-boundary prop is `retry`,
   not only `reset`). The installed version is **Next.js 16.4.6** per
   `package.json` (an older revision of this document said 16.4.3 — stale;
   note `eslint-config-next` is still 16.4.3). Before writing Next-specific
   code, consult the bundled guides in `node_modules/next/dist/docs/`.
3. Read `PROJECT-CONTEXT.md` — a newer handoff snapshot that tracks in-flight
   work and doc/code drift more closely than this file.
4. Read the truth files in this order: `PRD.md` (what we build), `ERD.md`
   (data model + tenancy/RLS law), `PLAN.md` (build order + history of every
   chunk/lane/milestone), `PRODUCT.md` (product positioning). **They still
   carry v1-CORE/SQLite-era headers and contain stale "deferred" claims** —
   use them for scope/intent, but the code (and §2's drift warning) wins.
5. Skim `README.md` — it is both the run book AND a long **Assumptions log**
   recording every deviation ever made, with reasons. If you are about to do
   something unusual, check whether it was already decided there.
6. Skim `docs/reports/*.md` — one implementation report per milestone (M1,
   M2, M3, M4D, M4E, M5, M6, M6-preflight, wave-1, P5, P6, P7) with full
   decision records. There is no P4 or P8 report; the P8 art-backed campaign
   is recorded in `PROJECT-CONTEXT.md` and the code.
7. Never fabricate product claims (see `PRODUCT.md` → Evidence on Hand). The
   app **is** deployed on Oracle A1 + Supabase Cloud at
   `https://scrimlypro.duckdns.org` — `GET /api/health` currently returns
   `{"status":"ok","version":"0.1.0"}` (see §14 and the Oracle runbook).
   Older docs claiming "nothing is deployed" are stale. There are still no
   real customers/testimonials — do not invent them.

---

## 1. What ScrimlyPro is (the product in one page)

**ScrimlyPro turns PUBG Mobile scrim results into graphics.** The customer is
a solo scrim organizer in Pakistan, working from a phone right after each
match ends. Instead of retyping results into Canva/Photoshop for 30–60
minutes per match, they:

1. **Create a session** — name, 1–6 planned matches, 4–25 teams (bulk-pasted
   names), optional per-team logos, and a graphic aesthetic.
2. **Upload 1–14 end-of-match screenshots** per match. The client downscales
   them, and **one Gemini OCR call** extracts every squad: placement, players,
   per-player kills.
3. **Review & map** — a form shows the extracted squads sorted by placement;
   the engine *suggests* squad→team mappings (learned from earlier matches),
   but **a human confirms every mapping, every match**. This is the core
   doctrine: *the machine suggests, the human confirms.*
4. **Confirm** → points are stored → a cumulative **"OVERALL STANDINGS — AFTER
   MATCH N"** graphic (1080×1620 PNG) is generated client-side and downloadable.
5. Repeat per match. At session end: a **"FINAL RESULTS"** standings graphic
   plus a **Top-5 MVP** graphic (per-player kills aggregated across matches
   with fuzzy name merging, edited and then locked by the organizer).

The loop must stay ~90 seconds per match on a phone. Speed is the product.

Around that core loop the platform has grown a full SaaS shell: email/password
auth (Supabase GoTrue), multi-tenant **organizations** with roles/invites/
quotas, **share links** (public, token-hash protected standings pages), a
member **dashboard**, a **super-admin panel** (audit log, kill switch,
impersonation, feature flags), usage metering for the paid Gemini calls, and a
marketing **landing page** at `/`.

**Scoring (the "SUPER ruleset", authoritative):** kills = 1 pt each;
placement 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th=1, 8th=1, 9th–25th=0.
Standings tie-break order: `total DESC → wwcd DESC → kp DESC → pp DESC →
team name ASC`. WWCD = "Winner Winner Chicken Dinner" count (placement-1 wins).

**Domain quirks you must respect (they shaped the validation code):**
- *Rondo map recalls*: eliminated players can return and die again, so
  per-player kills of 16–19 and lobby-wide kill totals > 99 are legitimate,
  not OCR errors. V4 is therefore a never-blocking, never-retried soft
  warning; retrying on it would pressure the model to fabricate lower numbers.
- Player names contain Arabic, CJK, katakana, glyphs like `× · | _ ₛ ≌` — the
  font stack and the glyph torture test exist for this. OCR names are copied
  character-for-character, never normalized for display.

---

## 2. Where knowledge lives (documentation map)

| File | What it is |
|---|---|
| `PRD.md` | WHAT to build — functional requirements F1–F7, edge cases, non-functional doctrine R1–R10, acceptance criteria. |
| `ERD.md` | DATA — entity model, constraints, iron rules, and §6/§7: the as-built Postgres port + org/admin tables. |
| `PLAN.md` | BUILD ORDER — chunk history C1.1→C7.1, milestones M1/M5/M6, lanes, and what is deliberately deferred. |
| `PRODUCT.md` | Product positioning, users, principles (speed / human-confirms / mobile-first / correct numbers / output-is-the-deliverable). |
| `README.md` | Run book + the **Assumptions log** (every deviation, per chunk) + auth architecture + TRUST_PROXY matrix. |
| `LANES-README.md` | How 5 parallel agent lanes split the work (file ownership, migration blocks, merge order). |
| `ScrimlyPro-SaaS-explainer.md` | Plain-language SaaS tour (roles, features, security story, wave status). |
| `PROJECT-CONTEXT.md` | Newer handoff snapshot: in-flight P8 work, truth-file drift, local-ops history. Read it alongside this file. |
| `docs/reports/*.md` | Per-milestone implementation reports: M1, M2, M3, M4D, M4E, M5, M6, M6-preflight, wave1, P5, P6, P7 — decision records, deviations, gates. (No P4 or P8 report exists.) |
| `docs/deploy/cut-over.md` | First-deployment / Vercel-style Supabase cut-over runbook (v2, rehearsal-proven). **Conflict warning:** it says "never write `.env*` on the server" and uses `vercel deploy --prod`; the live VM flow is §14 / the Oracle runbook (`.env.local` on the VM + `deploy-scrimlypro`). Its migration list also omits `0021`, and its policy count is inconsistent (≥55 vs ≥58). |
| `ScrimlyPro-Oracle-Deploy-Runbook.md` | The **actual production topology** (Oracle A1 VM + Caddy + systemd + Supabase Cloud), provisioning, nightly backup/keep-alive cron, and rollback. Treat as the ops source of truth. |
| `docs/MASTER-PROMPT-graphic-alignment.md` | Working driver for re-measuring art-backed graphics: canvas-pixel measurement, row centering, drift/truncation/MATCH-# fixes, mandatory second review pass. |
| `AGENTS.md` / `CLAUDE.md` | Next.js 16 agent rules (read the bundled Next docs before coding). |
| `shots/`, `docs/reference/` | Screenshot evidence, golden images, design reference halves for the dashboards. |

**Drift warning:** `PRD.md`, `ERD.md`, `PLAN.md` and `PRODUCT.md` still carry
v1-CORE headers and contain statements the code has outgrown (SQLite stack,
"no login" / deferred auth, "three dev-gradient aesthetics", "nothing is
deployed", and PLAN's old P5/P6 names that differ from the real P5–P7
reports). Use them for intent and history, never as a description of current
state. `PROJECT-CONTEXT.md` is newer but also a snapshot; **the code always
wins.**

---

## 3. Tech stack (locked)

- **Next.js 16.4.6** (exact pin in `package.json`; App Router, no `src/`,
  alias `@/*`) + **React 19.2.8** + **TypeScript strict, zero `any`** +
  **Tailwind CSS v4**. `eslint-config-next` remains at 16.4.3 — that is a
  lint package, not the runtime version.
- **Postgres** (Supabase-compatible; `postgres.js` driver) + **Drizzle ORM**
  (`drizzle-orm/pg-core`), migrations versioned in `db/migrations/`
  (11 SQL migrations; see §5/§9).
- **Supabase auth** (GoTrue) via `@supabase/ssr`; **FORCE RLS** on every table.
- **`@google/genai` ^2.21.0** for OCR — the API key exists ONLY inside
  `app/api/ocr/route.ts` (server).
- **`html-to-image`** for client-side PNG graphic export (1080×1620 exact).
- **Vitest ^4.1.12** — currently **82 test files / ~1,050 `it()`/`test()`
  declarations** (the old "~600+" figure is badly stale): pure-logic tests +
  DB/RLS/API integration tests on throwaway databases. `maxWorkers: 2`,
  `hookTimeout: 180s`, `testTimeout: 30_000` are deliberate reliability levers.
- Fonts: **Exo 2** (primary graphics face, weights 500–800), **Rajdhani**
  (metric fallback, always loaded), **Noto Sans Symbols 2** (symbol glyphs) —
  all via `@fontsource/*` — plus `next/font` Google fonts (Inter, Inter Tight,
  Lexend for the landing page and **Permanent Marker** as `--font-brush` for
  the grunge-red MVP brush). Shared stacks live in `lib/graphics/fonts.ts`.
- `next.config.ts` adds `poweredByHeader: false`, `turbopack.root` (keeps the
  watcher inside this repo, not a parent `package-lock.json`), and
  `experimental.agentUpgrade: "security"` (from the 16.4.6 security handoff).
  Security headers include `Permissions-Policy` in addition to those in §4.5.
- `better-sqlite3` survives only as a devDependency for the **legacy SQLite**
  migration tooling (`lib/db/legacy-sqlite.ts`,
  `scripts/migrate-local-to-supabase.mjs`, `db/migrations-sqlite-legacy/`).
  The runtime database is Postgres, full stop.
- Dependency additions are deliberately rare; anything new must be justified
  in the README Assumptions.

---

## 4. The non-negotiable architecture laws

These are enforced by ESLint rules, meta-tests, or both. Violating them is a
build failure, not a style nit.

### 4.1 Identity law
- Identity comes ONLY from `supabase.auth.getUser()` —
  `getAuthedUser()` in `lib/supabase/server.ts`. `getSession()` is a
  non-authoritative browser hint; ESLint bans it everywhere except
  `components/auth/AccountHeader.tsx` (the one sanctioned UI consumer).
- **Effective identity** (M3): `getEffectiveUser()`
  (`lib/admin/impersonation.ts`) returns the impersonation TARGET when a valid
  signed impersonation cookie backed by a live `impersonation_sessions` row
  exists; otherwise the real verified user. Tenant guards run on effective
  identity; admin guards run on REAL identity.
- All credential operations (signup/login/logout/forgot/reset) are
  server-mediated through `/api/auth/*` route handlers — the browser never
  talks to GoTrue directly.

### 4.2 DB access law ("belt and suspenders")
- **`withUserDb(claims, fn)`** (`lib/db/user.ts`) is the ONLY way tenant
  request paths query the DB. It opens a transaction and
  `set_config('role','authenticated')` + sets `request.jwt.claims` from the
  server-verified `sub` — so Postgres **FORCE RLS** is the guaranteed backstop
  even if a query forgets its ownership WHERE clause.
- The belt (first line of defense) is explicit ownership predicates in the
  query layer (`assertSessionOwner` → 404 for foreign resources) plus org
  membership predicates (`orgMemberPredicate`) on tenant root selects.
- `getDb()` (`lib/db/client.ts`) and `getAdminSql()` (`lib/db/admin.ts`) both
  run as the schema owner (bypassing RLS); the latter is the RLS-bypassing
  client used by admin code. **ESLint bans both from the request path**
  (`app/**`, `proxy.ts`, `components/**`). They are for tests, scripts, and
  `app/dev/**` fixture pages only. Note: the SQL admin client reads
  `SUPABASE_DB_URL`; `SUPABASE_SERVICE_ROLE_KEY` is the separate Supabase
  REST/auth credential (see §10) — do not conflate the two.
- `lib/admin/admin-db.ts` is the single guarded re-export of the service-role
  client, importable ONLY from `app/admin/**` + `app/api/admin/**` server
  files and `lib/admin` internals. `lib/admin/**` itself may not be imported
  outside the admin panel except the two sanctioned guard choke points
  (`lib/auth/route-guard.ts`, `lib/auth/action-guard.ts`).
- One more sanctioned exception: `lib/share/public-reader.ts` (the public
  `/share/[token]` page) uses the admin client for a single token-hash lookup
  with a deliberate column projection — an anonymous visitor has no RLS
  identity.

### 4.3 Guard law (every authed surface re-checks, independently)
- `proxy.ts` (Next 16's renamed middleware) is a **convenience layer only**:
  it refreshes tokens and redirects unauthenticated PAGE requests to
  `/login?next=<sanitized>`; it NEVER authorizes. If Supabase env is missing
  it **fails closed** (everything non-public redirects to /login). `/api/*`
  routes are deliberately matched by the proxy but must independently enforce
  their own guard (401 JSON).
- **API routes**: wrap handlers in `withTenantRoute<P>()`
  (`lib/auth/route-guard.ts`). Stack: ① same-origin check for state-changing
  methods (CSRF) → ② verified effective identity (401, no detail) → ③ kill
  switch probe (403) → ④ per-user sliding-window rate limit (120/min, 429) →
  handler. Handlers receive `{ user, params }` (params awaited from the Next 16
  route context) and must return no-store responses.
- **Server actions / pages**: `requireUser()` from `lib/auth/action-guard.ts`
  (same kill-switch + effective-identity semantics; redirects).
- **Admin surfaces**: `requireAdmin()` (`lib/admin/require-admin.ts`) — REAL
  identity, platform role from `profiles.role`.
- **Public surface** is enumerated in ONE place: `lib/auth/public-paths.ts`
  (`PUBLIC_PAGES`: `/`, `/login`, `/signup`, `/forgot-password`,
  `/reset-password`, `/auth/callback`, `/auth/error`, `/invite/*`,
  `/share/*`; `PUBLIC_API_PATHS`: `/api/health` only — exact match).
- `tests/architecture/guards.test.ts` is a **meta-test** that fails if a new
  authed route/page ships without its guard. New routes must satisfy it.

### 4.4 Data iron rules (ERD §5)
- **No aggregate columns anywhere.** Standings, WWCD counts, MVP totals are
  always derived from `match_results` (confirmed matches only). Fixing or
  deleting any match is therefore always safe.
- `mvp_lists.entries` is written once on Lock and is the ONLY source for the
  MVP graphic afterward.
- Unlock match = delete its `match_results` → `status='draft'` → rebuild
  rosters from remaining confirmed matches — in ONE transaction, in that order.
- Re-confirm of a draft replaces its results idempotently (also one
  transaction).
- `rosters` is invisible plumbing for suggestions — never rendered in any UI.
- Business logic (scoring, matching, MVP, validation, standings) lives in
  `/lib` as pure typed functions with Vitest tests. UI components never
  contain business logic.

### 4.5 Security posture (in place — don't regress it)
- Rate limiting: sliding-window limiters keyed by IP and/or verified email
  (`lib/auth/rate-limit.ts`); `TRUST_PROXY` is **distrust-by-default** (see
  README's deployment matrix for when `x-forwarded-for` is honored).
- Enumeration-safe auth copy for **credential mismatch only** (identical
  message whether the account exists). Since the login-error UX work, real
  infrastructure/auth states are deliberately actionable and distinct:
  provider outage → 503 `auth_unavailable`, unconfirmed email → 403, banned →
  403, rate limit → 429 with a real `Retry-After`, unknown → 502 (see
  `lib/auth/route-helpers.ts` and `tests/login-errors.test.ts`). Infrastructure
  errors are excluded from the per-email failure bucket; successes clear it.
- Tokens (`org_invites`, `share_links`) are stored **SHA-256 hashed**; the raw
  token is shown once and never lands in the DB.
- `audit_log` is append-only — RLS grants no update/delete policy to anyone.
- The user kill switch: presence of a `feature_flags` row
  `('user', <id>, 'disabled')` locks the account out of every authed surface;
  it fails closed. `/admin/tenants` is the single audited disable path; the
  generic `/admin/flags` editor refuses **any** `disabled` row. The **org-level**
  kill switch is schema-ready but deliberately unwired. A reserved
  `('global', 'ai_disabled')` flag is read by the admin system card.
- Impersonation: HMAC-signed cookie (`IMP_SECRET`; **production fail-closed**
  without it) + `impersonation_sessions` ledger row (expiry/revocation checked
  server-side, never trusted from the cookie) + audit events + visible banner.
- `next.config.ts` sets security headers (nosniff, DENY framing,
  strict-origin-when-cross-origin, `Permissions-Policy`, minimal CSP) plus
  `poweredByHeader: false`; it does **not** set `allowedDevOrigins` (an older
  note in §11 was true only on the now-stale `landing-page` branch).
- `scripts/check-secrets-in-bundle.mjs` (`npm run verify:secrets`) scans the
  built bundle — run it after builds.

### 4.6 Robustness doctrine (PRD §8, every change must honor)
R1 validate-before-trust (OCR never writes results directly) · R2 human
confirms every mapping · R3 aggregates never stored · R4 confirm atomic +
idempotent · R5 unlock/edit always available · R6 drafts persist (no repeat
OCR cost) · R7 deterministic tie-breakers · R8 every failure path has a manual
fallback (never a dead-end) · R9 mobile-first (≥44px targets, zero horizontal
overflow at 375px, loading/error UI for every async state) · R10 one Gemini
call per match; client downscale before upload.

---

## 5. The data model (`lib/db/schema.ts`, migrations in `db/migrations/`)

App-generated UUIDs (`crypto.randomUUID`, TEXT PKs); timestamps `timestamptz`
handled as ISO strings; JSON as `jsonb` typed with `$type<>`. Range
constraints (planned_matches 1–6, team_count 4–25, match_no 1..planned,
placement 1..team_count, squad 1–4 players) are enforced in the **app layer**
per ERD §2 — deliberately not SQL CHECKs (the only SQL CHECKs are role-enum
hardening on `org_members`/`org_invites` in `0014`). **Never change the schema
without updating ERD.md first.**

**Committed migrations (11 SQL files, journal `version: 7`):**
`0000_absurd_krista_starr`, `0001_sessions-user-id`, `0002_m1-rls-auth-shim`,
`0003_sessions-user-id-not-null`, `0010_orgs-schema`, `0011_orgs-backfill`,
`0012_sessions-org-id-not-null`, `0013_org-invite-preview`,
`0014_quota-role-hardening`, `0020_m3_admin_tables`, and
`0021_teams-slot-number`. `0013` adds the `public.org_invite_preview(p_token_hash)`
SECURITY DEFINER function; `0021` adds `teams.slot_number` plus the partial
unique index `teams_session_slot_uq (session_id, slot_number) WHERE slot_number
IS NOT NULL`. `0030–0039` remain RESERVED and UNUSED (§9). The drizzle `meta/`
graph is forked (snapshots exist for `0004` but not `0003`/`0010`–`0014`), so
follow the reconciliation procedure in LANES-README.md after generating.

**Core v1 tables (migrations 0000–0003):**
- `sessions` — one scrim. `user_id` (owner/audit trail), `org_id` (tenancy,
  NOT NULL since 0012), `name`, `planned_matches`, `team_count`,
  `template_id` (aesthetic), `scoring_rules` (SUPER JSON), `status`
  (`active|completed`), `created_at`.
- `teams` — session-scoped, `UNIQUE(session_id, name)`, optional
  `logo_url` (PNG data URL, client-resized 256px), optional `slot_number`
  (1–99, unique per session when non-NULL). The wizard defaults Team 1→slot 5,
  Team 2→6, … (`DEFAULT_STARTING_SLOT = 5`, ladder 5–29 for 25 teams); manual
  overrides are keyed by row index, clearable with `""`/`0`, and validated for
  range/duplicates in `lib/sessions/slots.ts`. NULL slots fall back to free
  row numbers in announcement labels (never duplicates); ordering is
  `slot_number ASC NULLS LAST, name ASC`.
- `rosters` — PK `(team_id, player_norm)`; learned player names per team
  (normalized form + first-seen display spelling). Suggestion fuel only.
- `matches` — `UNIQUE(session_id, match_no)`; `status` (`draft|confirmed`);
  `raw_squad_data` jsonb = persisted OCR draft (reopening a draft loads it —
  no second Gemini call); `confirmed_at`.
- `match_results` — one row per team per confirmed match: `placement`,
  `kills` (team total), `placement_points`, `players` jsonb
  (`[{name,kills}]` raw OCR spellings). **The single source of all standings.**
- `mvp_lists` — PK `session_id`; `entries` jsonb
  (`[{rank,name,teamId,kills}]`), `locked` boolean, `locked_at`.

**M2 org tables (migrations 0010–0014):**
- `organizations` (`name`, unique `u-<8hex>` slug, `created_by`).
- `org_members` — PK `(org_id, user_id)`, role `owner|admin|member`;
  role transitions RLS-enforced (owner-grant and owner-row mutation require
  actor-owner).
- `org_invites` — role bounded `admin|member`, SHA-256 `token_hash` unique,
  expiry, accepted-at. Raw token never stored.
- `org_quotas` — platform-owned (members SELECT-only; minted by a bootstrap
  trigger): `max_sessions` (100), `monthly_ocr_calls` (300). Raising a limit
  is a platform-side SQL operation.
- `share_links` — per session, hashed token, creator, expiry/revocation.
- `usage_events` — append-only OCR meter, **one row per successful ingest
  only**; failed attempts never consume quota (the route uses a short RLS tx →
  Gemini call with no DB → short RLS tx split). The admin dashboard's "failed
  AI reads" widgets therefore use honest fallbacks, not invented numbers.
  Quota math: the LIMIT is the org's `monthly_ocr_calls`; the COUNT is the
  **user's** month-total across ALL orgs (creating extra orgs does not mint
  extra quota).

**M3 admin tables (migration 0020):**
- `audit_log` — append-only security event log
  (`actor_user_id`, `effective_user_id`, `action`, target, `metadata`,
  `ip_hash` = sha256(ip + AUDIT_SALT); raw IPs are never stored).
- `feature_flags` — `UNIQUE(subject_type, subject_id, flag)`; subjects
  `user|org|global`; the `disabled` flag on a user is the kill switch.
- `impersonation_sessions` — support impersonation ledger (admin, target,
  `target_email` snapshot, reason, expiry, revocation).

There is also a `profiles` table (in SQL migrations, not drizzle): `id` =
`auth.users.id`, `role` default `'user'` (`'admin'` = platform super-admin),
insert trigger on `auth.users`. Migration `0002` conditionally creates an
`auth` schema stand-in (`auth.users`, `uid()`, `jwt()`) for local Postgres
without GoTrue; all blocks no-op on a hosted Supabase project.

RLS: enabled + FORCE on every table; ~27 core policies plus the org/admin
sets — all `to authenticated`, with USING + WITH CHECK pairing, child tables
walking up to `sessions.user_id`/`org_id` via `public.org_role()`.

---

## 6. End-to-end system flows

### 6.1 Request lifecycle (every page/API call)

```
browser
  → proxy.ts (edge): refresh Supabase tokens;
      anonymous + non-public PAGE → 307 /login?next=…   (API: passes through
      only when Supabase env is configured; fail-closed mode redirects ALL
      non-public paths, including /api/*, to /login)
  → route handler / page / server action (independently re-checks):
      withTenantRoute: same-origin → requireUser (effective identity,
      kill switch) → per-user rate limit → handler
      server actions/pages: requireUser() (action-guard)
      admin surfaces: requireAdmin() (REAL identity)
  → data: withUserDb({sub}, …) → transaction, role=authenticated,
      JWT claims set → RLS-enforced queries
```

### 6.2 The core product loop (the heart — follow this when touching sessions)

1. **`/sessions/new`** — `CreateSessionWizard` (3 steps: basics → teams bulk
   paste + optional logos (client-resized 256×256 PNG data URLs, alpha-
   preserved) → confirm summary with the read-only scoring table). Submit →
   `app/sessions/new/actions.ts` → `lib/sessions/create.ts` (validation in
   `lib/sessions/input.ts`) inserts session + teams (org quota checked),
   redirects to `/sessions/[id]`. The announcement graphic is available
   immediately.
2. **`/sessions/[id]`** — server component page; data via
   `lib/sessions/queries.ts` (`getSessionPageData`, `nextMatchNumber`);
   `SessionView` tabs: **Matches** (default), **Standings**, **Graphics**.
   Standings are computed server-side (`computeStandings` + `withRanks`) —
   `raw_squad_data` is never selected here. `NudgeBanner` nudges the next
   action (confirm pending / finalize / lock MVP).
3. **Add Match N** → `/sessions/[id]/matches/[matchNo]` —
   `UploadPanel` (multi-select 1–14 images, client downscale ≤1600px longest
   edge JPEG q0.85 stripping EXIF, **≤5MB each and ≤20MB total** — see
   `lib/ocr/form.ts`, thumbnail strip with remove/reorder) POSTs FormData to
   **`/api/ocr`**.
4. **`/api/ocr`** (the only Gemini consumer) → see §6.3. On success the match
   row is upserted `status='draft'` with `raw_squad_data` persisted.
5. **Review form** (`ReviewForm`) — rows = squads sorted by placement;
   editable placement/kills/expandable players; team dropdown per row
   (already-chosen teams filtered out); suggestion tiers: strong ≥0.6
   (preselected), weak 0.3–0.6 (preselected + yellow), none (empty + red,
   pinned top); "Accept all suggestions"; low-confidence cell highlights;
   `MISSING_SQUADS` banner + manual add-row; `LOBBY_KILLS_HIGH` derived
   warning banner (never blocks). Confirm disabled until every squad maps to
   a distinct team.
6. **Confirm** → `app/sessions/[id]/matches/[matchNo]/actions.ts` →
   `lib/matches/confirm.ts`: one transaction — replace `match_results`
   idempotently, upsert learned rosters (`learnRosterDelta`), flip to
   confirmed. Cumulative standings + the "AFTER MATCH N" graphic update.
7. **Unlock** a confirmed match → `lib/sessions/lifecycle.ts`
   `unlockMatch`: delete results → back to draft → rebuild rosters from
   remaining confirmed matches. Everything recomputes (R3/R5).
8. **Session end** — "Mark complete" (`CompleteButton`, warns if confirmed <
   planned; re-openable) → standings subtitle becomes "FINAL RESULTS";
   **MVP editor** at `/sessions/[id]/mvp`: draft from
   `lib/mvp/aggregate.ts` (within-team fuzzy merge), full editor
   (rename/adjust/add/remove/reorder/merge/variants expander) → **Lock**
   (`lib/mvp/lock.ts`, re-validates server-side; client gating is never
   trusted) writes `mvp_lists` → MVP graphic renders only from locked
   entries. Unlock retains entries (organizer's manual work is preserved).
9. **Share** — `SharePanel` mints a `share_links` token (raw shown once);
   the public **`/share/[token]`** page renders only the public standings
   projection (`lib/share/public-reader.ts`), no auth, no tenant data,
   rate-limited 60/min per IP. The share panel UI is currently **parked**
   behind `SHOW_SHARE_PANEL = false` in `components/session/SessionView.tsx`
   (API still works); re-enable deliberately, not accidentally.

### 6.3 OCR pipeline internals (`lib/gemini/*`, `lib/ocr/*`, `app/api/ocr/route.ts`)

- Route guard: `withTenantRoute` + org quota probe (`lib/orgs/quotas.ts`,
   counting `usage_events`) — quota exhaustion returns **409** with
  `error.code === "QUOTA_EXCEEDED"` and a `quota` field, never a data lockout.
- Fixture mode: `SAMPLE_OCR=1` and no key → deterministic fixtures for
  matches 1–3 (`lib/fixtures/sampleMatches.ts`); also gated per-request.
- `generateSquads(images, teamCount)` (`lib/gemini/client.ts`): **ONE** call
  with all images; model from `GEMINI_MODEL` (default
  `gemini-3.1-flash-lite`) with a **404-fallback chain**
  (`GEMINI_MODEL_FALLBACKS`); 60s timeout via SDK `httpOptions`;
  `responseMimeType: application/json` + a strict responseSchema. The prompt
  orders character-for-character name copying and never inventing squads.
- `validateSquads` (`lib/gemini/validate.ts`): V1 squad count ==
  team_count (`MISSING_SQUADS`); V2 placements exactly 1..N unique
  (`BAD_PLACEMENTS`); V3 squad size 1–4 / name 1–30 chars / kills 0–20
  (`BAD_KILLS`); V4 lobby kills > 99 → soft warning `LOBBY_KILLS_HIGH`
  (never fails, never retries). Failures V1–V3 trigger exactly ONE corrective
  retry (appends the failure reason to the prompt); PARSE_FAILED and other
  Gemini errors propagate without burning the chain.
- Success → match row upserted as draft with `raw_squad_data` (R6: reopening
  a draft never re-OCRs). Raw images are never persisted.
- Every **successful** ingest appends a `usage_events` row (the meter);
  failures are not metered (§5).

### 6.4 Suggestion engine (`lib/matching/*`)

- `normalizeName` (in `normalize.ts`): NFKD → strip combining marks → remove
  zero-width chars → lowercase → every run of non-`[\p{L}\p{N}]` becomes ONE
  space → trim. **No tag-prefix stripping** — a deliberate review decision
  (separator classes are ambiguous on single strings; the MVP editor resolves
  tag drift).
- `suggestMappings(squads, rosters)` (`suggest.ts`): greedy one-to-one
  assignment over a score matrix — roster-name overlap ratio + 0.3 tag-affinity
  bonus (Gemini's `squadTag` vs team-name tokens, never derived by stripping
  player names). Tiers: strong ≥0.6 / weak 0.3–0.6 / none. Two teams sharing
  one tag must never cross-assign.
- Suggestions are HINTS. The human confirms every mapping, every match (R2).

### 6.5 Auth flows

- `/signup`, `/login`, `/forgot-password`, `/reset-password` — all forms post
  to `/api/auth/*` route handlers (never client-side Supabase). Rate-limited
  (per-IP and per-email buckets), enumeration-safe **credential-mismatch**
  copy with actionable 503/403/429/502 states (§4.5), `?next=` sanitized via
  `lib/auth/next-url.ts`. `/auth/callback` exchanges the recovery/token URL
  and emits redirects through a **trusted-origin policy**
  (`appOriginFromRequest`, `sanitizeNextOr`) because route-handler
  `request.url` carries a placeholder host behind the proxy; `/auth/error`
  renders typed failures. Auth cookies use shared `AUTH_COOKIE_OPTIONS`
  (`lib/auth/cookies.ts`: HttpOnly, SameSite=Lax, Secure in prod).
- Login lands you on `/` which redirects by role (see §8 route map).
- `APP_ORIGIN` is required in production for recovery links — the flow
  **fails closed** without it.

### 6.6 Orgs, invites, quotas

- `/orgs` (list), `/orgs/new` (create; `u-<hex>` slug), `/orgs/[id]` (detail:
  members, invites, quotas, rename). Roles: owner/admin/member with
  RLS-enforced transitions. Invites: `InviteForm` mints single-use hashed
  links; `/invite/[token]` accepts (anonymous users are bounced to login
  before any state change). `QuotaBanner` surfaces remaining quota.
- Sessions are created inside an org context (the member dashboard's org
  switcher passes `?org=<id>`, membership-validated).

### 6.7 Admin panel (super-admin, `/admin`)

- Light lime-and-black theme (`styles/admin-theme.css`, `dash-*`/admin tokens
  in `app/globals.css`), floating sidebar shell (`AdminShell`) with ⌘K search
  (`/api/admin/search`), notifications bell, and the impersonation dialog.
- Dashboard widgets (stat cards + time filter, lifecycle pipeline, featured
  org, gauge, needs-attention table, attention list, AI card) are wired to
  real platform data via the read-only, audit-silent
  `lib/admin/dashboard-queries.ts`. Where a metric has no honest source
  (e.g. failed AI reads are not metered), widgets use explicit fallbacks —
  **never invented numbers**.
- Consoles: `/admin/tenants` (users; enable/disable = kill switch),
  `/admin/flags` (feature flags editor), `/admin/audit` (append-only log),
  `/admin/orgs` (read-only org directory).
- **Impersonation**: dialog (`ImpersonateDialog`, requires a reason) →
  `/api/admin/impersonate/start` mints the ledger row + signed cookie → the
  admin now experiences the site as the target member (effective identity)
  with `ImpersonationBanner` / dashboard strip everywhere; stop via
  `/api/admin/impersonate/stop` or the exit button. Everything audited.
- Admin guards use REAL identity — a platform admin who impersonates retains
  admin capability and can still navigate directly to `/admin`; ordinary
  landing/navigation sends an impersonating admin to the target's
  `/dashboard` (M6 deviation D10). Do not "fix" this by checking effective
  identity in admin guards.

### 6.8 Graphics engine (`lib/graphics/*` + `components/graphics/*`)

- Canvas is **exactly 1080×1620 (2:3)**; export is client-side via
  `exportPng` (`components/graphics/export.ts`, html-to-image) after
  `document.fonts.ready`; output exactly 1080×1620 PNG; container-query CSS
  scaling (`scale(calc(100cqw / 1080px))`) preserves the ratio with zero JS.
  Export hardening: wait for the first `<img>` to load/error + `art.decode()`
  (15s `ART_TIMEOUT_MS`), run a **discarded warm-up `toPng`**, pass explicit
  width/height/`pixelRatio: 1`/`backgroundColor: "#0b0d12"`, and abort
  superseded captures (`EXPORT_SUPERSEDED`) when the aesthetic switches.
  `DownloadPngButton` verifies the exported PNG's real dimensions.
- `GraphicCanvas` (required `variant`: standings | mvp | announcement) renders
  absolutely-positioned slots over a background. **Templates = background
  image + coordinate config.** There are now **26 aesthetics**
  (`AestheticId` in `lib/graphics/types.ts`, registered in
  `lib/graphics/aesthetics.ts`): the original three dev gradients
  (`dark-gold`, `purple-butterfly`, `pink-blossom`) plus 23 art-backed skins —
  `pmpl-light`, `neon-green`, `challengers-red` and 20 added in the P8
  campaign: `ewc-yellow`, `onyx-green`, `pmgc-crimson`, `pmgc-aqua`,
  `pmgc-sapphire`, `pmwi-violet`, `grunge-red`, `esports-clash`,
  `rundown-orange`, `royal-blue`, `varsity-yellow`, `court-orange`,
  `dusk-amber`, `cardinal-gold`, `apex-blaze`, `urban-slate`,
  `varsity-purple`, `varsity-orange`, `pmsl-cobalt`, `ewc-teal`. Art lives in
  `public/templates/<id>/<variant>.png|jpeg` (24 dirs incl.
  `Refrence-results/`); many `.png` files actually contain **JPEG bytes**
  (magic-byte sniffed by tests) — do not re-encode them casually.
- **Gradients are internal fallbacks only.** `lib/graphics/availability.ts`
  (`hasArtForVariant`, `selectableAestheticIds(variant?)`,
  `defaultAestheticId`) filters the picker to art-backed skins; gradient-only
  rows exist for legacy data and dev tools. `lib/sessions/input.ts` validates
  `VALID_TEMPLATE_IDS = selectableAestheticIds()`. `getTemplate()` falls back
  to dark-gold for unknown/legacy ids so historical rows never crash.
- `TemplateConfig` (engine v3) key ideas: per-variant `backgrounds`;
  `statColumns`; per-variant `labelsBakedIn` / `subtitleBakedIn`;
  `variantHeaders` + `headerFor()`; `singleColumn` (neon's one full-width
  table); `rowsBottom`-driven row auto-fit (`columnPitch`, `splitRows`,
  `effectivePitch` in `lib/graphics/layout.ts`); `hideScrimName` /
  `variantHideScrimName`, `uniformMvpRows`, `watermarkYOffset`. P8 additions:
  `ImageFit`/`fit` + `imageFitStyle()` (uniform, distortion-free scaling for
  non-2:3 art), `canvasBackground` (letterbox fill), `headerPills`,
  `subtitlePrefix`, `ranksBakedIn`, `rowsPerColumn` + `splitRowsAt`
  (24→[12,12], 25→[12,13]; overflow rows render below the table, never
  dropped), `fixedRowPitch` and zero-drift `lineYs`/`barCenterYs` arrays,
  `announcementLayout` + `announcementBarLayout` (`slotPosition: "right"` +
  `pipeGap` on varsity-orange), `mvpLayoutStyle` (8 branches: standard,
  starting-five-brush, esports-card, paper-banner, draft-parchment-bars,
  starting-five-crimson, supercross-row-list, starting-five-slate-pills),
  `mvpShowTeam`, an expanded palette (`medalGold/Silver/Bronze`, `plateBg`,
  `plateRing`), `topRows*` two-tone table ink, and typography flags
  (`nameLetterSpacing`, `nameUppercase`). See `lib/graphics/types.ts`.
- The watermark **text** `scrimlypro.com` and its **position** are hardcoded
  bottom-right (`x:730, y:1570`) — brand law. Its **ink** is per-theme
  (`palette.watermarkColor`) and the announcement variant may shift it with
  `watermarkYOffset`; those are the only configurable aspects.
- Font stack: `"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui,
  sans-serif` with named stacks (`FONTS`, `FONTS_FULL`, `FONTS_EDITORIAL`,
  `BRUSH_FONTS` in `lib/graphics/fonts.ts`; `Permanent Marker` via
  `--font-brush` for grunge-red). Art-backed broadcast tables use weight 800
  (browser-synthesized for 900/800 faces that aren't imported).
- Geometry for art-backed templates is **measured from the art pixels** and
  pinned by tests (`tests/graphics.test.ts`, `tests/graphics-contrast.test.ts`
  for contrast, plus a dedicated suite per new skin). Changing art means
  re-measuring and updating pins; `docs/MASTER-PROMPT-graphic-alignment.md` is
  the WIP driver (measure in canvas pixels with scale `1080 / artWidth`, keep
  `rowHeight ≤ rowPitch`, painted bar center == text-box center, mandatory
  second review pass).
- Art-load UX: `GraphicCanvas` tracks settled srcs and shows
  `GraphicLoadingOverlay` (shimmer) behind an `aria-busy`/live region; the
  overlay is deliberately mounted **after** the export stage so html-to-image
  cannot capture it. Previews disable download until art is ready;
  `AestheticChips` prefetches art on hover/focus.
- Dev routes require an authenticated user (`requireUser()`) and are
  hard-404'd in production (NODE_ENV gate in every page), all
  `force-dynamic`: `/dev/graphics` (sandbox), `/dev/standings`, `/dev/mvp`,
  `/dev/announcement` (incl. `?fixture=varsity-orange-24`), `/dev/glyphs`
  (glyph torture: real OCR'd Arabic/CJK/katakana/symbol names),
  `/dev/calibrate` (16/19/**24**/25-team datasets with transcribed PMSL Cobalt
  & EWC Teal boards, pixel grid + live config readout), `/dev/boom` (error
  boundary test). Several read the **seeded DB**, not just fixtures — run
  `npm run db:seed` first if a dev page reports a missing seed session.

---

## 7. Folder-by-folder guide (annotated tree)

```
ScrimlyPro/
├── PRD.md / ERD.md / PLAN.md / PRODUCT.md   # truth files (intent/history — see drift warning §2)
├── README.md               # run book + Assumptions log (READ before deviating)
├── PROJECT-CONTEXT.md      # newer handoff snapshot (in-flight P8 work, drift)
├── LANES-README.md         # parallel-lane orchestration record
├── ScrimlyPro-SaaS-explainer.md
├── ScrimlyPro-Oracle-Deploy-Runbook.md  # LIVE VM topology, provisioning, rollback
├── AGENTS.md / CLAUDE.md   # Next 16 agent rules (CLAUDE just refs AGENTS)
├── index.html              # stray design PROTOTYPE — NOT part of the Next app
├── proxy.ts                # Next 16 "middleware": token refresh + login redirect ONLY
├── next.config.ts          # security headers, poweredByHeader:false, turbopack.root,
│                           #   experimental.agentUpgrade:"security" (no allowedDevOrigins)
├── drizzle.config.ts       # drizzle-kit (schema → db/migrations)
├── vitest.config.ts        # node env, globalSetup DB sweep, maxWorkers 2,
│                           #   hookTimeout 180s, testTimeout 30s
├── eslint.config.mjs       # THE architecture enforcement (see §4)
├── smoke.mjs               # manual smoke script
├── .env.example            # every app env var with commentary (see §10)
│
├── app/                    # Next.js App Router — ALL routes (see §8)
│   ├── layout.tsx          # root layout: fonts (Exo2/Rajdhani/Noto + landing
│   │                       #   Inter/Inter Tight/Lexend + Permanent Marker as
│   │                       #   --font-brush), AccountHeader
│   ├── page.tsx            # "/": landing (Hero→Benefits→Reserve→Footer) for
│   │                       #   anonymous; role redirect for authed users
│   ├── favicon.ico / icon.svg
│   ├── globals.css         # Tailwind v4 + dark theme + light dash-* tokens
│   │                       #   + .graphic-skeleton* shimmer keyframes (§6.8)
│   ├── error.tsx / global-error.tsx / not-found.tsx / loading.tsx
│   ├── login|signup|forgot-password|reset-password/   # auth pages (public)
│   ├── __admin_canary__/ + admin/__canary__/  # ESLint perimeter fixtures (NOT routes)
│   ├── auth/callback/route.ts + auth/error/           # recovery exchange
│   ├── dashboard/          # M5 member dashboard (layout/page/loading)
│   ├── orgs/               # org list/new/[id] (+ actions), orgs/layout.tsx
│   ├── invite/[token]/     # invite acceptance (page + actions)
│   ├── share/[token]/      # PUBLIC share page (no auth)
│   ├── sessions/           # the product: list layout, new/ (wizard+actions),
│   │   └── [id]/           # session page (+loading), matches/[matchNo]/,
│   │                       #   mvp/ (+actions) — actions.ts = thin wiring
│   ├── admin/              # M6 super-admin: page (dashboard), layout,
│   │   └── tenants|flags|audit|orgs/   # consoles (+ actions/forms)
│   ├── api/                # route handlers (see §8)
│   └── dev/                # dev-only fixture pages (404 in production,
│                           #   requireUser(), force-dynamic);
│                           #   calibrate/CalibrateClient.tsx
│
├── components/
│   ├── landing/            # Hero (+module css), BenefitsSection, CtaSection
│   │                       #   (legacy; Reserve replaced it on "/"),
│   │                       #   useReducedMotion
│   ├── reserve-section.tsx / site-footer.tsx (+module css)  # landing sections
│   ├── fonts.ts            # shared landing type scale
│   ├── app/                # NEW shared light-surface UI vocabulary:
│   │                       #   AccountMenu, ui.tsx (buttons/fields/cards/
│   │                       #   StatusChip/ProgressBar/PageHeader/EmptyState), icons
│   ├── auth/               # AuthForm (all credential forms), AccountHeader
│   │                       #   (the one sanctioned getSession consumer),
│   │                       #   AuthShell + login-panel (split-screen shell,
│   │                       #   ?disabled=1 notice via client Suspense)
│   ├── forms/              # CreateSessionWizard (3-step; team slot defaults), resize-logo
│   ├── matches/            # UploadPanel (downscale+thumbnails), ReviewForm
│   │                       #   (the mapping UI), resize-images
│   ├── session/            # SessionView (tabs), MatchesTab, StandingsTab,
│   │                       #   GraphicsTab, NudgeBanner, CompleteButton,
│   │                       #   SharePanel
│   ├── mvp/                # MvpEditor, UnlockButton
│   ├── graphics/           # GraphicCanvas, OverallStandingsGraphic, MvpGraphic,
│   │                       #   AnnouncementGraphic, *Preview wrappers,
│   │                       #   AestheticChips (art-filtered picker + prefetch),
│   │                       #   GraphicLoadingOverlay, ShareStandingsPreview,
│   │                       #   DownloadPngButton, export.ts (hardened exportPng),
│   │                       #   dev-sandbox, dev-glyph-torture
│   ├── dashboard/          # M5 member dashboard widgets (sidebar, top-bar,
│   │                       #   stat-cards, pipeline, readiness-gauge,
│   │                       #   featured-card, attention-table, onboarding,
│   │                       #   command-palette, notifications, greeting-row,
│   │                       #   ai-card, sidebar-drawer, icons)
│   ├── admin/              # shell/ (AdminShell, SearchField,
│   │                       #   ImpersonateDialog, NotificationsBell, icons),
│   │                       #   dashboard/ (M6 widgets + GreetingRow,
│   │                       #   ImpersonationStrip), ImpersonationBanner,
│   │                       #   ImpersonationExitButton, GlobalStopButton
│   ├── orgs/               # CreateOrgForm, InviteForm, AcceptInviteForm,
│   │                       #   MemberActions, QuotaBanner, CopyField
│   └── ui/                 # (empty placeholder)
│
├── lib/                    # ALL business logic — pure, typed, tested
│   ├── db/                 # schema.ts (drizzle), client.ts (getDb, owner),
│   │                       #   user.ts (withUserDb — THE tenant path),
│   │                       #   admin.ts (getAdminSql: RLS bypass via SUPABASE_DB_URL),
│   │                       #   legacy-sqlite.ts
│   ├── supabase/           # server.ts (getAuthedUser), browser.ts
│   ├── auth/               # public-paths, next-url (sanitize ?next= +
│   │                       #   trusted-origin policy), cookies (shared
│   │                       #   AUTH_COOKIE_OPTIONS), origin-guard (CSRF),
│   │                       #   rate-limit (sliding window; TRUST_PROXY law),
│   │                       #   validate (zod-free manual validation),
│   │                       #   responses (no-store JSON), route-helpers
│   │                       #   (actionable auth errors), route-guard
│   │                       #   (withTenantRoute), action-guard (requireUser),
│   │                       #   platform-role (isPlatformAdmin — single source)
│   ├── admin/              # require-admin, admin-db (service-role re-export),
│   │                       #   queries, dashboard-queries (read-only),
│   │                       #   audit, impersonation (getEffectiveUser),
│   │                       #   kill-switch (isUserDisabled)
│   ├── orgs/               # orgs, roles, invites, tokens (hash mint/verify),
│   │                       #   quotas (usage_events math), origin
│   ├── share/              # links (mint/revoke), public-reader (public
│   │                       #   projection; sanctioned service-role read),
│   │                       #   rate-limit (60/min public)
│   ├── sessions/           # create (wizard→rows), input (validation +
│   │                       #   selectable template ids), slots (default 5..29
│   │                       #   ladder, overrides, duplicate checks, ordering),
│   │                       #   queries (getSessionPageData), lifecycle
│   │                       #   (unlock/complete/reopen), samples
│   ├── matches/            # mapping (validateMapping), confirm (the atomic
│   │                       #   confirm pipeline), index (sanitizeSquads)
│   ├── ocr/                # form (parseOcrFormData), ingest (route-level
│   │                       #   orchestration), index
│   ├── gemini/             # client (transport+fallback chain), parse,
│   │                       #   validate (V1–V4 + retry), index
│   ├── scoring/            # rules (SUPER_RULES), standings
│   │                       #   (computeStandings + withRanks), index
│   ├── matching/           # normalize (the pipeline), suggest (matrix),
│   │                       #   index (learnRosterDelta/rebuildRosters)
│   ├── mvp/                # aggregate (within-team merge), lock
│   │                       #   (validateMvpEntries + lockMvpList),
│   │                       #   lifecycle (unlockMvp), index
│   ├── graphics/           # types (TemplateConfig/specs, 26 AestheticIds),
│   │                       #   aesthetics (26 templates), availability
│   │                       #   (art-only picker), fonts (4 named stacks),
│   │                       #   layout (row auto-fit/contrast helpers),
│   │                       #   standings/mvp/announcement (projections), index
│   ├── dashboard/          # queries (org-scoped read-only), org (selection)
│   ├── fixtures/           # sampleMatches (SAMPLE_OCR), glyphNames (torture),
│   │                       #   pmslCobalt + ewcTeal (24-team dev datasets)
│   ├── audit/auth-events.ts# auth event audit writer
│   ├── http.ts             # noStore() JSON helper
│   └── utils/cn.ts         # clsx wrapper
│
├── db/
│   ├── migrations/         # committed, versioned SQL (drizzle journal + meta)
│   └── migrations-sqlite-legacy/   # pre-M1 SQLite history (reference only)
│
├── scripts/                # npm-run + ops scripts (§9): deploy.sh,
│                           #   backup-db.mjs, restore-test.mjs, migrate.mjs,
│                           #   dev-auth-server.mjs, verify-*.sh, acceptance/
├── tests/                  # 82 Vitest files (§9), tests/auth/, tests/api/,
│                           #   tests/rls/, tests/helpers/, global-setup.ts
├── styles/admin-theme.css  # M6 admin light theme
├── public/                 # icons, hero art, machine.jpeg, templates/<id>/
│                           #   (23 art-backed skins + Refrence-results/;
│                           #    many .png files carry JPEG bytes — §6.8)
├── docs/                   # reports/, deploy/cut-over.md, reference/,
│                           #   MASTER-PROMPT-graphic-alignment.md
├── shots/                  # screenshot evidence + golden images
└── data/                   # (gitignored) legacy SQLite db — historical only
```

---

## 8. Route map

**Public pages** (in `lib/auth/public-paths.ts` `PUBLIC_PAGES`, prefix-matched):
`/` (landing for anonymous; authed users are redirected by role —
real-identity platform admins → `/admin`, everyone else → `/dashboard`; an
impersonating admin follows the TARGET to `/dashboard`), `/login`, `/signup`,
`/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/error`,
`/invite/[token]` (login-gated before state change), `/share/[token]` (fully
public, rate-limited). Keep additions in this ONE place — a temporary
`/dev/verify` bypass once violated this law and had to be removed.

**Member (authed)**: `/dashboard` (M5; light theme; org via `?org=`;
⌘K palette), `/orgs`, `/orgs/new`, `/orgs/[id]`, `/sessions` (layout only),
`/sessions/new`, `/sessions/[id]`, `/sessions/[id]/matches/[matchNo]`,
`/sessions/[id]/mvp`.

**Admin (platform role)**: `/admin`, `/admin/tenants`, `/admin/flags`,
`/admin/audit`, `/admin/orgs`.

**API route handlers**:
- `/api/auth/{signup,login,logout,forgot-password,reset-password}` —
  server-mediated credentials; rate-limited; enumeration-safe copy for
  credential mismatch only (§4.5).
- `/api/ocr` — the Gemini ingest (withTenantRoute + org quota + meter-on-success).
- `/api/sessions/[id]/share` — mint/revoke share links.
- `/api/orgs/[id]/invites` — mint/list org invites.
- `/api/dashboard/search` — member ⌘K search (withTenantRoute).
- `/api/admin/search` — admin ⌘K search (requireAdmin, 404-law, no-store).
- `/api/admin/impersonate/{start,stop}` — impersonation lifecycle.
- `/api/admin/tenants/{enable,disable}` — kill switch.
- `/api/health` — liveness (the ONLY public API path). It returns
  `{"status":"ok","version":"0.1.0"}` with **no DB ping** — a green health
  check says nothing about database reachability.
- Canary fixtures under `app/__admin_canary__/`, `app/admin/__canary__/` and
  `lib/auth/__canary_forbidden.ts` are ESLint perimeter tests, **not routes**.

**Dev-only** (NODE_ENV-gated 404 in production, `requireUser()`-gated,
`force-dynamic`): `/dev/graphics`, `/dev/standings`, `/dev/mvp`,
`/dev/announcement`, `/dev/glyphs`, `/dev/calibrate`, `/dev/boom`.

---

## 9. Tests, scripts, and quality gates

**Test suite** (`npm test` → Vitest, node env; **82 `*.test.ts` files,
~1,050 `it()`/`test()` declarations** — the "~600+" figure is stale).
Facts that matter:
- DB-backed tests build throwaway `m*test_*` databases on the Postgres at
  `SUPABASE_DB_URL` (per-file creation + cleanup in `tests/helpers/pg.ts`);
  a globalSetup worker-owned teardown sweeps leftovers. `maxWorkers: 2`,
  `hookTimeout: 180s` and `testTimeout: 30_000` are reliability levers
  (parallel DROP contention) — do not "optimize" them away. CI uses a
  `postgres:16` service container on 5432 with health checks.
- Expect benign noise in full runs: Postgres NOTICE spam, occasional
  "Invalid hook call" warnings, and **negative `verify:secrets` FAIL lines**
  from that script's own canary self-test — judge the final exit codes.
- Suite layout mirrors the architecture: root files (scoring, matching, mvp,
  gemini, ocr-form/ingest, session-create/input/page/quota/slots,
  matches-mapping/confirm, standings-graphic, graphics + graphics-contrast +
  graphics-ssr + graphics-availability + graphics-loading + glyph-fixtures,
  one `<skin>-standings`/`-mvp`/`-announcement` suite per art-backed template,
  mvp-lock, rate-limit, login-errors, db, sqlite, cn); `tests/auth/*`
  (public paths, next-url, origin-guard, **action-guard — note the folder**);
  `tests/api/*` (auth-matrix, admin-guard/search/audit-events,
  impersonation(+dialog), kill-switch, ocr-guard/quota, org-guard-fold,
  org-invites, role-landing, dashboard-queries); `tests/rls/*`
  (tenant-isolation, org-isolation, admin-tables); `tests/orgs/*`,
  `tests/share/*`, `tests/dashboard/*`; `tests/architecture/guards.test.ts`
  (the route-guard meta-test); `tests/security/secrets-scan.test.ts`.
  `tests/helpers/*` and `tests/global-setup.ts` are support files.

**Green-gate set** (what "done" means here — run before every commit). The
CI `verify` job (`.github/workflows/ci.yml`, Node 22, `npm ci`, 25-min
timeout) runs exactly: typecheck → lint → **`db:migrate`** → seed `.env.local`
with canary secret-shaped values → test → build → `verify:secrets`. There is
no deploy job in CI. Do **not** use `npm install --ignore-scripts` in CI —
Node 22 has prebuilt better-sqlite3/SWC binaries; that flag is a local
Node 25 workaround only.
```bash
npm run typecheck     # tsc --noEmit (zero any)
npm run lint          # eslint — the architecture laws live here
npm run db:migrate    # migration chain must apply cleanly
npm test              # full suite
npm run build         # next build
npm run verify:secrets   # after build: no secrets in the client bundle
```
Security-relevant work additionally: `npx vitest run tests/rls` and
`bash scripts/verify-auth-matrix.sh` with `BASE_URL=http://127.0.0.1:<port>`
(`ORIGIN` defaults to `BASE_URL`) — **caution:** this script still asserts
`GET /` unauthenticated → 307, which now fails because `/` is a public
landing page (200). `scripts/verify-production.sh` already has the corrected
expectation; fix the matrix script rather than changing the app.

**DB scripts** (all operate on `SUPABASE_DB_URL` — **never the cloud DSN for
reset/seed/sweep-test**):
`db:generate` (drizzle-kit → SQL migrations; committed; `scripts/migrate.mjs`
applies them) · `db:migrate` · `db:reset` (drop/recreate public + reseed;
idempotent) · `db:seed` (deterministic demo session: 6 matches, 16 Pakistani
team names, SUPER rules, matches 1–2 confirmed; 66 roster rows) ·
`db:sweep-test` · `db:backup` (`scripts/backup-db.mjs` → timestamped
`<BACKUP_DIR>/db.dump` + `manifest.json`, DSN never printed) /
`db:restore-test` (restore into a throwaway `ops_restore_test_*` DB only, count
rows, refuse corrupt backups) · `scripts/golden-check.ts` (legacy-migration
parity) · `scripts/migrate-local-to-supabase.mjs` (dry-run / `--apply`,
`LEGACY_SQLITE_PATH` + `SUPABASE_PILOT_OWNER_EMAIL`).
`npm run dev:auth` (`scripts/dev-auth-server.mjs`) starts a local GoTrue stub
on port 54321 (`DEV_AUTH_PORT`/`DEV_AUTH_SECRET`) with scrypt passwords in
`public.dev_auth_users`; **never point it at a hosted/cut-over database**.

**Ops/verification**: `scripts/deploy.sh` (§14), `scripts/verify-production.sh`
(black-box matrix; `BASE_URL` required, `APP_ORIGIN` for POST Origin headers,
optional owner/attacker credentials — without them authenticated rows SKIP,
which is **not** cut-over evidence), `scripts/verify-auth-matrix.sh` (stale
`/` expectation — see above), `scripts/check-secrets-in-bundle.mjs`,
`scripts/acceptance/*` (CDP-driven golden-path walk, 375px sweep, debug
helpers), `scripts/m5-dev-*` (dashboard seed/demo/user). Dependabot runs
weekly for npm (`dependencies`) and github-actions (`ci`), max 5 open PRs each.

**Migration numbering law** (from lane orchestration): blocks were assigned
per lane — 0010–0019 (orgs; consumed 0010–0014), 0020–0029 (admin; consumed
0020 and **0021** for `teams.slot_number`); 0030–0039 RESERVED and UNUSED.
`drizzle-kit generate` output must be renamed into your block before
committing, and the journal is the source of truth. After adding migrations
to a forked snapshot graph, follow the four-step reconciliation procedure in
LANES-README.md (mint a fresh full-schema snapshot, splice it in, re-run
generate — the diff must be empty).

---

## 10. Environment variables (`.env.example` is canonical for the app vars)

| Var | Scope | Meaning |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase project URL + anon key. Baked at build time — changing them on the VM needs a rebuild. |
| `SUPABASE_DB_URL` | server | Postgres connection (Drizzle + migrations + the RLS-bypassing `getAdminSql()`). Required for anything beyond static pages; on the VM use the **session pooler** URI (port 5432), not the transaction pooler (6543), for `pg_dump`/`pg_restore`. |
| `SUPABASE_SERVICE_ROLE_KEY` | server, scripts only | Supabase **REST/auth** service-role credential. NEVER client-imported. The SQL admin client does **not** read it — it uses `SUPABASE_DB_URL`; older docs claiming otherwise are stale. |
| `GEMINI_API_KEY` | server, `/api/ocr` only | OCR key. |
| `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACKS` | server | Default `gemini-3.1-flash-lite` + 404 fallback chain (`gemini-2.5-flash-lite,gemini-2.0-flash-lite`). |
| `SAMPLE_OCR` | server | `1` = fixture mode (matches 1–3) without a key. **Must be `0` in production.** |
| `APP_ORIGIN` | server | Public origin for recovery links and trusted redirect origin; **production fails closed** without it. |
| `IMP_SECRET` | server | 32-byte hex HMAC key for impersonation cookies; **production fails closed**. |
| `AUDIT_SALT` | server | sha256(ip + salt) for audit `ip_hash`; missing ⇒ rows carry no hash. |
| `TRUST_PROXY` | server | Distrust-by-default; set `true` ONLY behind a proxy that overwrites `x-forwarded-for` (e.g. Caddy on the VM; full matrix in README). |

**Ops/script-only vars** (not in `.env.example`): `BACKUP_DIR` (default
`./backups`; VM cron uses `/home/ubuntu/backups`), `PG_BIN_DIR` (`pg_dump`/
`pg_restore` dir; VM fallback `/usr/lib/postgresql/16/bin`), `APP_DIR` /
`SERVICE` / `PORT` (defaults `/home/ubuntu/scrimlypro`, `scrimlypro`, `3000`
in `scripts/deploy.sh`), `DEV_AUTH_PORT` / `DEV_AUTH_SECRET` (local GoTrue
stub), `LEGACY_SQLITE_PATH` / `SUPABASE_PILOT_OWNER_EMAIL` (legacy migration),
and `BASE_URL` / `APP_ORIGIN` / `OWNER_EMAIL` / `OWNER_PASSWORD` /
`ATTACKER_EMAIL` / `ATTACKER_PASSWORD` (production verifier). CI seeds a
`.env.local` with canary secret-shaped values before tests so `verify:secrets`
has real strings to find (the tests delete `SUPABASE_DB_URL` at teardown —
commit `e518e3b`). `scripts/check-secrets-in-bundle.mjs` also reads
`.env.local.bak` for canaries.

---

## 11. Local development on this machine (practicalities & gotchas)

- `npm install` → `npm run dev`. The README documents `http://localhost:3000`,
  but **check which port is free before starting** — on this dev box the
  project has been served on other ports (recently 3311; port 3000 has been
  occupied by a different project), and lane work historically used 30xx
  ports. Next 16 refuses a second dev server in the same directory.
- The README's "local Postgres cluster" section describes this Windows dev
  box (`C:\Users\mianq\...`, port **54329**, embedded PG 17.6 database
  `scrimlypro_main`); `.env.local` currently points there and sets
  `SAMPLE_OCR=1`. Migration `0002` creates the `auth` schema stand-in when
  GoTrue is absent; `npm run dev:auth` can stub GoTrue on 54321 instead.
  On another machine, use any Postgres 14+ reachable via `SUPABASE_DB_URL`
  (Docker `supabase start` is canonical). A past `0xC0000142` PG crash was
  fixed with a sanitized-PATH detached WMI start (details in
  `PROJECT-CONTEXT.md`). Never point `npm test` at the cloud DSN.
- Node: README/CI target Node 22 LTS (prebuilt better-sqlite3/SWC binaries).
  Work has also run on Node 25 with the documented
  `npm install --ignore-scripts` workaround (no VS Build Tools) — that flag
  is a local workaround, **not** for CI. If dependencies change, finish with
  `npx npm@10 install --package-lock-only` (npm 11 lockfiles break CI/VM
  `npm ci` with `EUSAGE ... Missing: esbuild@0.28.2`).
- `npm install` can invalidate Next's version state — if the dev server
  reports a version mismatch after install, restart it.
- Do not broadly `pkill node` on this box — you will kill unrelated
  projects' servers. Kill by port/pid.
- The landing page must render identically with/without JS-animating panes;
  if you automate screenshots, note some browser panes freeze CSS
  transitions when backgrounded (force-finish animations before capture).
- Root `index.html` (and similar stray HTML) are design prototypes, NOT the
  app. The real landing lives in `app/page.tsx` + `components/landing/*`,
  ordered **Hero → BenefitsSection → ReserveSection → SiteFooter** (the
  Reserve section replaced the older CtaSection, which still exists as a
  component). Landing typefaces come via `next/font` CSS variables
  (`--font-inter-tight`, `--font-inter`, `--font-lexend`) + the shared scale
  in `components/fonts.ts`; watch the deliberate `::before` white-gap fix
  over the dark body when editing section CSS.
- An older note recommended Next's `allowedDevOrigins` for cross-origin dev
  warnings. **It is not in the current `next.config.ts`** (it existed only on
  the now-stale `landing-page` branch) — don't go looking for that knob; check
  the current config and the proxy/CSP rules instead.
- `.claude/settings.local.json` auto-runs the `impeccable` hook on session
  start, on Edit/Write and on Stop; UI edits are expected to load the
  Impeccable skill's `craft-floor.md` first (see `.claude/skills/`).

---

## 12. Branch/history map (volatile — verify with git)

This is **not** a source of truth for the current branch: the repo carries
many concurrent feature branches and uncommitted work, and the active branch
changes daily. Always run `git status --short --branch`, `git branch -vv`,
`git rev-list --left-right --count origin/main...HEAD` and `git log --oneline -20`
for orientation. `origin/main` is the trunk (local `main` may lag); at
this revision it sits at `144d5d8`, with P8 graphics feature branches in
flight and dirty template/test files in the tree. `public/machine.jpeg` is
now tracked. The old "`landing-page` contains everything" claim is stale —
that branch is over 70 commits behind `origin/main`. **Never revert or clean
uncommitted work** — it is usually in-flight P8 re-measurement.

Build history referenced in comments and reports:
- **v1-core (C1.1–C7.1)**: scaffold, data layer, pure domain logic
  (scoring, matching, MVP, Gemini), graphics engine, session flow UI,
  match loop, finale, hardening. SQLite era.
- **M1 (+hardening lane)**: Postgres/Supabase port, GoTrue auth, RLS
  everywhere, `withUserDb` law, proxy, adversarial test suites, legacy-DB
  migration with golden check.
- **Wave 1 lanes** (see LANES-README.md): B=M2 orgs/invites/quotas/share;
  C=M3 admin (kill switch, impersonation, audit, flags); D=deps; E=ops
  (backups, verify-production, cut-over runbook).
- **P4–P7**: template engine v2/v3 (per-variant backgrounds, art-backed
  aesthetics pmpl-light/neon-green/challengers-red, measured calibration,
  contrast pins) + the Exo 2 font swap with re-measured fit.
- **M5**: member dashboard at `/dashboard` (light dash-* design, org
  switcher, ⌘K, real read-only queries; deviations recorded in its report).
- **M6**: super-admin dashboard rebuild (lime-and-black shell, real-data
  widgets, ⌘K admin search, impersonation dialog/strip, read-only
  /admin/orgs; honest fallbacks where data doesn't exist).
- **landing-page**: marketing landing at `/` (anonymous only) + role
  redirect for authed users; `/` was added to `PUBLIC_PAGES`.
- **Post-deploy workflow (Nov 2026)**: `bae8851` (§14 documented), `c549d22`
  (auth-cookie hardening + trusted callback origin), `0379db8` (public
  landing restored), `144d5d8` (art-swap shimmer, share panel parked),
  `1fe1ec9` (deploy-ready CI/backups/deploy.sh/runbook), `22151e3` (npm-10
  lockfile + Actions v7), `e518e3b` (CI env seeding), `e54cf9a` (Next
  16.4.6 security upgrade).
- **P8 (2026-11-17 → ongoing)**: art-backed aesthetic campaign — 20 new
  skins (§6.8), art-only picker filtering, shimmer skeleton, `88a9daa`
  (team-slot defaults, login-error UX, dev-auth stub), EWC Teal / PMSL
  Cobalt 24-team boards, per-skin pinned tests. No P8 report yet; state
  lives in `PROJECT-CONTEXT.md` and the working tree.
- Deliberately NOT built / parking lot (do not start without instruction):
  payments/entitlements, email delivery of invites, per-match graphics
  (data already supports it), custom template upload, org-level kill-switch
  wiring, Redis-backed limiters, Storage-bucket logos (still data URLs),
  share-link OG tags and expiry defaults, ownership transfer, Next 17
  upgrade. The share panel UI is parked (`SHOW_SHARE_PANEL = false`), not
  deleted.

---

## 13. Working rules (the change checklist)

1. **Understand before editing.** This codebase is heavily commented — the
   comments record WHY (laws, measured values, past incidents). They are
   load-bearing; do not delete them casually.
2. **Pure logic goes in `lib/`, tested.** UI components stay dumb. New
   business rules get Vitest fixtures first.
3. **Respect the guard/DB laws** (§4) — ESLint and the architecture
   meta-test will catch violations, but design with them from the start:
   new API route ⇒ `withTenantRoute`; new page/action ⇒ `requireUser`;
   new admin surface ⇒ `requireAdmin`; tenant queries ⇒ `withUserDb`.
4. **Schema changes start in ERD.md**, then `lib/db/schema.ts`, then a
   migration in the correct number block, then the snapshot reconciliation
   check if the graph forked.
5. **Never store aggregates**; never render from `raw_squad_data` outside
   the review path; MVP graphic only from locked `mvp_lists.entries`.
6. **Mobile-first + no dead ends**: 375px clean, ≥44px targets, loading and
   error UI everywhere, every failure path has a manual fallback.
7. **Run the green-gate set** (§9) before committing; add tests for anything
   you touch; record any deviation in README Assumptions (the established
   convention for autonomous decisions).
8. **Commit style**: short imperative summary lines; milestone work landed
   as numbered atomic commits (`m6(9): …`, `wave1(6): …`, `P7 …`) — follow
   that pattern for ongoing campaigns.
9. **Do not fabricate** metrics, customers, or pilot data (PRODUCT.md law) —
   dashboards use honest fallbacks instead.
10. When unsure how a Next 16 API behaves, read
    `node_modules/next/dist/docs/` — your training data is probably wrong.
11. **Never discard work you did not make.** Check `git status` first; in-flight
    P8 art/template changes are normal and often uncommitted. Add changes on
    top, don't reset them away.
12. **When art changes, re-measure.** Update the pinned geometry/contrast tests
    and the measurement comments in `lib/graphics/aesthetics.ts`; follow the
    second-review checklist in `docs/MASTER-PROMPT-graphic-alignment.md`.
    Don't re-encode JPEG-in-`.png` art casually (§6.8).
13. **UI edits trigger the Impeccable hook** (`.claude/settings.local.json`);
    load `.claude/skills/impeccable/` guidance before shaping UI, and keep
    copy free of AI-slop patterns (`.claude/skills/no-ai-slop-text.md`).

## 14. Post-deploy change workflow (`main` is protected)

Production topology (full provisioning in `ScrimlyPro-Oracle-Deploy-Runbook.md`):
Oracle Cloud Always-Free A1 Ampere VM (`ubuntu@proxy-vm`, 2 OCPU / 12 GB RAM,
100 GB boot volume, **4 GB swapfile** so `next build` cannot OOM) with a
**Reserved Public IP** (an ephemeral IP breaks DNS on stop/start), repo at
`/home/ubuntu/scrimlypro`. Caddy (80/443, automatic TLS renewal) reverse-proxies
to `next start` on `127.0.0.1:3000` under systemd (`Restart=always`, `RestartSec=5`,
`NoNewPrivileges`, `PrivateTmp`, bound to localhost); Supabase Cloud hosts
Postgres + Auth. OCI ingress opens only 80/443 (22 already open); never enable
`ufw` on Oracle images (it fights the managed iptables ruleset). Node 22 is
installed system-wide via NodeSource. Live origin:
`https://scrimlypro.duckdns.org`. `deploy-scrimlypro` (symlink to
`scripts/deploy.sh`) is the only deploy path.

**Golden rule: never push directly to `main`.** Branch protection requires the
`verify` status check on the exact commit, so a direct push is rejected. The
enforcement lives in GitHub settings, not in this repo; the CI job name is
exactly `verify` (`.github/workflows/ci.yml`, Node 22, `npm ci`, 25-min
timeout, `postgres:16` service; **no deploy job**). Every change goes through a
branch + PR.

1. Start from fresh `main`: `git checkout main` → `git pull origin main` →
   `git checkout -b fix/short-name`. Do not build on a stale `landing-page`
   branch (70+ commits behind) or on top of someone else's uncommitted work.
2. Keep PRs small and single-purpose.
3. Run the green-gate set (§9) before committing. `npm test` uses local
   Postgres at `127.0.0.1:54329` — never the cloud DSN. CI seeds its own
   `postgres:16` and `.env.local` canaries, so CI still validates when the
   local DB is down. If dependencies changed, finish with
   `npx npm@10 install --package-lock-only`: npm 11 lockfiles fail CI/VM
   `npm ci` with `EUSAGE ... Missing: esbuild@0.28.2 from lock file`.
4. Stage **specific files** (`git add <files>`, never `git add .`), commit with
   a short imperative `fix:` / `feat:` / `ops:` summary, push the branch, and
   open a PR.
5. Wait for the CI job named **`verify`** to go green. If it fails, fix on the
   same branch and re-push — the PR and its check re-run automatically.
6. Merge (squash is fine), then on the VM:
   `git -C /home/ubuntu/scrimlypro status --short` (no tracked edits expected),
   then `deploy-scrimlypro`. Read `scripts/deploy.sh` for the exact behavior:
   - honors `APP_DIR` / `SERVICE` / `PORT` overrides (defaults
     `/home/ubuntu/scrimlypro`, `scrimlypro`, `3000`);
   - **stops the service first** (`sudo systemctl stop "$SERVICE"`) — `npm ci`
     replaces `node_modules` while lazy-loaded route modules may still be in
     flight; this trades ~1–3 min of honest downtime for a predictable deploy;
   - `git pull --ff-only` → `npm ci` → `npm run db:migrate` → `npm run build`
     → `npm run verify:secrets` (fail-closed) → `sudo systemctl start`;
   - polls `http://127.0.0.1:${PORT}/api/health` 30×2s (60s budget); on failure
     prints `journalctl -u "$SERVICE" -n 50 --no-pager` and exits 1. Its inline
     comment still claims `/` would 307 — stale; `/` is a public 200 landing.
7. Sanity check: `curl -s https://scrimlypro.duckdns.org/api/health` →
   `{"status":"ok","version":"0.1.0"}` (liveness only — no DB ping). For larger
   changes run `bash scripts/verify-production.sh` with
   `BASE_URL=https://scrimlypro.duckdns.org`. `BASE_URL` is **required**; `APP_ORIGIN` is
   needed for POST Origin headers and owner/attacker credentials for the
   authenticated rows (without them those rows SKIP, which is not cut-over
   evidence — cut-over §8). The script checks unauth probes, the G6 open-redirect
   battery, security headers, share-link round-trip/revoke, the 404-not-403 law,
   cookie flags, logout and health.

VM rules:

- Do not edit code on the VM. The only legitimate local file is `.env.local`
  (gitignored). If tracked files are modified **before** a deploy, discard with
  `git -C /home/ubuntu/scrimlypro reset --hard origin/main` (re-apply
  `chmod +x scripts/deploy.sh` if its mode reverted). That reset is safe only
  as pre-deploy cleanup — **not** as rollback (see below).
- `.env.local` edits need only a service restart, **except** `NEXT_PUBLIC_*`
  values (and the callback origin path), which are baked at build time →
  rebuild with `deploy-scrimlypro`.
- `TRUST_PROXY=true` on the VM is correct (Caddy overwrites `x-forwarded-for`);
  `SAMPLE_OCR=0` in production; `IMP_SECRET`/`AUDIT_SALT` generated with
  `openssl rand -hex 32`/`-hex 16`. `SUPABASE_DB_URL` should be the **session
  pooler** URI (port 5432, IPv4-reachable; transaction mode is 6543). Supabase
  Auth URL config must include the Site URL and `https://DOMAIN/**` redirect.
- Nightly cron (runbook §8): 03:10 UTC
  `BACKUP_DIR=/home/ubuntu/backups ... scripts/backup-db.mjs` (the nightly DB
  hit also prevents Supabase free-tier **7-day inactivity pause** — a paused
  project = site down until manually restored); 03:20 UTC prunes backup
  folders older than 14 days. The dump covers the **`public` schema only** —
  no `auth.users`, identities, sessions or Storage objects — so a restore
  requires re-invite/re-signup. Verify the first dump and `manifest.json`
  exist and the project stays Active; complete runbook §12's checklist
  (security headers, reboot test, 7+ days Active).
- Never run `npm run db:seed`, `db:reset`, or `db:sweep-test` against the cloud
  DSN (`db:migrate` **is** legitimate during first cut-over).
- Dependabot PRs: weekly npm (`dependencies`) + github-actions (`ci`), max 5
  open PRs; rebase onto current `main`, let CI pass, review major bumps.

**Rollback:** do **not** `git reset --hard <previous-good-sha>` then
`deploy-scrimlypro` — the script's `git pull --ff-only` immediately
fast-forwards back to the bad tip. Use the maintenance-mode / DB-restore
procedure in `docs/deploy/cut-over.md` §11 (quiesce, `pg_restore` the last good
dump, re-provision auth/Storage, roll back the platform deployment, resume
traffic, re-run the manual tests), or revert on a branch, merge, and redeploy
normally.

---

*End of onboarding prompt. Welcome aboard — build fast, measure twice, and
let the human confirm.*
