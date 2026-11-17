# ScrimlyPro — Complete Project Context for an Incoming LLM

> **Purpose of this file.** This is a self-contained handoff. Read it top to
> bottom before touching any code. It tells you what the product is, exactly
> where the repo stands *right now*, how the system is put together, how every
> end-to-end flow works, and which rules are non-negotiable.
>
> **Authority order when documents disagree:** the **code wins**, then
> `PRD.md` (what to build), `ERD.md` (data model), `PLAN.md` (build order),
> `README.md` (run book + assumptions log), then this file. This file is a
> snapshot and will drift; the truth files and code will not.
>
> **Verified snapshot:** 2026-11-16, branch `main`, local tip `6f4d475`
> (2026-11-16, "chore(config): pin turbopack root and untrack dev-auth.log")
> on top of `88a9daa` (2026-11-06, slots + login UX + dashboard
> refinements). This file is committed immediately after as a docs-only
> commit. Working tree is **dirty** with only the WIP art drop — see §13.
>
> **Known truth-file drift (read this before trusting a doc literally):**
> `PRD.md` is the v1-CORE spec — its "Out (deferred)" list still names auth,
> accounts, dashboard and share links (all built since M1/Wave 1), and its §10
> stack line still says SQLite. `ERD.md` §6/§7 are the as-built Postgres +
> tenancy record. `PRODUCT.md` still says "three dev-gradient aesthetics ship
> now"; seven aesthetics ship today. The code remains the final authority.

---

## 0. Boot prompt (copy-paste this into a fresh session)

```text
You are working on ScrimlyPro, a production-grade Next.js 16 SaaS that turns
PUBG Mobile scrim screenshots into standings and MVP graphics. Before doing
anything:

1. Read PROJECT-CONTEXT.md (this file) fully.
2. Read AGENTS.md — this is Next.js 16.4.3, not the Next.js in your training
   data. Read node_modules/next/dist/docs/ before writing Next-specific code.
3. Read the truth files in order: PRD.md, ERD.md, PLAN.md, then skim
   README.md (run book + Assumptions log).
4. Note the working tree is dirty with small WIP drift (see
   PROJECT-CONTEXT.md §13). Do not revert or "clean up" uncommitted work
   without being asked.
5. Never invent product claims, metrics, users, or testimonials. Nothing is
   deployed yet.

Non-negotiable laws: identity only via supabase.auth.getUser() /
getEffectiveUser; tenant DB access only via withUserDb; getDb()/admin client
are banned from request paths and ESLint-enforced; every authed surface is
independently guarded; no aggregate columns; standings derive from confirmed
match_results; MVP graphic only from locked mvp_lists.entries; the machine
suggests, the human confirms every mapping; validate before trust.

Run the green gates before committing: npm run typecheck, npm run lint,
npm run build, npm test, npm run verify:secrets (after build).
```

---

## 1. What ScrimlyPro is

**One sentence:** ScrimlyPro turns PUBG Mobile scrim results into
ready-to-post graphics, replacing 30–60 minutes of Canva/Photoshop work with a
~90-second loop on a phone.

**The user:** a solo scrim organizer in Pakistan, working from a phone
immediately after each match. Speed is the product. Anything that adds taps,
dead-ends, or waiting is a regression.

**The core loop (cumulative model):**

1. **Create a session** — name, 1–6 planned matches, 4–25 teams (bulk-pasted
   names), optional per-team logos, pick a graphic aesthetic. A session
   announcement graphic is available immediately.
2. **Add match N** — upload 1–14 end-of-match screenshots (multi-scroll,
   overlapping). The client downscales them; **one Gemini OCR call** extracts
   every squad: placement, players, per-player kills.
3. **Review & map** — squads are shown sorted by placement. The engine
   *suggests* squad→team mappings learned from earlier matches, but **a human
   confirms every mapping, every match**. This is the core doctrine:
   *the machine suggests, the human confirms.*
4. **Confirm** — points are stored, and a cumulative **"OVERALL STANDINGS —
   AFTER MATCH N"** graphic (exactly 1080×1620 PNG) is generated client-side
   and downloadable.
5. Repeat per match. At session end: **"FINAL RESULTS"** standings graphic and
   a **Top-5 MVP** graphic (per-player kills across matches, fuzzy-merged,
   edited and then locked by the organizer).
6. **Share** — mint a public token link so the standings can be posted without
   an account.

**Around the core loop** the app has grown a full SaaS shell: email/password
auth (Supabase GoTrue), multi-tenant organizations with roles/invites/quotas,
hashed share links, a member dashboard, a super-admin panel (audit log, kill
switch, impersonation, feature flags), OCR usage metering, and a marketing
landing page at `/`.

### Current product reality (do not overstate)

- The implementation is substantial and works locally.
- **Nothing is deployed.** There are no real users, customers, testimonials, or
  pilot numbers.
- The next major milestone is the hosted Supabase cut-over
  (`docs/deploy/cut-over.md`). A hosted-env attempt failed on a project ref
  that does not resolve; `.env.local` has since been restored to the local
  Postgres + dev-auth stack (the dead hosted config is preserved in
  `.env.local.hosted-dead.bak`), and no deployment is live (see §14).
- Dashboards that lack a real data source use explicit honest fallbacks — never
  invented numbers (`PRODUCT.md` law).

---

## 2. Where we stand right now (verified 2026-11-16)

| Item | State |
|---|---|
| Branch | `main`, ahead of `origin/main` (`88a9daa`) — not pushed |
| Tip | P8(1) / P8(2) graphics template wiring |
| Working tree | Untracked design exports only (`Max_a_*.png` + challengers reference image) — ewc-yellow and challengers-red templates fully wired and tested |
| Runtime | Node `v25.6.1`, npm `11.9.0` |
| Next.js | `16.4.3` (App Router, no `src/`, alias `@/*`) |
| Database | ✅ Local Postgres 17.6 **running** at `127.0.0.1:54329`, db `scrimlypro_main`, live backends healthy (restored 2026-11-16 — see §14) |
| Latest migration | `0021_teams-slot-number.sql` — **applied and verified locally** 2026-11-16 (`column slot_number integer NULL`, partial unique index `teams_session_slot_uq`, journal entry id 11) |
| Typecheck | ✅ `npm run typecheck` passes, 0 errors (re-run 2026-11-17) |
| Lint | ✅ `npm run lint` passes with 0 errors, 98 warnings (re-run 2026-11-17; pre-existing) |
| Build | ✅ `npm run build` passes (Next 16.4.3 Turbopack, re-run 2026-11-17) |
| Bundle secrets | ✅ `npm run verify:secrets` — no secret material in build output (re-run 2026-11-17) |
| Full suite | ✅ `npm test` — **59 files / 722 tests passed** in 334s (DB-backed, re-run 2026-11-17 against local Postgres 17.6; exit 0) |

### The four WIP themes landed in `88a9daa` (2026-11-06)

They are committed and pushed to `origin/main`; this file's older snapshot
described them as uncommitted. Full detail in §13.

1. **Team room slot numbers** — end-to-end feature (`teams.slot_number`,
   migration `0021`).
2. **Login error UX** — actionable provider errors, 429 lockout, `/login`
   no longer stuck on skeleton.
3. **Local dev auth stub** — `scripts/dev-auth-server.mjs` + `npm run dev:auth`.
4. **Responsive/mobile polish** — dashboard top bar, command palette,
   notifications, admin shell/search, impersonation dialog, attention tables.

The current uncommitted drift is different and much smaller — see §13.2.

---

## 3. How we are approaching the build

The project is built in small, atomic, test-backed chunks. That discipline is
why a large surface exists without an uncontrolled architecture.

