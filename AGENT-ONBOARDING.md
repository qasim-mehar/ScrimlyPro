# ScrimlyPro — Master Onboarding Prompt for AI Agents

> You are being onboarded onto **ScrimlyPro**, a production-grade Next.js SaaS.
> This document is your complete map: what the product is, how the system
> flows end-to-end, every folder and module, and the non-negotiable laws of
> the codebase. Read it fully before writing any code. When this document and
> the code disagree, **the code wins** — and PRD.md / ERD.md / PLAN.md are the
> authoritative "truth files" for product scope, data, and build order.

---

## 0. First five minutes (do these before anything else)

1. Read `AGENTS.md` (and `CLAUDE.md`, which just points at it). It warns that
   this repo runs **Next.js 16.4.3**, whose APIs/conventions differ from older
   Next you may know (e.g. `proxy.ts` replaces `middleware.ts`; the error
   boundary prop is `retry`, not only `reset`). Before writing Next-specific
   code, consult the bundled guides in `node_modules/next/dist/docs/`.
2. Read the truth files in this order: `PRD.md` (what we build), `ERD.md`
   (data model + tenancy/RLS law), `PLAN.md` (build order + history of every
   chunk/lane/milestone), `PRODUCT.md` (product positioning).
3. Skim `README.md` — it is both the run book AND a long **Assumptions log**
   recording every deviation ever made, with reasons. If you are about to do
   something unusual, check whether it was already decided there.
4. Skim `docs/reports/*.md` — one implementation report per milestone
   (M1–M6, P4–P7, wave-1 integration) with full decision records.
5. Never fabricate product claims: nothing is deployed, there are no real
   users/testimonials yet (see `PRODUCT.md` → Evidence on Hand).

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
| `docs/reports/*.md` | Per-milestone implementation reports (M1–M6, P4–P7, wave1) — decision records, deviations, gates. |
| `docs/deploy/cut-over.md` | Hosted Supabase cut-over runbook (v2, rehearsal-proven). |
| `AGENTS.md` / `CLAUDE.md` | Next.js 16 agent rules (read the bundled Next docs before coding). |
| `shots/`, `docs/reference/` | Screenshot evidence, golden images, design reference halves for the dashboards. |

---

## 3. Tech stack (locked)

- **Next.js 16.4.3** (App Router, no `src/`, alias `@/*`) + **React 19** +
  **TypeScript strict, zero `any`** + **Tailwind CSS v4**.
- **Postgres** (Supabase-compatible; `postgres.js` driver) + **Drizzle ORM**
  (`drizzle-orm/pg-core`), migrations versioned in `db/migrations/`.
- **Supabase auth** (GoTrue) via `@supabase/ssr`; **FORCE RLS** on every table.
- **`@google/genai`** for OCR — the API key exists ONLY inside
  `app/api/ocr/route.ts` (server).
- **`html-to-image`** for client-side PNG graphic export (1080×1620 exact).
- **Vitest** (~600+ checks) — pure-logic tests + DB/RLS/API integration tests
  on throwaway databases.
- Fonts: **Exo 2** (primary graphics face, weights 500–800), **Rajdhani**
  (metric fallback, always loaded), **Noto Sans Symbols 2** (symbol glyphs) —
  all via `@fontsource/*`, plus `next/font` Google fonts (Inter, Inter Tight,
  Lexend) for the landing page.
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
- `getDb()` (`lib/db/client.ts`) runs as the schema owner (bypasses RLS) and
  `lib/db/admin.ts` uses the service role (bypasses everything). **ESLint bans
  both from the request path** (`app/**`, `proxy.ts`, `components/**`). They
  are for tests, scripts, and `app/dev/**` fixture pages only.
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
- Enumeration-safe auth copy (identical messages whether an account exists).
- Tokens (`org_invites`, `share_links`) are stored **SHA-256 hashed**; the raw
  token is shown once and never lands in the DB.
- `audit_log` is append-only — RLS grants no update/delete policy to anyone.
- The user kill switch: presence of a `feature_flags` row
  `('user', <id>, 'disabled')` locks the account out of every authed surface;
  it fails closed. The **org-level** kill switch is schema-ready but
  deliberately unwired (RESERVED-until-M4; `/admin/flags` refuses it).
- Impersonation: HMAC-signed cookie (`IMP_SECRET`; **production fail-closed**
  without it) + `impersonation_sessions` ledger row (expiry/revocation checked
  server-side, never trusted from the cookie) + audit events + visible banner.