- **Chunk history:** v1-core C1.1→C7.1 (scaffold, data, pure domain logic,
  graphics, session UI, match loop, finale, hardening) → M1 (Postgres/GoTrue/
  RLS port) → Wave 1 lanes (M2 orgs, M3 admin, deps, ops) → P4–P7 (graphics
  template engine v3 + font swap) → M5 (member dashboard) → M6 (super-admin
  dashboard) → landing page → `88a9daa` (team slots, login error UX, dev auth
  stub, responsive polish).
- **Rule:** pure business logic lives in `/lib` as typed, tested functions. UI
  components are dumb. If a component contains a scoring/matching rule, it is a
  bug.
- **Rule:** every chunk ends green (`typecheck`, `lint`, `build`, `test`) and
  commits atomically. Commit messages follow the campaign pattern
  (`m6(9): …`, `wave1(6): …`, `P7 …`).
- **Rule:** schema changes start in `ERD.md`, then `lib/db/schema.ts`, then a
  migration in the correct number block, then snapshot reconciliation if the
  migration graph forked.
- **Rule:** deviations are recorded in `README.md` → Assumptions, with reasons.
  Check there before "fixing" something unusual — it may be deliberate.
- **Migration numbering:** 0010–0014 = orgs, 0020 = admin, 0021 = team slots
  (committed in `88a9daa`). 0030–0039 are RESERVED and unused. The drizzle
  journal is the source of truth.
- **Do not start** parking-lot work without instruction: payments/
  entitlements, email delivery of invites, per-match graphics, custom template
  upload, org-level kill-switch wiring, Redis-backed limiters, Storage-bucket
  logos, share-link OG tags, Next 17 upgrade.

---

## 4. Tech stack

- **Next.js 16.4.3** — App Router, `proxy.ts` (not `middleware.ts`), error
  boundary prop is `retry` in addition to `reset`. Read
  `node_modules/next/dist/docs/` before writing Next-specific code.
- **React 19.2.8**, **TypeScript strict, zero `any`**, **Tailwind CSS v4**.
- **Postgres** via `postgres.js` + **Drizzle ORM** (`drizzle-orm/pg-core`).
  Migrations are committed SQL in `db/migrations/`.
- **Supabase auth (GoTrue)** via `@supabase/ssr`. **FORCE RLS** on every table.
- **`@google/genai`** for OCR. The API key exists only inside
  `app/api/ocr/route.ts` (server).
- **`html-to-image`** for client-side PNG export at exactly 1080×1620.
- **Vitest** for the full suite (pure logic + DB/RLS/API integration on
  throwaway databases).
- **Fonts:** Exo 2 (primary graphics face), Rajdhani (metric fallback, always
  loaded), Noto Sans Symbols 2 (symbol glyphs) via `@fontsource/*`; Inter,
  Inter Tight, Lexend via `next/font` for the landing page.
- **`better-sqlite3`** survives only as a devDependency for legacy SQLite
  migration tooling. The runtime database is Postgres, full stop.

---

## 5. Architecture laws (enforced, not suggestions)

These are enforced by ESLint rules and a meta-test. Violating them is a build
failure.

### 5.1 Identity law

- Identity comes **only** from `supabase.auth.getUser()` —
  `getAuthedUser()` in `lib/supabase/server.ts`. `getSession()` is a
  non-authoritative browser hint; ESLint bans it except in
  `components/auth/AccountHeader.tsx` (the one sanctioned UI consumer).
- `getEffectiveUser()` (`lib/admin/impersonation.ts`) returns the impersonation
  **target** when a valid signed cookie backed by a live `impersonation_sessions`
  row exists; otherwise the real verified user.
  - **Tenant guards** run on effective identity.
  - **Admin guards** run on **real** identity.
- All credential operations (signup/login/logout/forgot/reset) are
  server-mediated through `/api/auth/*`. The browser never talks to GoTrue
  directly.

### 5.2 DB access law ("belt and suspenders")

- `withUserDb(claims, fn)` (`lib/db/user.ts`) is the **only** way tenant request
  paths query the DB. It opens a transaction, sets `role=authenticated` and
  `request.jwt.claims` from the server-verified `sub`, so Postgres FORCE RLS is
  the guaranteed backstop.
- The belt is explicit ownership predicates in the query layer
  (`assertSessionOwner` → 404 for foreign resources) plus org membership
  predicates (`orgMemberPredicate`).
- `getDb()` (`lib/db/client.ts`) runs as schema owner and bypasses RLS;
  `lib/db/admin.ts` uses the service role and bypasses everything. **ESLint bans
  both from request paths** (`app/**`, `proxy.ts`, `components/**`). They are for
  tests, scripts, and `app/dev/**` fixtures only.
- `lib/admin/admin-db.ts` is the single guarded re-export of the service-role
  client. It is importable only from `app/admin/**` + `app/api/admin/**` server
  files and `lib/admin` internals.
- `lib/admin/**` may not be imported outside the admin panel except the two
  sanctioned guard choke points: `lib/auth/route-guard.ts`,
  `lib/auth/action-guard.ts`.
- Sanctioned exception: `lib/share/public-reader.ts` uses the admin client for a
  single token-hash lookup with a deliberate column projection — anonymous
  visitors have no RLS identity.

### 5.3 Guard law (every authed surface re-checks, independently)

- `proxy.ts` is a **convenience layer only**: it refreshes tokens and redirects
  unauthenticated PAGE requests to `/login?next=<sanitized>`. It **never
  authorizes**. If Supabase env is missing it fails closed. `/api/*` routes are
  matched but must enforce their own guard (401 JSON).
- **API routes:** wrap handlers in `withTenantRoute<P>()`
  (`lib/auth/route-guard.ts`). Pipeline:
  1. same-origin check for state-changing methods (CSRF),
  2. verified effective identity (401, no detail),
  3. kill-switch probe (403),
  4. per-user sliding-window rate limit (120/min, 429),
  5. handler.
  Handlers receive `{ user, params }` (params awaited from Next 16 route
  context) and must return no-store responses.
- **Server actions / pages:** `requireUser()` from
  `lib/auth/action-guard.ts` (same semantics; redirects).
- **Admin surfaces:** `requireAdmin()` (`lib/admin/require-admin.ts`) — real
  identity, platform role from `profiles.role`.
- **Public surface** is enumerated in exactly one place:
  `lib/auth/public-paths.ts`.
  - `PUBLIC_PAGES`: `/`, `/login`, `/signup`, `/forgot-password`,
    `/reset-password`, `/auth/callback`, `/auth/error`, `/invite`, `/share`
    (the last two match by prefix, covering `/invite/[token]` and
    `/share/[token]`).
  - `PUBLIC_API_PATHS`: `/api/health` only (exact match).
- `tests/architecture/guards.test.ts` is a meta-test that fails if a new authed
  route/page ships without its guard.

### 5.4 Data iron rules (ERD §5)

- **No aggregate columns anywhere.** Standings, WWCD counts, and MVP totals are
  always derived from `match_results` (confirmed matches only). Fixing or
  deleting a match is therefore always safe.
- `mvp_lists.entries` is written once on Lock and is the **only** source for the
  MVP graphic afterward.
- **Unlock a match:** delete its `match_results` → set `status='draft'` → rebuild
  rosters from remaining confirmed matches — in **one transaction, in that
  order**.
- **Re-confirm a draft:** replace its results idempotently, also in one
  transaction.
- `rosters` is invisible plumbing for suggestions — never rendered in any UI.
- Business logic (scoring, matching, MVP, validation, standings) lives in `/lib`
  as pure typed functions with Vitest tests. UI components never contain
  business logic.

### 5.5 Security posture (do not regress)

- Rate limiting: sliding-window limiters keyed by IP and/or verified email
  (`lib/auth/rate-limit.ts`). `TRUST_PROXY` is **distrust-by-default**; see
  README's deployment matrix.
- Enumeration-safe auth copy: identical messages whether an account exists.
  (Login errors are the deliberate exception — see §13.1.)
- Tokens (`org_invites`, `share_links`) are stored **SHA-256 hashed**. The raw
  token is shown once and never lands in the DB.
- `audit_log` is append-only — RLS grants no update/delete policy to anyone.
- **User kill switch:** a `feature_flags` row `('user', <id>, 'disabled')` locks
  the account out of every authed surface; fails closed. The org-level switch is
  schema-ready but deliberately unwired — no request path probes an
  org-subject `disabled` flag. The generic `/admin/flags` editor refuses ANY
  `disabled` row; the Tenants console is the single audited disable path.
- **Impersonation:** HMAC-signed cookie (`IMP_SECRET`; production fails closed
  without it) + `impersonation_sessions` ledger row (expiry/revocation checked
  server-side, never trusted from the cookie) + audit events + visible banner.
- `next.config.ts` sets security headers (nosniff, DENY framing,
  strict-origin-when-cross-origin, minimal CSP).
- `scripts/check-secrets-in-bundle.mjs` (`npm run verify:secrets`) scans the
  built bundle. Run it after builds.

### 5.6 Robustness doctrine (PRD §8 — every change must honor)

- **R1** validate before trust (OCR never writes results directly).
- **R2** human confirms every mapping.
- **R3** aggregates are never stored.
- **R4** confirm is atomic and idempotent.
- **R5** unlock/edit is always available.
- **R6** drafts persist (no repeat OCR cost).
- **R7** deterministic tie-breakers.
- **R8** every failure path has a manual fallback (never a dead end).
- **R9** mobile-first (≥44px targets, zero horizontal overflow at 375px,
  loading/error UI for every async state).
- **R10** one Gemini call per match; client downscales before upload.

---

## 6. Codebase map

```text
ScrimlyPro/
├── PRD.md / ERD.md / PLAN.md / PRODUCT.md   # truth files
├── README.md               # run book + Assumptions log (read before deviating)
├── AGENT-ONBOARDING.md     # long-form onboarding (older than this file)
├── PROJECT-CONTEXT.md      # ← this file
├── LANES-README.md         # parallel-lane orchestration record
├── ScrimlyPro-SaaS-explainer.md
├── AGENTS.md / CLAUDE.md   # Next.js 16 agent rules
├── proxy.ts                # Next 16 "middleware": token refresh + login redirect only
├── next.config.ts          # security headers
├── drizzle.config.ts       # schema → db/migrations
├── vitest.config.ts        # node env, global DB sweep, maxWorkers 2
├── eslint.config.mjs       # architecture enforcement lives here
│
├── app/                    # Next.js App Router — all routes
│   ├── layout.tsx          # fonts + AccountHeader
│   ├── page.tsx            # "/" landing for anonymous; role redirect for authed
│   ├── globals.css         # Tailwind v4 + dark theme + light dash-* tokens
│   ├── login|signup|forgot-password|reset-password/
│   ├── auth/callback/route.ts + auth/error/
│   ├── dashboard/          # member dashboard (M5)
│   ├── orgs/               # org list/new/[id] + actions
│   ├── invite/[token]/     # invite acceptance
│   ├── share/[token]/      # PUBLIC share page (no auth)
│   ├── sessions/           # list, new/ (wizard + actions),
│   │   └── [id]/           # session page, matches/[matchNo]/, mvp/
│   ├── admin/              # super-admin dashboard + tenants|flags|audit|orgs
│   ├── api/                # route handlers
│   └── dev/                # dev-only fixture pages (404 in production)
│
├── components/
│   ├── app/                # shared app shell bits (AccountMenu, icons, ui)
│   ├── landing/ + reserve-section.tsx + site-footer.tsx
│   ├── auth/               # AuthForm, AccountHeader, login-panel, AuthShell
│   ├── forms/              # CreateSessionWizard, resize-logo
│   ├── matches/            # UploadPanel, ReviewForm, resize-images
│   ├── session/            # SessionView, Matches/Standings/Graphics tabs,
│   │                       #   NudgeBanner, CompleteButton, SharePanel
│   ├── mvp/                # MvpEditor, UnlockButton
│   ├── graphics/           # GraphicCanvas, standings/MVP/announcement,
│   │                       #   previews, AestheticChips, export.ts
│   ├── dashboard/          # M5 widgets (sidebar, top-bar, palette, notifications…)
│   ├── admin/              # shell, dashboard widgets, impersonation UI
│   ├── orgs/               # org + invite + quota forms
│   └── ui/                 # placeholder
│
├── lib/                    # ALL business logic — pure, typed, tested
│   ├── db/                 # schema, client (owner), user (withUserDb), admin, legacy-sqlite
│   ├── supabase/           # server (getAuthedUser), browser
│   ├── auth/               # public-paths, next-url, origin-guard, rate-limit,
│   │                       #   validate, responses, route-helpers, route-guard,
│   │                       #   action-guard, platform-role
│   ├── admin/              # require-admin, admin-db, queries, dashboard-queries,
│   │                       #   audit, impersonation, kill-switch
│   ├── orgs/               # orgs, roles, invites, tokens, quotas, origin
│   ├── share/              # links, public-reader, rate-limit
│   ├── sessions/           # create, input, queries, lifecycle, slots, samples
│   ├── matches/            # mapping, confirm, index (sanitizeSquads)
│   ├── ocr/                # form, ingest, index
│   ├── gemini/             # client, parse, validate, index
│   ├── scoring/            # rules, standings, index
│   ├── matching/           # normalize, suggest, index (learn/rebuild rosters)
│   ├── mvp/                # aggregate, lock, lifecycle, index
│   ├── graphics/           # types, aesthetics, layout, standings/mvp/announcement
│   ├── dashboard/          # queries, org selection
│   ├── fixtures/           # sampleMatches, glyphNames
│   ├── audit/auth-events.ts
│   ├── http.ts             # noStore() JSON helper
│   └── utils/cn.ts
│
├── db/migrations/          # committed versioned SQL + drizzle journal/meta
├── scripts/                # operational + verification scripts
├── tests/                  # full Vitest suite (57 test files)
├── styles/admin-theme.css
├── public/                 # icons, art, templates/<aesthetic>/<variant>.png|jpeg
├── docs/                   # reports/, deploy/cut-over.md, reference/
├── shots/                  # screenshot evidence + golden images
└── data/                   # (gitignored) legacy SQLite db — historical only
```

---

## 7. Data model (`lib/db/schema.ts`)

App-generated UUIDs (`crypto.randomUUID`, TEXT PKs); timestamps `timestamptz`
handled as ISO strings; JSON as `jsonb` typed with `$type<>`. Range constraints
(planned_matches 1–6, team_count 4–25, match_no 1..planned, placement
1..team_count, squad 1–4 players) are enforced in the app layer per ERD §2 —
deliberately not SQL CHECKs. **Never change the schema without updating
`ERD.md` first.**

### Core tables (migrations 0000–0003)

- **`sessions`** — one scrim. `user_id` (owner/audit trail), `org_id` (tenancy,
  NOT NULL since 0012), `name`, `planned_matches`, `team_count`, `template_id`
  (aesthetic), `scoring_rules` (SUPER JSON), `status` (`active|completed`),
  `created_at`.