- `next.config.ts` sets security headers (nosniff, DENY framing,
  strict-origin-when-cross-origin, minimal CSP).
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
per ERD §2 — deliberately not SQL CHECKs. **Never change the schema without
updating ERD.md first.**

**Core v1 tables (migrations 0000–0003):**
- `sessions` — one scrim. `user_id` (owner/audit trail), `org_id` (tenancy,
  NOT NULL since 0012), `name`, `planned_matches`, `team_count`,
  `template_id` (aesthetic), `scoring_rules` (SUPER JSON), `status`
  (`active|completed`), `created_at`.
- `teams` — session-scoped, `UNIQUE(session_id, name)`, optional
  `logo_url` (PNG data URL, client-resized 256px).
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
- `usage_events` — append-only OCR meter, one row per `/api/ocr` invocation.
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
      anonymous + non-public PAGE → 302 /login?next=…   (API: passes through)
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
   edge JPEG q0.85 stripping EXIF, ≤4MB each, thumbnail strip with
   remove/reorder) POSTs FormData to **`/api/ocr`**.
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
   rate-limited 60/min per IP.

### 6.3 OCR pipeline internals (`lib/gemini/*`, `lib/ocr/*`, `app/api/ocr/route.ts`)

- Route guard: `withTenantRoute` + org quota probe (`lib/orgs/quotas.ts`,
   counting `usage_events`) — quota exhaustion is a typed 402/429-style
  error, never data lockout.
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
- Every invocation appends a `usage_events` row (the meter).

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
  (per-IP and per-email buckets), enumeration-safe copy, `?next=` sanitized
  via `lib/auth/next-url.ts`. `/auth/callback` exchanges the recovery/token
  URL; `/auth/error` renders typed failures.
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
- Admin guards use REAL identity — an impersonating admin is never taken to
  `/admin`; they follow the target to `/dashboard`.

### 6.8 Graphics engine (`lib/graphics/*` + `components/graphics/*`)

- Canvas is **exactly 1080×1620 (2:3)**; export is client-side via
  `exportPng` (html-to-image) after `document.fonts.ready`, output exactly
  1080×1620 PNG; container-query CSS scaling (`scale(calc(100cqw / 1080px))`)
  preserves the ratio with zero JS.
- `GraphicCanvas` (required `variant`: standings | mvp | announcement) renders
  absolutely-positioned slots over a background. **Templates = background
  image + coordinate config** — six aesthetics (`lib/graphics/aesthetics.ts`):
  three dev gradients (dark-gold, purple-butterfly, pink-blossom) and three
  art-backed (pmpl-light, neon-green, challengers-red; art in
  `public/templates/<id>/<variant>.png|jpeg`).