- **`teams`** — session-scoped, `UNIQUE(session_id, name)`, optional
  `logo_url` (PNG data URL, client-resized 256px), optional `slot_number`
  (1–99, unique per session when non-NULL; NULL falls back to row order in the
  announcement graphic).
- **`rosters`** — PK `(team_id, player_norm)`; learned player names per team
  (normalized form + first-seen display spelling). Suggestion fuel only.
- **`matches`** — `UNIQUE(session_id, match_no)`; `status` (`draft|confirmed`);
  `raw_squad_data` jsonb = persisted OCR draft (reopening a draft loads it — no
  second Gemini call); `confirmed_at`.
- **`match_results`** — one row per team per confirmed match: `placement`,
  `kills` (team total), `placement_points`, `players` jsonb
  (`[{name,kills}]` raw OCR spellings). **The single source of all standings.**
- **`mvp_lists`** — PK `session_id`; `entries` jsonb
  (`[{rank,name,teamId,kills}]`), `locked` boolean, `locked_at`.

### Org tables (migrations 0010–0014)

- **`organizations`** — `name`, unique `u-<8hex>` slug, `created_by`.
- **`org_members`** — PK `(org_id, user_id)`, role `owner|admin|member`; role
  transitions RLS-enforced (owner-grant and owner-row mutation require
  actor-owner).
- **`org_invites`** — role bounded `admin|member`, SHA-256 `token_hash` unique,
  expiry, accepted-at. Raw token never stored.
- **`org_quotas`** — platform-owned (members SELECT-only; minted by a bootstrap
  trigger): `max_sessions` (100), `monthly_ocr_calls` (300). Raising a limit is
  a platform-side SQL operation.
- **`share_links`** — per session, hashed token, creator, expiry/revocation.
- **`usage_events`** — append-only OCR meter, one row per `/api/ocr`
  invocation. Quota math: the LIMIT is the org's `monthly_ocr_calls`; the COUNT
  is the **user's** month-total across ALL orgs (creating extra orgs does not
  mint extra quota).

### Admin tables (migration 0020)

- **`audit_log`** — append-only security log (`actor_user_id`,
  `effective_user_id`, `action`, target, `metadata`, `ip_hash` =
  sha256(ip + AUDIT_SALT); raw IPs never stored).
- **`feature_flags`** — `UNIQUE(subject_type, subject_id, flag)`; subjects
  `user|org|global`; the `disabled` flag on a user is the kill switch.
- **`impersonation_sessions`** — support impersonation ledger (admin, target,
  `target_email` snapshot, reason, expiry, revocation).

There is also a **`profiles`** table (SQL migrations, not Drizzle):
`id` = `auth.users.id`, `role` default `'user'` (`'admin'` = platform
super-admin), insert trigger on `auth.users`. Migration `0002` conditionally
creates an `auth` schema stand-in (`auth.users`, `uid()`, `jwt()`) for local
Postgres without GoTrue; all blocks no-op on hosted Supabase.

**RLS:** enabled + FORCE on every table; ~27 core policies plus the org/admin
sets — all `to authenticated`, with USING + WITH CHECK pairing; child tables
walk up to `sessions.user_id`/`org_id` via `public.org_role()`.

### Team slot numbers (committed)

`teams.slot_number` integer + partial unique index
`teams_session_slot_uq (session_id, slot_number) WHERE slot_number IS NOT NULL`.
Applied by `db/migrations/0021_teams-slot-number.sql` (journal idx 10,
committed in `88a9daa`); run `npm run db:migrate` against a reachable database
to apply it locally.

---

## 8. End-to-end flows

### 8.1 Request lifecycle