- `TemplateConfig` (engine v3) key ideas: per-variant `backgrounds`;
  `statColumns` (ordered value boxes); `labelsBakedIn` / `subtitleBakedIn`
  (per-variant — the art already prints the labels); `variantHeaders` +
  `headerFor()`; `singleColumn` (neon's one full-width table);
  `rowsBottom`-driven row auto-fit (`announcementRowLayout`, `columnPitch` in
  `lib/graphics/layout.ts`); P7 flags `hideScrimName`, `uniformMvpRows`,
  `watermarkYOffset`.
- The watermark `scrimlypro.com` is **hardcoded bottom-right** — brand law,
  never configurable.
- Font stack: `"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui,
  sans-serif`; data-bearing fonts weight 700 (P7).
- Geometry for art-backed templates is **measured from the art pixels** and
  pinned by tests (`tests/graphics.test.ts`, `tests/graphics-contrast.test.ts`
  pins contrast ratios). Changing art means re-measuring.
- Dev routes render all graphics from fixtures and are hard-404'd in
  production (NODE_ENV gate in every page): `/dev/graphics`, `/dev/standings`,
  `/dev/mvp`, `/dev/announcement`, `/dev/glyphs` (glyph torture fixtures —
  real OCR'd names in Arabic/CJK/katakana/symbols), `/dev/calibrate`
  (16/19/25-team calibration datasets with a pixel grid and live config
  readout), `/dev/boom` (error boundary test).

---

## 7. Folder-by-folder guide (annotated tree)

```
ScrimlyPro/
├── PRD.md / ERD.md / PLAN.md / PRODUCT.md   # truth files (what/data/order)
├── README.md               # run book + Assumptions log (READ before deviating)
├── LANES-README.md         # parallel-lane orchestration record
├── ScrimlyPro-SaaS-explainer.md
├── AGENTS.md / CLAUDE.md   # Next 16 agent rules (CLAUDE just refs AGENTS)
├── index.html              # stray design PROTOTYPE — NOT part of the Next app
├── proxy.ts                # Next 16 "middleware": token refresh + login redirect ONLY
├── next.config.ts          # security headers; no exotic flags
├── drizzle.config.ts       # drizzle-kit (schema → db/migrations)
├── vitest.config.ts        # node env, globalSetup DB sweep, maxWorkers 2
├── eslint.config.mjs       # THE architecture enforcement (see §4)
├── smoke.mjs               # manual smoke script
├── .env.example            # every env var with commentary (see §12)
│
├── app/                    # Next.js App Router — ALL routes (see §8)
│   ├── layout.tsx          # root layout: fonts (Exo2/Rajdhani/Noto + landing
│   │                       #   Google fonts as CSS vars), AccountHeader
│   ├── page.tsx            # "/": landing (Hero→Benefits→Reserve→Footer) for
│   │                       #   anonymous; role redirect for authed users
│   ├── globals.css         # Tailwind v4 + dark theme + light dash-* tokens
│   ├── error.tsx / global-error.tsx / not-found.tsx / loading.tsx
│   ├── login|signup|forgot-password|reset-password/   # auth pages (public)
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
│   └── dev/                # dev-only fixture pages (404 in production)
│
├── components/
│   ├── landing/            # Hero (+module css), BenefitsSection, CtaSection
│   │                       #   (legacy; Reserve replaced it on "/"),
│   │                       #   useReducedMotion
│   ├── reserve-section.tsx / site-footer.tsx (+module css)  # landing sections
│   ├── fonts.ts            # shared landing type scale
│   ├── auth/               # AuthForm (all credential forms), AccountHeader
│   │                       #   (the one sanctioned getSession consumer)
│   ├── forms/              # CreateSessionWizard (3-step), resize-logo
│   ├── matches/            # UploadPanel (downscale+thumbnails), ReviewForm
│   │                       #   (the mapping UI), resize-images
│   ├── session/            # SessionView (tabs), MatchesTab, StandingsTab,
│   │                       #   GraphicsTab, NudgeBanner, CompleteButton,
│   │                       #   SharePanel
│   ├── mvp/                # MvpEditor, UnlockButton
│   ├── graphics/           # GraphicCanvas, OverallStandingsGraphic, MvpGraphic,
│   │                       #   AnnouncementGraphic, *Preview wrappers,
│   │                       #   DownloadPngButton, export.ts (exportPng),
│   │                       #   dev-sandbox, dev-glyph-torture
│   ├── dashboard/          # M5 member dashboard widgets (sidebar, top-bar,
│   │                       #   stat-cards, pipeline, readiness-gauge,
│   │                       #   featured-card, attention-table, onboarding,
│   │                       #   command-palette, notifications, greeting-row,
│   │                       #   ai-card, sidebar-drawer, icons)
│   ├── admin/              # shell/ (AdminShell, SearchField,
│   │                       #   ImpersonateDialog, NotificationsBell),
│   │                       #   dashboard/ (M6 widgets), ImpersonationBanner,
│   │                       #   ImpersonationExitButton, GlobalStopButton
│   ├── orgs/               # CreateOrgForm, InviteForm, AcceptInviteForm,
│   │                       #   MemberActions, QuotaBanner, CopyField
│   └── ui/                 # (empty placeholder)
│
├── lib/                    # ALL business logic — pure, typed, tested
│   ├── db/                 # schema.ts (drizzle), client.ts (getDb, owner),
│   │                       #   user.ts (withUserDb — THE tenant path),
│   │                       #   admin.ts (service role), legacy-sqlite.ts
│   ├── supabase/           # server.ts (getAuthedUser), browser.ts
│   ├── auth/               # public-paths, next-url (sanitize ?next=),
│   │                       #   origin-guard (CSRF), rate-limit (sliding
│   │                       #   window; TRUST_PROXY law), validate (zod-free
│   │                       #   manual validation), responses (no-store JSON),
│   │                       #   route-helpers, route-guard (withTenantRoute),
│   │                       #   action-guard (requireUser for actions/pages),
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
│   ├── sessions/           # create (wizard→rows), input (validation),
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
│   ├── graphics/           # types (TemplateConfig/specs), aesthetics (6
│   │                       #   templates), layout (row auto-fit), standings/
│   │                       #   mvp/announcement (projection helpers), index
│   ├── dashboard/          # queries (org-scoped read-only), org (selection)
│   ├── fixtures/           # sampleMatches (SAMPLE_OCR), glyphNames (torture)
│   ├── audit/auth-events.ts# auth event audit writer
│   ├── http.ts             # noStore() JSON helper
│   └── utils/cn.ts         # clsx wrapper
│
├── db/
│   ├── migrations/         # committed, versioned SQL (drizzle journal + meta)
│   └── migrations-sqlite-legacy/   # pre-M1 SQLite history (reference only)
│
├── scripts/                # npm-run and one-off operational scripts (§11)
├── tests/                  # the entire Vitest suite (§11)
├── styles/admin-theme.css  # M6 admin light theme
├── public/                 # icons, hero art, machine.jpeg, templates/<id>/
│                           #   (art PNG/JPEG per aesthetic+variant)
├── docs/                   # reports/, deploy/cut-over.md, reference/
├── shots/                  # screenshot evidence + golden images
└── data/                   # (gitignored) legacy SQLite db — historical only
```

---

## 8. Route map

**Public pages** (in `PUBLIC_PAGES`): `/` (landing for anonymous; authed
users are redirected by role — real-identity platform admins → `/admin`,
everyone else → `/dashboard`; an impersonating admin follows the TARGET to
`/dashboard`), `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/auth/callback`, `/auth/error`, `/invite/[token]` (login-gated before state
change), `/share/[token]` (fully public, rate-limited).

**Member (authed)**: `/dashboard` (M5; light theme; org via `?org=`;
⌘K palette), `/orgs`, `/orgs/new`, `/orgs/[id]`, `/sessions` (layout only),
`/sessions/new`, `/sessions/[id]`, `/sessions/[id]/matches/[matchNo]`,
`/sessions/[id]/mvp`.

**Admin (platform role)**: `/admin`, `/admin/tenants`, `/admin/flags`,
`/admin/audit`, `/admin/orgs`.

**API route handlers**:
- `/api/auth/{signup,login,logout,forgot-password,reset-password}` —
  server-mediated credentials; rate-limited; enumeration-safe.
- `/api/ocr` — the Gemini ingest (withTenantRoute + org quota + meter).
- `/api/sessions/[id]/share` — mint/revoke share links.
- `/api/orgs/[id]/invites` — mint/list org invites.
- `/api/dashboard/search` — member ⌘K search (withTenantRoute).
- `/api/admin/search` — admin ⌘K search (requireAdmin, 404-law, no-store).
- `/api/admin/impersonate/{start,stop}` — impersonation lifecycle.
- `/api/admin/tenants/{enable,disable}` — kill switch.
- `/api/health` — liveness (the ONLY public API path).

**Dev-only** (NODE_ENV-gated, 404 in production): `/dev/graphics`,
`/dev/standings`, `/dev/mvp`, `/dev/announcement`, `/dev/glyphs`,
`/dev/calibrate`, `/dev/boom`.

---

## 9. Tests, scripts, and quality gates

**Test suite** (`npm test` → Vitest, node env, `tests/**/*.test.ts`; ~600+
checks). Facts that matter:
- DB-backed tests build throwaway `m*test_*` databases on the Postgres at
  `SUPABASE_DB_URL` (per-file creation + cleanup in `tests/helpers/pg.ts`);
  a globalSetup worker-owned teardown sweeps leftovers. `maxWorkers: 2` and
  `hookTimeout: 180s` are reliability levers (parallel DROP contention) —
  do not "optimize" them away.
- Suite layout mirrors the architecture: root files (scoring, matching, mvp,
  gemini, ocr-form/ingest, session-create/input/page/quota, matches-mapping/
  confirm, standings-graphic, graphics + graphics-contrast + graphics-ssr +
  glyph-fixtures, mvp-lock/announcement, rate-limit, auth-* (public paths,
  next-url, origin-guard, action-guard), enumeration-copy, db, sqlite, cn);
  `tests/api/*` (auth-matrix, admin-guard/search/audit-events,
  impersonation(+dialog), kill-switch, ocr-guard/quota, org-guard-fold,
  org-invites, role-landing, dashboard-queries); `tests/rls/*`
  (tenant-isolation, org-isolation, admin-tables); `tests/orgs/*`, `tests/
  share/*`, `tests/dashboard/*`; `tests/architecture/guards.test.ts` (the
  route-guard meta-test); `tests/security/secrets-scan.test.ts`.

**Green-gate set** (what "done" means here — run before every commit):
```bash
npm run typecheck     # tsc --noEmit (zero any)
npm run lint          # eslint — the architecture laws live here
npm run build         # next build
npm test              # full suite
npm run verify:secrets   # after build: no secrets in the client bundle
```
Security-relevant work additionally: `npx vitest run tests/rls` and
`BASE_URL=http://127.0.0.1:<port> bash scripts/verify-auth-matrix.sh`.

**DB scripts** (all operate on `SUPABASE_DB_URL`):
`db:generate` (drizzle-kit → SQL migrations; committed) · `db:migrate` (apply
committed migrations) · `db:reset` (drop/recreate public + reseed; idempotent)
· `db:seed` (deterministic demo session: 6 matches, 16 Pakistani team names,
SUPER rules, matches 1–2 confirmed; 66 roster rows) · `db:sweep-test` ·
`db:backup` / `db:restore-test` (restore into a throwaway DB, count rows,
refuse corrupt backups) · `scripts/golden-check.ts` (legacy-migration parity)
· `scripts/migrate-local-to-supabase.mjs` (dry-run / `--apply`).

**Ops/verification**: `scripts/verify-production.sh`,
`scripts/verify-auth-matrix.sh`, `scripts/check-secrets-in-bundle.mjs`,
`scripts/acceptance/*` (CDP-driven golden-path walk, 375px sweep, debug
helpers), `scripts/m5-dev-*` (dashboard seed/demo/user).

**Migration numbering law** (from lane orchestration): blocks were assigned
per lane — 0010–0014 (orgs), 0020 (admin); 0030–0039 RESERVED and UNUSED.
`drizzle-kit generate` output must be renamed into your block before
committing, and the journal is the source of truth. After adding migrations
to a forked snapshot graph, follow the reconciliation procedure in
LANES-README.md (mint a fresh full-schema snapshot, splice it in, re-run
generate — the diff must be empty).

---

## 10. Environment variables (`.env.example` is canonical)

| Var | Scope | Meaning |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase project URL + anon key. |
| `SUPABASE_DB_URL` | server | Postgres connection (Drizzle + migrations). Required for anything beyond static pages. |
| `SUPABASE_SERVICE_ROLE_KEY` | server, scripts only | Bypasses RLS. NEVER client-imported; only `lib/db/admin.ts` + one-off scripts. |
| `GEMINI_API_KEY` | server, `/api/ocr` only | OCR key. |
| `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACKS` | server | Default `gemini-3.1-flash-lite` + 404 fallback chain. |
| `SAMPLE_OCR` | server | `1` = fixture mode (matches 1–3) without a key. |
| `APP_ORIGIN` | server | Public origin for recovery links; **production fails closed** without it. |
| `IMP_SECRET` | server | 32-byte hex HMAC key for impersonation cookies; **production fails closed**. |
| `AUDIT_SALT` | server | sha256(ip + salt) for audit `ip_hash`; missing ⇒ rows carry no hash. |
| `TRUST_PROXY` | server | Distrust-by-default; set `true` ONLY behind a proxy that overwrites `x-forwarded-for` (full matrix in README). |

---

## 11. Local development on this machine (practicalities & gotchas)

- `npm install` → `npm run dev`. The README documents `http://localhost:3000`,
  but **check which port is free before starting** — on this dev box the
  project has been served on other ports (recently 3311; port 3000 has been
  occupied by a different project), and lane work historically used 30xx
  ports. Next 16 refuses a second dev server in the same directory.
- The README's "local Postgres cluster" section describes the ORIGINAL
  Windows dev box (`C:\Users\mianq\...`, port 54329). The current machine is
  Linux — use any Postgres 14+ reachable via `SUPABASE_DB_URL`; migration
  `0002` creates the `auth` schema stand-in automatically when GoTrue is
  absent. With Docker, `supabase start` is the canonical path.
- Node: README targets Node 22 LTS; work has also run on Node 25 with the
  documented `npm install --ignore-scripts` workaround for better-sqlite3
  (no VS Build Tools on the old box). On Linux the native build usually
  just works.
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
- Hydration warnings tied to dev origins were handled via Next's
  `allowedDevOrigins` — if you see cross-origin dev warnings, that's the
  knob.

---

## 12. Current branch state & history map (as of 2026-10-26)

- Current branch: **`landing-page`** — the marketing landing work, and it
  has merged `origin/main`, so it contains EVERYTHING below. The local `main`
  ref is stale (it sits at the P7 commits); `origin/main` is the real trunk.
  `public/machine.jpeg` is currently untracked landing art.
- Build history you will see referenced in code comments and reports:
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
- Deliberately NOT built / parking lot (do not start without instruction):
  payments/entitlements, email delivery of invites, per-match graphics
  (data already supports it), custom template upload, org-level kill-switch
  wiring, Redis-backed limiters, Storage-bucket logos (still data URLs),
  share-link OG tags, Next 17 upgrade.

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

*End of onboarding prompt. Welcome aboard — build fast, measure twice, and
let the human confirm.*