```text
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

### 8.2 Core product loop

1. **`/sessions/new`** — `CreateSessionWizard` (3 steps: basics → teams bulk
   paste + optional logos → confirmation summary with the read-only scoring
   table). Submit → `app/sessions/new/actions.ts` → `lib/sessions/create.ts`
   (validation in `lib/sessions/input.ts`) inserts session + teams (org quota
   checked), redirects to `/sessions/[id]`. The announcement graphic is
   available immediately.
2. **`/sessions/[id]`** — server component; data via `lib/sessions/queries.ts`
   (`getSessionPageData`, `nextMatchNumber`). `SessionView` tabs: **Matches**
   (default), **Standings**, **Graphics**. Standings are computed server-side
   (`computeStandings` + `withRanks`); `raw_squad_data` is never selected here.
   `NudgeBanner` nudges the next action (confirm pending / finalize / lock MVP).
3. **Add Match N** → `/sessions/[id]/matches/[matchNo]` — `UploadPanel`
   (multi-select 1–14 images, client downscale ≤1600px longest edge JPEG q0.85
   stripping EXIF, ≤4MB each, thumbnail strip with remove/reorder) POSTs
   FormData to **`/api/ocr`**.
4. **`/api/ocr`** (the only Gemini consumer) → see §8.3. On success the match
   row is upserted `status='draft'` with `raw_squad_data` persisted.
5. **Review form** (`ReviewForm`) — rows = squads sorted by placement; editable
   placement/kills/expandable players; team dropdown per row (already-chosen
   teams filtered out); suggestion tiers: strong ≥0.6 (preselected), weak
   0.3–0.6 (preselected + yellow), none (empty + red, pinned top); "Accept all
   suggestions"; low-confidence cell highlights; `MISSING_SQUADS` banner +
   manual add-row; `LOBBY_KILLS_HIGH` derived warning banner (never blocks).
   Confirm is disabled until every squad maps to a distinct team.
6. **Confirm** → `app/sessions/[id]/matches/[matchNo]/actions.ts` →
   `lib/matches/confirm.ts`: one transaction — replace `match_results`
   idempotently, upsert learned rosters (`learnRosterDelta`), flip to
   confirmed. Cumulative standings + the "AFTER MATCH N" graphic update.
7. **Unlock** a confirmed match → `lib/sessions/lifecycle.ts` `unlockMatch`:
   delete results → back to draft → rebuild rosters from remaining confirmed
   matches. Everything recomputes (R3/R5).
8. **Session end** — "Mark complete" (`CompleteButton`, warns if confirmed <
   planned; re-openable) → standings subtitle becomes "FINAL RESULTS"; **MVP
   editor** at `/sessions/[id]/mvp`: draft from `lib/mvp/aggregate.ts`
   (within-team fuzzy merge), full editor (rename/adjust/add/remove/reorder/
   merge/variants expander) → **Lock** (`lib/mvp/lock.ts`, re-validates
   server-side; client gating is never trusted) writes `mvp_lists` → MVP
   graphic renders only from locked entries. Unlock retains entries (the
   organizer's manual work is preserved).
9. **Share** — `SharePanel` mints a `share_links` token (raw shown once); the
   public **`/share/[token]`** page renders only the public standings projection
   (`lib/share/public-reader.ts`), no auth, no tenant data, rate-limited 60/min
   per IP.

### 8.3 OCR pipeline (`lib/gemini/*`, `lib/ocr/*`, `app/api/ocr/route.ts`)

- Route guard: `withTenantRoute` + org quota probe (`lib/orgs/quotas.ts`,
  counting `usage_events`) — quota exhaustion is a typed 402/429-style error,
  never data lockout.
- Fixture mode: `SAMPLE_OCR=1` and no key → deterministic fixtures for matches
  1–3 (`lib/fixtures/sampleMatches.ts`); also gated per-request.
- `generateSquads(images, teamCount)` (`lib/gemini/client.ts`): **ONE** call
  with all images; model from `GEMINI_MODEL` (default
  `gemini-3.1-flash-lite`) with a **404-fallback chain**
  (`GEMINI_MODEL_FALLBACKS`); 60s timeout via SDK `httpOptions`;
  `responseMimeType: application/json` + strict responseSchema. The prompt
  orders character-for-character name copying and never inventing squads.
- `validateSquads` (`lib/gemini/validate.ts`):
  - **V1** squad count == team_count (`MISSING_SQUADS`);
  - **V2** placements exactly 1..N unique (`BAD_PLACEMENTS`);
  - **V3** squad size 1–4 / name 1–30 chars / kills 0–20 (`BAD_KILLS`);
  - **V4** lobby kills > 99 → soft warning `LOBBY_KILLS_HIGH` (never fails,
    never retries).
  Failures V1–V3 trigger exactly ONE corrective retry (appends the failure
  reason to the prompt); `PARSE_FAILED` and other Gemini errors propagate
  without burning the chain.
- Success → match row upserted as draft with `raw_squad_data` (R6: reopening a
  draft never re-OCRs). Raw images are never persisted.
- Every invocation appends a `usage_events` row (the meter).

### 8.4 Suggestion engine (`lib/matching/*`)

- `normalizeName` (`normalize.ts`): NFKD → strip combining marks → remove
  zero-width chars → lowercase → every run of non-`[\p{L}\p{N}]` becomes ONE
  space → trim. **No tag-prefix stripping** — deliberate (separator classes are
  ambiguous on single strings; the MVP editor resolves tag drift).
- `suggestMappings(squads, rosters)` (`suggest.ts`): greedy one-to-one
  assignment over a score matrix — roster-name overlap ratio + 0.3 tag-affinity
  bonus (Gemini's `squadTag` vs team-name tokens, never derived by stripping
  player names). Tiers: strong ≥0.6 / weak 0.3–0.6 / none. Two teams sharing one
  tag must never cross-assign.
- Suggestions are **hints**. The human confirms every mapping, every match (R2).

### 8.5 Auth flows

- `/signup`, `/login`, `/forgot-password`, `/reset-password` — all forms post to
  `/api/auth/*` route handlers (never client-side Supabase). Rate-limited
  (per-IP and per-email buckets), enumeration-safe copy, `?next=` sanitized via
  `lib/auth/next-url.ts`. `/auth/callback` exchanges the recovery/token URL;
  `/auth/error` renders typed failures.
- Login lands you on `/`, which redirects by role (see §9).
- `APP_ORIGIN` is required in production for recovery links — the flow fails
  closed without it.
- **Local dev without hosted GoTrue:** `npm run dev:auth` starts
  `scripts/dev-auth-server.mjs` (see §13.1) on port 54321. It implements only
  the endpoints `@supabase/ssr` + auth-js touch, scrypt-hashes passwords into
  `public.dev_auth_users`, mirrors identities into the `auth.users` shim, and
  refuses to start against a real GoTrue schema.

### 8.6 Orgs, invites, quotas

- `/orgs` (list), `/orgs/new` (create; `u-<hex>` slug), `/orgs/[id]` (detail:
  members, invites, quotas, rename). Roles: owner/admin/member with RLS-enforced
  transitions. Invites: `InviteForm` mints single-use hashed links;
  `/invite/[token]` accepts (anonymous users are bounced to login before any
  state change). `QuotaBanner` surfaces remaining quota.
- Sessions are created inside an org context (the member dashboard's org
  switcher passes `?org=<id>`, membership-validated).

### 8.7 Admin panel (`/admin`)

- Light lime-and-black theme (`styles/admin-theme.css`, `dash-*`/admin tokens in
  `app/globals.css`), floating sidebar shell (`AdminShell`) with ⌘K search
  (`/api/admin/search`), notifications bell, and the impersonation dialog.
- Dashboard widgets (stat cards + time filter, lifecycle pipeline, featured org,
  gauge, needs-attention table, attention list, AI card) are wired to real
  platform data via the read-only, audit-silent
  `lib/admin/dashboard-queries.ts`. Where a metric has no honest source (e.g.
  failed AI reads are not metered), widgets use explicit fallbacks — **never
  invented numbers**.
- Consoles: `/admin/tenants` (users; enable/disable = kill switch),
  `/admin/flags` (feature flags editor), `/admin/audit` (append-only log),
  `/admin/orgs` (read-only org directory).
- **Impersonation:** dialog (`ImpersonateDialog`, requires a reason) →
  `/api/admin/impersonate/start` mints the ledger row + signed cookie → the
  admin experiences the site as the target member (effective identity) with
  `ImpersonationBanner` / dashboard strip everywhere; stop via
  `/api/admin/impersonate/stop` or the exit button. Everything is audited.
- Admin guards use REAL identity — an impersonating admin is never taken to
  `/admin`; they follow the target to `/dashboard`.

---

## 9. Route map

**Public pages** (`PUBLIC_PAGES`): `/` (landing for anonymous; authed users are
redirected by role — real-identity platform admins → `/admin`, everyone else →
`/dashboard`; an impersonating admin follows the TARGET to `/dashboard`),
`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`,
`/auth/error`, `/invite/[token]` (login-gated before state change),
`/share/[token]` (fully public, rate-limited).

**Member (authed):** `/dashboard` (M5; light theme; org via `?org=`; ⌘K
palette), `/orgs`, `/orgs/new`, `/orgs/[id]`, `/sessions` (layout only),
`/sessions/new`, `/sessions/[id]`, `/sessions/[id]/matches/[matchNo]`,
`/sessions/[id]/mvp`.

**Admin (platform role):** `/admin`, `/admin/tenants`, `/admin/flags`,
`/admin/audit`, `/admin/orgs`.

**API route handlers:**

- `/api/auth/{signup,login,logout,forgot-password,reset-password}` —
  server-mediated credentials; rate-limited; enumeration-safe (login errors are
  actionably typed — see §13.1).
- `/api/ocr` — Gemini ingest (`withTenantRoute` + org quota + meter).
- `/api/sessions/[id]/share` — mint/revoke share links.
- `/api/orgs/[id]/invites` — mint/list org invites.
- `/api/dashboard/search` — member ⌘K search (`withTenantRoute`).
- `/api/admin/search` — admin ⌘K search (`requireAdmin`, 404-law, no-store).
- `/api/admin/impersonate/{start,stop}` — impersonation lifecycle.
- `/api/admin/tenants/{enable,disable}` — kill switch.
- `/api/health` — liveness (the ONLY public API path).

**Dev-only (NODE_ENV-gated, 404 in production):** `/dev/graphics`,
`/dev/standings`, `/dev/mvp`, `/dev/announcement`, `/dev/glyphs`,
`/dev/calibrate`, `/dev/boom`.

---

## 10. Domain rules

### Scoring — the "SUPER ruleset" (authoritative)

- Kills = 1 point each.
- Placement points: 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th=1, 8th=1,
  9th–25th=0.
- Standings tie-break: `total DESC → wwcd DESC → kp DESC → pp DESC → team name
  ASC`.
- WWCD = "Winner Winner Chicken Dinner" count (placement-1 wins).

### Domain quirks

- **Rondo map recalls:** eliminated players can return and die again, so
  per-player kills of 16–19 and lobby-wide kill totals > 99 are legitimate, not
  OCR errors. V4 is therefore a never-blocking, never-retried soft warning;
  retrying on it would pressure the model to fabricate lower numbers.
- **Names contain Arabic, CJK, katakana, glyphs like `× · | _ ₛ ≌`** — the font
  stack and the glyph torture test exist for this. OCR names are copied
  character-for-character, never normalized for display.
- **MVP merge:** within-team only; exact normalized match OR Levenshtein ≤2 with
  length ≥4; canonical spelling = most frequent raw spelling; top-5 by
  `kills DESC → name ASC`. Empty-normalized names never merge (even with each
  other). Similar names on different teams must never merge.
- **Slot numbers:** optional 1–99 per team, unique per session when assigned.
  Assigned slots order first; unassigned teams fall back to name order in
  queries and to free row numbers in the announcement labels.

---

## 11. Graphics engine (`lib/graphics/*` + `components/graphics/*`)

- Canvas is **exactly 1080×1620 (2:3)**. Export is client-side via `exportPng`
  (html-to-image) after `document.fonts.ready`; output is exactly 1080×1620
  PNG. Container-query CSS scaling
  (`scale(calc(100cqw / 1080px))`) preserves the ratio with zero JS.
- `GraphicCanvas` (required `variant`: `standings | mvp | announcement`) renders
  absolutely-positioned slots over a background. **Templates = background image
  + coordinate config.** Eight aesthetics (`lib/graphics/aesthetics.ts`): three
  dev gradients (dark-gold, purple-butterfly, pink-blossom) and five art-backed
  (pmpl-light, neon-green, challengers-red, ewc-yellow, pmgc-crimson; art in
  `public/templates/<id>/<variant>.png|jpeg`). Art coverage is partial and
  variant-specific: pmpl-light backs standings + announcement, neon-green backs
  standings, challengers-red backs standings (`overall.png`) + MVP (`mvp.png`;
  announcement stays on the gradient fallback), ewc-yellow / pmgc-crimson back
  standings only.
  The challengers-red standings wiring is working-tree WIP, not in the
  ewc-yellow commit — see §13.2. ewc-yellow's `overall.png` is also a
  4096×6144 JPEG payload in a `.png`-named file: 12 painted bars per column
  (top 393 + i×79, height 67), baked labels/ranks and five stat slots
  (WWCD/MATCHES/PP/ELIMS/TOTAL) at 46-wide boxes.
  challengers-red's `overall.png` is a 4096×6144 JPEG payload inside a
  `.png`-named file (canvas ×1080/4096 = 0.263671875) with 12 painted row bars
  per column: tops 389 + i×67.3636, height 62, rank numerals 1–24, stat ink
  centers 373.5/413.5/454/493 (left) and 831/871.5/912/951.5 (right).
  pmgc-crimson (P8(3)) backs standings at `/templates/pmgc-crimson/overall.png`
  (another 4096×6144 JPEG payload in a `.png` name, ×0.263671875): the 2023 PMGC
  Grand Finals broadcast leaderboard — baked "OVERALL RANKINGS" title (session
  name hidden for standings), slanted gold "MATCH #" badge (number slot x1006
  y260, espresso ink #140A00), baked ranks 1–24 on 12 black bars/column (rowY0
  434, pitch 75.31, height 55, row 12 bottom 1318), silver header labels on both
  sides (WWCD/PLACE PTS/ELIMS/TOTAL ink centers 321/378.5/434.5/498.5 left,
  +474 right; 52px boxes) and pure-white Exo 2 800 text. MVP + announcement fall
  back to a deep crimson-black / gold gradient. Pinned by
  `tests/pmgc-standings.test.ts`.
- `TemplateConfig` (engine v3) key ideas: per-variant `backgrounds`;
  `statColumns` (ordered value boxes, per-table `statBoxW`); `labelsBakedIn` /
  `subtitleBakedIn` (per-variant — the art already prints the labels);
  `ranksBakedIn` (art prints the rank numerals), `rowsPerColumn` (fixed
  left-column capacity via `splitRowsAt`, e.g. challengers 12/12) and
  `fixedRowPitch` (never stretch rows off painted bars); `variantHeaders` +
  `headerFor()`; `variantHideScrimName` + `hideScrimNameFor()` (challengers-red
  hides the scrim name for standings only — the art bakes "OVERALL RANKINGS");
  `singleColumn` (neon's one full-width table); `rowsBottom`-driven row
  auto-fit (`announcementRowLayout`, `columnPitch` in
  `lib/graphics/layout.ts`); P7 flags `hideScrimName`, `uniformMvpRows`,
  `watermarkYOffset`.
- The watermark `scrimlypro.com` is **hardcoded bottom-right** — brand law,
  never configurable.
- Font stack: `"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui,
  sans-serif`; data-bearing fonts weight 700 (P7), bumped to 800 on the
  challengers-red/ewc-yellow art tables.
- Geometry for art-backed templates is **measured from the art pixels** and
  pinned by tests (`tests/graphics.test.ts`,
  `tests/graphics-contrast.test.ts` pins contrast ratios). Changing art means
  re-measuring.
- Dev routes render all graphics from fixtures and are hard-404'd in production
  (`NODE_ENV` gate in every page): `/dev/graphics`, `/dev/standings`,
  `/dev/mvp`, `/dev/announcement`, `/dev/glyphs` (glyph torture fixtures),
  `/dev/calibrate` (16/19/24/25-team calibration datasets, template selector,
  pixel grid and live config readout), `/dev/boom` (error boundary test).

---

## 12. Tests, scripts, and quality gates

### Green-gate set (run before every commit)

```bash
npm run typecheck       # tsc --noEmit (zero any)
npm run lint            # eslint — the architecture laws live here
npm run build           # next build
npm test                # full Vitest suite
npm run verify:secrets  # after build — no secrets in the client bundle
```

Security-relevant work additionally:

```bash
npx vitest run tests/rls
BASE_URL=http://127.0.0.1:<port> bash scripts/verify-auth-matrix.sh
```

### Test suite facts

- `npm test` → Vitest, node env, `tests/**/*.test.ts`; `npx vitest list`
  enumerates **57 files / 656 tests**. Last full green: **2026-11-16 —
  57 files / 656 tests, 314s, exit 0** (DB-backed, local Postgres 17.6; the
  2026-11-06 run took ~7–8 min).
- Expected noisy-but-benign output:
  - Postgres `NOTICE ... trigger ... does not exist, skipping` from throwaway DB
    setup/teardown;
  - `Invalid hook call` warnings in `tests/api/role-landing.test.ts` (tests
    still pass);
  - `[verify:secrets] FAIL — …` lines from the **negative** self-test in
    `tests/security/secrets-scan.test.ts`, which plants a fake secret in a temp
    dir on purpose. They do not mean the real bundle leaked.
- The run ends with `[db:sweep-test]` dropping throwaway DBs; a
  `Timeout terminating forks worker` line after the summary is harmless.
- DB-backed tests build throwaway `m*test_*` databases on the Postgres at
  `SUPABASE_DB_URL` (per-file creation + cleanup in `tests/helpers/pg.ts`); a
  globalSetup worker-owned teardown sweeps leftovers.
- `maxWorkers: 2` and `hookTimeout: 180s` are reliability levers for parallel
  DROP contention — do not "optimize" them away.
- Suite layout mirrors the architecture:
  - Root files: scoring, matching, mvp, gemini, ocr-form/ingest,
    session-create/input/page/quota/slots, matches-mapping/confirm,
    standings-graphic, graphics + contrast + ssr + glyph-fixtures,
    mvp-lock/announcement, rate-limit, auth (public paths, next-url,
    origin-guard, action-guard), login-errors, enumeration-copy, db, sqlite, cn.
  - `tests/api/*`: auth-matrix, admin-guard/search/audit-events,
    impersonation (+ dialog), kill-switch, ocr-guard/quota, org-guard-fold,
    org-invites, role-landing, dashboard-queries.
  - `tests/rls/*`: tenant-isolation, org-isolation, admin-tables.
  - `tests/orgs/*`, `tests/share/*`, `tests/dashboard/*`.
  - `tests/architecture/guards.test.ts` — route-guard meta-test.
  - `tests/security/secrets-scan.test.ts`.

### DB / ops scripts (all operate on `SUPABASE_DB_URL`)

- `db:generate` — drizzle-kit → SQL migrations (committed).
- `db:migrate` — apply committed migrations.
- `db:reset` — drop/recreate public + re-apply + reseed (idempotent).
- `db:seed` — deterministic demo session: 6 matches, 16 Pakistani team names,
  SUPER rules, matches 1–2 confirmed; 66 roster rows.
- `db:sweep-test`, `db:backup`, `db:restore-test` (restore into a throwaway DB,
  count rows, refuse corrupt backups).
- `scripts/golden-check.ts` — legacy-migration parity.
- `scripts/migrate-local-to-supabase.mjs` — dry-run / `--apply`.
- Ops/verification: `scripts/verify-production.sh`,
  `scripts/verify-auth-matrix.sh`, `scripts/check-secrets-in-bundle.mjs`,
  `scripts/acceptance/*` (CDP golden-path walk, 375px sweep), `scripts/m5-dev-*`.

---

## 13. Working-tree state (do not revert blindly)

### 13.1 The four themes landed in `88a9daa`

The themes this file previously described as uncommitted are now committed and
pushed (`main` = `origin/main` = `88a9daa`, 2026-11-06):

1. **Team room slot numbers** — `teams.slot_number` (nullable, 1–99, unique
   per session when assigned), migration `0021`, validation in
   `lib/sessions/input.ts`, persistence in `createSessionWithTeams`,
   `slot_number ASC NULLS LAST, name ASC` query ordering,
   `lib/sessions/slots.ts` (`compareTeamsBySlot`, `orderTeamsBySlot`,
   `announcementSlotLabels`), wizard input, announcement labels, and tests
   (`tests/session-slots.test.ts` + updates).
2. **Login error UX** — `describeLoginError` maps provider failures to 503 /
   403 / 401 / 429 / 502 responses; a per-email failure bucket returns the real
   `Retry-After`; `/login` reads `?disabled` inside `<Suspense>` and no longer
   sticks on a skeleton. Credential-mismatch copy stays enumeration-safe.
3. **Local dev auth stub** — `scripts/dev-auth-server.mjs` + `npm run dev:auth`
   (port `DEV_AUTH_PORT`, default 54321; scrypt passwords in
   `public.dev_auth_users`; mirrors `auth.users`; refuses a real GoTrue schema).
   `dev-auth.log` was committed in the same commit (see §13.3).
4. **Responsive/mobile polish** — dashboard top bar, command palette,
   notifications, admin shell/search, impersonation dialog, attention tables;
   no schema or business-logic changes.

### 13.2 Current uncommitted drift (verified 2026-11-17)

- Untracked art: several root `public/templates/Max_a_*.png` design exports
  (including `Max_a_You_are_an_expert_im (4|5).png`) and
  `public/templates/challengers-red/refrence-image.jpeg` (reference only, never
  rendered). Both `ewc-yellow` (P8(1)) and `challengers-red` (P8(2)) are now
  fully wired as production standings templates with measured 12/12 painted
  bars, baked labels/ranks, and bold typography (pinned by
  `tests/graphics.test.ts`, `tests/graphics-contrast.test.ts`,
  `tests/graphics-ssr.test.ts`, `tests/ewc-standings.test.ts`, and
  `tests/challengers-standings.test.ts`).
  Do not wire further art without measuring geometry and updating the pinned
  graphics tests.
- `next.config.ts` and `dev-auth.log` are no longer part of the drift — both
  landed in `6f4d475` (see §13.3).

### 13.3 Working-tree hygiene

- ✅ `dev-auth.log` is now **untracked and ignored**: `.gitignore` lists it
  (under "local logs") and the file was removed from the index with
  `git rm --cached` in `6f4d475`; it still exists on disk as a runtime log.
- Do not regenerate `db/migrations/meta/0021_snapshot.json` without checking
  `db/migrations/meta/_journal.json` (idx 10).
- Before committing, re-run the green gates; keep config chores, docs and any
  art work in separate commits.

---

## 14. Local development & ops

- **Install/run:** `npm install` → `npm run dev`. Node 22 LTS is the target;
  this box runs Node 25. `npm install --ignore-scripts` is the documented
  workaround if `better-sqlite3` cannot build natively.
- **Port:** README says `http://localhost:3000`, but check what is free first.
  This project has recently been served on other ports (3311 has been used;
  port 3000 has been occupied by another project). Next 16 refuses a second dev
  server in the same directory.
- **Local Postgres (Windows box):** user-space PostgreSQL 17 at
  `C:\Users\mianq\Projects\pg-embedded`, port **54329**. It does **not**
  auto-start after reboot. The naive start — fine from a clean native shell,
  but **not** from Git Bash (see the fix below):

  ```powershell
  & "C:/Users/mianq/Projects/pg-embedded/pgsql/bin/pg_ctl.exe" -D "C:/Users/mianq/Projects/pg-embedded/data" -l "C:/Users/mianq/Projects/pg-embedded/pg.log" start
  ```

  Stop with the same command + `stop`. The local database name is
  `scrimlypro_main` (per `.env.local.prehosted`); README still says
  `scrimlypro_m1`, and older snapshots of this file said `scrimlypro_dev` —
  trust the actual DSN. A system PostgreSQL 18 on 5432 has unknown
  credentials — leave it alone.
  **Current state (2026-11-16):** the cluster is **running** (PostgreSQL 17.6,
  healthy backends; `SELECT current_database(), current_setting('server_version')`
  returns `scrimlypro_main | 17.6`). The former `0xC0000142`
  (`STATUS_DLL_INIT_FAILED`) backend crash is fixed by **how** the cluster is
  started, not by changing the cluster:
  1. Git Bash prepends `/mingw64/bin` and `/usr/bin` to `PATH`, so child
     backends picked up incompatible `libcrypto`/`libssl`/`zlib` DLLs instead of
     `pg-embedded\pgsql\bin`; and
  2. backends spawned inside an agent's headless Git Bash subshell inherit
     restricted console/job-object handles.
  Start it with a sanitized `PATH` and detached from the calling job, e.g. via
  WMI (spawns under `svchost`, clean environment and no inherited job):

  ```powershell
  $cmd = 'cmd.exe /c "set PATH=C:\Users\mianq\Projects\pg-embedded\pgsql\bin;C:\Windows\System32;C:\Windows&& C:\Users\mianq\Projects\pg-embedded\pgsql\bin\pg_ctl.exe -D C:\Users\mianq\Projects\pg-embedded\data -l C:\Users\mianq\Projects\pg-embedded\pg.log start"'
  Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = $cmd; CurrentDirectory = "C:\Users\mianq\Projects\pg-embedded\pgsql\bin" }
  ```

  (`schtasks /Run` on a one-shot task is the fallback if `Invoke-CimMethod` is
  blocked.) `psql.exe` needs `PGPASSWORD` from the DSN or it blocks on a
  prompt; `-w` plus `PGSSLMODE=disable` gives a clean non-interactive check.
- **Env:** copy `.env.example` → `.env.local`. `SUPABASE_DB_URL` + Supabase URL/
  anon key are required for anything beyond static pages; `GEMINI_API_KEY` only
  for OCR.
  **Current state (2026-11-16):** `.env.local` was restored from
  `.env.local.prehosted` — `SUPABASE_DB_URL` targets the local cluster
  (`postgresql://127.0.0.1:54329/scrimlypro_main`),
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` (the dev-auth stub's
  default port, so `npm run dev:auth` works with no extra vars),
  `SAMPLE_OCR=1`, `GEMINI_API_KEY` empty (fixtures), `IMP_SECRET`/`AUDIT_SALT`
  set. `APP_ORIGIN` is absent — it is a production-only fail-closed check.
  The failed hosted config (Supabase ref `bhkjxxkypdwmlwgqiihv`, pooler host
  that failed with `ENOTFOUND`) is preserved in
  `.env.local.hosted-dead.bak`. A test run can also override
  `SUPABASE_DB_URL` in the environment. All `.env*` files are gitignored.
- **Auth locally:** either point `NEXT_PUBLIC_SUPABASE_URL` at a local GoTrue
  (`supabase start`) or use `npm run dev:auth` (the stub in §8.5/§13.1).
  `DEV_AUTH_PORT` / `DEV_AUTH_SECRET` are read from `.env.local` but are not
  present in `.env.example` — add them when using the stub.
- **Don't broadly kill node** on this box — you will kill unrelated projects'
  servers. Kill by port/PID.
- **Landing page:** real implementation is `app/page.tsx` +
  `components/landing/*`, ordered **Hero → BenefitsSection → ReserveSection →
  SiteFooter**. Root `index.html` and similar stray HTML are design prototypes,
  not the app. Landing typefaces come via `next/font` CSS variables
  (`--font-inter-tight`, `--font-inter`, `--font-lexend`) + the shared scale in
  `components/fonts.ts`.
- **Hydration/dev-origin warnings:** handled via Next's `allowedDevOrigins`.
- **Screenshots:** some browser panes freeze CSS transitions when backgrounded;
  force-finish animations before capture.

### Environment variables (`.env.example` is canonical)

| Var | Scope | Meaning |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase project URL + anon key. |
| `SUPABASE_DB_URL` | server | Postgres connection (Drizzle + migrations + tests). Required beyond static pages; must be reachable for DB-backed tests. |
| `SUPABASE_SERVICE_ROLE_KEY` | server, scripts only | Bypasses RLS. Only `lib/db/admin.ts` + one-off scripts. |
| `GEMINI_API_KEY` | server, `/api/ocr` only | OCR key. |
| `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACKS` | server | Default `gemini-3.1-flash-lite` + 404 fallback chain. |
| `SAMPLE_OCR` | server | `1` = fixture mode (matches 1–3) without a key. |
| `APP_ORIGIN` | server | Public origin for recovery links; production fails closed without it. |
| `IMP_SECRET` | server | 32-byte hex HMAC key for impersonation cookies; production fails closed. |
| `AUDIT_SALT` | server | sha256(ip + salt) for audit `ip_hash`; missing ⇒ rows carry no hash. |
| `TRUST_PROXY` | server | Distrust-by-default; set `true` only behind a proxy that overwrites `x-forwarded-for`. |
| `DEV_AUTH_PORT` / `DEV_AUTH_SECRET` | local only | Dev auth stub port (default 54321) + HMAC secret. Not listed in `.env.example`; set in `.env.local` when using the stub. |

---

## 15. Open work / suggested next steps

**Done on 2026-11-16 (all green-gated):**

- ✅ **Local database restored.** Postgres 17.6 is running on `127.0.0.1:54329`
  (`scrimlypro_main`) with healthy backends — the `0xC0000142` crash is fixed
  by the sanitized-PATH / detached WMI start in §14.
- ✅ **Migration `0021` verified locally** (`npm run db:migrate`): `teams.slot_number`
  is `integer NULL`, `teams_session_slot_uq` is the partial unique index on
  `(session_id, slot_number) WHERE slot_number IS NOT NULL`, and
  `drizzle.__drizzle_migrations` holds all 11 committed migrations (id 11 =
  `0021`).
- ✅ **Full suite re-confirmed:** `npm test` → **57 files / 656 tests passed**
  (314s, exit 0) against the restored database.
- ✅ **Hygiene committed:** `next.config.ts` Turbopack root pinned and
  `dev-auth.log` added to `.gitignore` + `git rm --cached` in `6f4d475`
  (file kept on disk); this doc update lands in its own docs-only commit.

**Remaining:**

1. **Decide remaining art WIP:** `ewc-yellow` is now wired with measured
   geometry and pinned tests. Decide on the replaced
   `challengers-red/overall.png` or remove the untracked exports. Do not ship
   unregistered art.
2. **Hosted Supabase cut-over** — still the next major milestone, per
   `docs/deploy/cut-over.md` (v2, rehearsal-proven). The hosted ref in
   `.env.local.hosted-dead.bak` is dead; re-run the runbook from step 1 rather
   than patching it.
3. **Parking lot — do not start without instruction:** payments/entitlements,
   email delivery of invites, per-match graphics (data already supports it),
   custom template upload, org-level kill-switch wiring, Redis-backed limiters,
   Storage-bucket logos (still data URLs), share-link OG tags, Next 17 upgrade.

---

## 16. Working rules for the next LLM

1. **Understand before editing.** The codebase is heavily commented; comments
   record WHY (laws, measured values, past incidents). They are load-bearing.
2. **Pure logic goes in `lib/`, tested.** UI components stay dumb. New business
   rules get Vitest fixtures first.
3. **Respect the guard/DB laws** (§5). New API route ⇒ `withTenantRoute`; new
   page/action ⇒ `requireUser`; new admin surface ⇒ `requireAdmin`; tenant
   queries ⇒ `withUserDb`.
4. **Schema changes start in `ERD.md`**, then `lib/db/schema.ts`, then a
   migration in the correct number block, then snapshot reconciliation if the
   graph forked.
5. **Never store aggregates.** Never render from `raw_squad_data` outside the
   review path. MVP graphic only from locked `mvp_lists.entries`.
6. **Mobile-first + no dead ends:** 375px clean, ≥44px targets, loading and
   error UI everywhere, every failure path has a manual fallback.
7. **Run the green gates** (§12) before committing; add tests for anything you
   touch; record deviations in README Assumptions.
8. **Commit style:** short imperative summaries; milestone work as numbered
   atomic commits (`m6(9): …`, `wave1(6): …`, `P7 …`).
9. **Never fabricate** metrics, customers, or pilot data. Use honest fallbacks.
10. **When unsure about Next 16 behavior, read `node_modules/next/dist/docs/`.**
    Your training data is probably wrong.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| **Scrim** | A custom PUBG Mobile practice match organized by a community organizer. |
| **Session** | One scrim event containing 1–6 matches and 4–25 teams. |
| **WWCD** | "Winner Winner Chicken Dinner" — a placement-1 win, counted per team. |
| **SUPER ruleset** | The authoritative scoring rules (kills + placement points, tie-breaks). |
| **Squad** | One OCR-extracted group from a results screenshot; mapped 1:1 to a team. |
| **Roster** | Learned player-name list per team; invisible suggestion fuel. |
| **Draft match** | OCR result persisted, not yet confirmed; reopening never re-OCRs. |
| **Confirm** | Atomic, idempotent write of `match_results` + roster learning. |
| **Unlock** | Delete results → draft → rebuild rosters, in one transaction. |
| **MVP list** | Top-5 per-player kill aggregation, edited then locked; sole source for the MVP graphic. |
| **Aesthetic** | A graphic template: background art + coordinate config (7 total). |
| **Effective identity** | The impersonation target when a valid admin session exists; otherwise the real user. |
| **Kill switch** | A `feature_flags` `disabled` row that locks a user out of every authed surface. |
| **Trust proxy** | Whether `x-forwarded-for` is honored for rate-limit attribution (default: no). |

---

*End of context document. Build fast, measure twice, and let the human confirm.*
