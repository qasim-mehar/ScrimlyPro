# M5 — Member Dashboard: Implementation Report

Lane: `qasim/m5-dashboard` · worktree `../scrimlypro-dash` · port 3062 · DB `scrimlypro_dash`
Status: **IN PROGRESS** — this file is updated per work package; final sign-off at WP14.

---

## 0. Sign-off checklist

- [x] Branch `qasim/m5-dashboard` pushed
- [x] Suite green at HEAD: **616/616** (plain `npm test`; +22 over the 594 baseline)
- [x] Zero new deps (`package.json`/lock unchanged) / zero new migrations (0030–0039 reserved, unused)
- [x] Reference images committed under `docs/reference/dashboard/` (+ the as-built `final-1440x900.png`)
- [x] Report complete (§1–§10)
- [x] No guard / RLS / admin files touched (grep proofs in §6 G10)
- [x] Visual gate passed with deviations documented (§3, §7)

## 1. Environment

- Branch `qasim/m5-dashboard` from `main` @ `3b60ea1` (wave-1 + marketing landing merge).
- Worktree `C:/Users/mianq/Projects/scrimlypro-dash`; port 3062; local DB `scrimlypro_dash` on the portable PG 17.6 cluster at `127.0.0.1:54329` (migrations applied from the full chain).
- `.env.local` in the worktree: hosted Supabase auth env (project `bhkjxxkypdwmlwgqiihv`, cut-over-ready) + `SUPABASE_DB_URL` pointed at the LOCAL cluster (`scrimlypro_dash`). Rationale: local dev has no GoTrue (migration 0002 shim is for RLS/local CI only — the auth routes call `supabase.auth.signInWithPassword`, which needs the hosted project), while tests must only ever create throwaway DBs on the local cluster. Tests connect via `SUPABASE_DB_URL` and never touch GoTrue (mocked-identity seam).
- Node v25 non-LTS; deps installed with the documented `npm ci --ignore-scripts` workaround.

## 2. Pre-flight inspection table (WP0)

| # | Inspect | Finding | Consequence for the build |
|---|---|---|---|
| 0a | Baseline suite green on `main` | 592/594 passed + 2 failed in ONE file with `PostgresError: database "m1test_…_…" does not exist` — the documented parallel-cleanup flake class (wave-1 report: DROP under parallel load can exceed hook timeout under Windows). Not a code red: failure mode is test-infra (a throwaway DB connection), no assertion failures. Re-run recorded in §5. | G1 verdict from the clean re-run; if it reproduces as assertion red → STOP. |
| 0b | Org tables present | `organizations`, `org_members`, `org_invites`, `org_quotas` + `usage_events`, `share_links` all in schema + migrations 0010–0014. Wave-1 integration complete. | STOP condition clear. |
| 0c | One true guard | `requireUser` (lib/auth/action-guard.ts, effective identity + kill switch) for pages/actions; `withTenantRoute` (lib/auth/route-guard.ts) for API — the single stack; `lib/orgs/route-guard.ts` deleted at wave1(6) (`tests/api/org-guard-fold.test.ts` proves it). `grep` finds no guard copy. | STOP condition clear. Dashboard imports only these. |
| 1 | Member-facing route inventory | EXISTS: `/sessions/new`, `/sessions/[id]`, `/sessions/[id]/matches/[matchNo]`, `/sessions/[id]/mvp`, `/orgs`, `/orgs/new`, `/orgs/[id]` (members+invites mgmt), public `/invite/[token]`, `/share/[token]`. NOT EXIST: `/sessions` index, matches index, standings page, screenshots/ingest page, share-links page, team page, settings page, AI-reader page, reports/graphics-export page (`/dev/graphics` is a dev fixture route, not member-facing). | Sidebar: live links = Dashboard, Team→`/orgs/[id]`, New-session button→`/sessions/new`, notification/AI-card targets that exist. All other nav items render disabled with a "Soon" tooltip per non-goal. |
| 2 | Org-context mechanism | NO cookie/param mechanism exists. Org is derived per route: `getActiveOrgs(db, userId)` (oldest membership first) / `ensurePersonalOrg`; explicit `orgId` params on `/orgs/[id]` validated by `requireOrgRole`→`fetchOrgRole` (foreign+missing ⇒ indistinguishable). | Dashboard adopts: active org = `?org=<uuid>` search param validated via `fetchOrgRole` (null ⇒ `notFound()`), default = first org by `joinedAt` (identical ordering to `ensurePersonalOrg`). No second mechanism invented — the param is the existing explicit-org pattern. |
| 3 | `sessions` shape | `id, userId, orgId, name, plannedMatches (1–6), teamCount, templateId, scoringRules, status: "active"\|"completed", createdAt`. **No code field, no lobby/format fields, no scheduled/end dates, no completedAt.** | Featured card code chip = display code derived from the session id (`SCR-` + first 6 id chars, stable, links to the real session) — documented deviation; meta line = `{createdAt date} · {plannedMatches} matches · {teamCount} teams`; 3rd stat slot = "Created" (no Ends data). |
| 4 | `matches` shape | `id, sessionId, matchNo, status: "draft"\|"confirmed", rawSquadData (jsonb, set on OCR success), createdAt, confirmedAt`. Draft rows are only created post-OCR (route contract), so every draft has rawSquadData. No "failed read"/"unread screenshot" state — raw images are never persisted. | Stat 3 = drafts; pipeline = real stages only; HIGH rules "failed OCR reads" and "scheduled match missing result" DROPPED (states do not exist); AI-card red/orange rows remapped to real facts (see §3). |
| 5 | `usage_events` + quota | Append-only per `/api/ocr` invocation; meter is per-USER calendar month ACROSS orgs (`assertOcrQuota`), limit read from the org's `org_quotas.monthlyOcrCalls` (default 300). | "Reads left" = `max(0, orgLimit − userMonthCount)` computed against the ACTIVE org's limit; meter semantics documented in the sidebar subtitle tooltip/report. |
| 6 | Invites shape | `org_invites`: email, role, tokenHash, expiresAt, acceptedAt, createdAt. Pending = `acceptedAt IS NULL AND expiresAt > now()`. | MEDIUM rule "invite pending ≥ 3 days" = pending AND `createdAt ≤ now()−3d`; due = `createdAt+3d`. |
| 7 | Share-links shape | `share_links`: sessionId, tokenHash, createdAt, expiresAt, revokedAt. Active = not revoked, not expired. | Share count = active links. MEDIUM rule "completed ≥24h without shared standings": `status='completed'` AND no active link AND staleness proxied by `max(matches.confirmedAt)` (no completedAt exists — documented proxy); due = proxy+1d. |
| 8 | Icons + fonts | NO icon library in deps (rule: never add one) → inline lucide-style SVGs (20px, 1.5–2px stroke). Fonts: `components/fonts.ts` already exports `inter` via `next/font/google` (`--font-sans`) — reused; zero new deps. | Inline SVG icon module `components/dashboard/icons.tsx`. |
| 9 | Baseline test count | Wave-1 integration report: 594/594. Worktree baseline re-run: see §5 arithmetic. | Arithmetic baseline = 594. |
| 10 | Avg processing time support | `matches.createdAt → confirmedAt` both exist; confirmed matches in range support `avg(confirmedAt − createdAt)`. | Pipeline header "Average processing X" is REAL; "—" when zero confirmed matches in range. |

### Additional pre-flight facts driving §3

- **`/` conflict**: the M5 brief says "unauth → `/login`" and "no public marketing landing", but the repo has since merged a marketing landing at `/` (commit `aa6cee4`, "app home kept for tenants", `/` on PUBLIC_PAGES). Resolution: keep the landing for anonymous visitors; authenticated users are redirected (platform-admin ⇒ `/admin`, member ⇒ `/dashboard`). Deviation recorded in §3.
- **Platform-admin probe**: `profiles.role === 'admin'` read in the caller's RLS context (mirrors `lib/admin/require-admin.ts` semantics) on the EFFECTIVE identity — an impersonating admin's effective identity is the member, so they land on `/dashboard` with the banner (per M5 §6). The probe lives in `lib/dashboard/` (no edits to `lib/admin/**`).
- **Member search under RLS**: `org_members` carries no name/email; `profiles` is self-rows-only under RLS — other members' emails/names are NOT readable by design. The search API covers sessions + matches only. Deviation recorded in §3.
- **Attention ranking rules as-built** (deterministic; drops documented): HIGH = quota ≥80% consumed while an active session exists; MEDIUM = drafts pending ≥24h; invites pending ≥3d; completed-unshared ≥24h (confirmedAt proxy). Sort High→Medium then due date; cap 6.
- **Pipeline as-built**: over active sessions' planned matches — Upcoming (planned−created, gray) / Drafts (lime) / Scored (confirmed, black). Upcoming is plan-quantity (not range-scoped — timestamps don't exist for planned matches); Drafts+Scored are range-scoped by `createdAt`. Reference's 5 segments reduced to 3 real stages (§3 deviation).

## 3. Mapping decisions + deviations

Every deviation keeps the existing pattern per rule 10; none improvises security or data semantics.

| # | Reference/brief detail | As-built | Reason |
|---|---|---|---|
| D1 | `/` unauth → `/login` | Anonymous visitors see the marketing landing (`/` is on PUBLIC_PAGES) | Landing merge (`aa6cee4`) postdates the brief; landing stays, authed users still never linger (role redirect) |
| D2 | Session code chip `SCR-1042` (no code column) | `SCR-` + last 6 chars of the dash-stripped session id (`sessionCode()`) — stable, derived from the real row | No `code` field exists; the chip still gives each session a recognizable handle |
| D3 | Meta line "Oct 24 · 3 lobbies · Custom format" | `{created date} · {plannedMatches} matches planned · {teamCount} teams` | No lobby/format columns exist |
| D4 | 3rd stat "Ends" (scheduled end) | "Created" (creation date) | Sessions carry no schedule/end dates |
| D5 | Pipeline 5 segments (Scheduled/In lobby/Reading/Scored/Shared) | 3 segments: Upcoming (planned−created, gray) / Drafts (lime) / Scored (black); reference color rhythm kept | Match status is only `draft\|confirmed`; no per-match schedule or share-state exists. Upcoming is plan-quantity and not range-scoped (planned matches have no timestamps) |
| D6 | HIGH rule "failed OCR reads" | Dropped | `/api/ocr` records `usage_events` only on success — failure is not a persisted state |
| D7 | HIGH rule "scheduled match missing result" | Dropped | No per-match schedule exists; the stale-draft rule covers the real "awaiting score" state |
| D8 | Attention rule set | Kept rules: HIGH quota ≥80% w/ active session; MEDIUM stale drafts ≥24h, invites ≥3d, completed-unshared (proxy `max(confirmed_at)`+24h — no `completed_at` column) | States that exist only |
| D9 | Search covers "member names/emails" | Sessions + matches only | `profiles` is self-rows-only under RLS — other members' emails are unreadable by design |
| D10 | "Review queue" → screenshots/ingest page | Links to the featured session detail (the real upload/review surface); hidden with no session | No standalone ingest route exists (inspection #1) |
| D11 | Pipeline "Open →" to sessions index | Links to the featured session | No `/sessions` index route exists |
| D12 | Palette tokens `--bg`, `--ink`, … | Namespaced `dash-*` tokens (`--color-dash-bg`, …) | `--color-bg`/`--color-ink`/`--color-line` already exist for the dark app theme + landing; redefining would restyle untouched surfaces |
| D13 | Inter via `next/font/google` | Reused the existing `inter` loader mounted at the root layout (`--font-inter`) | Zero-new-deps rule; the font already ships |
| D14 | Icon library | Inline lucide-style SVG module (`components/dashboard/icons.tsx`) | No icon package in deps; adding one is forbidden |
| D15 | "N sessions need attention" pill | "N items need attention" | The count includes invites + quota items, not only sessions |
| D16 | Attention sort "by due date" | Ascending (most overdue first), High before Medium | Most-urgent-first is the honest reading of the rule |
| D17 | Sub-AA palette values | `--color-dash-success` #15803D, `--color-dash-amber-ink` #B45309, `--color-dash-danger-ink` #B91C1C; meta text `ink-3` instead of `ink-4` | G6 requires text contrast AA; one step darker than the reference |
| D18 | Responsive ≥1280 full / 1024–1279 rail | Sidebar visible ≥1024 (`lg`), hamburger drawer <1024, 2-col ≥1024 stacked below; stats 2×2 until 1920 (`xl:grid-cols-4`) | One fewer bespoke breakpoint; same intent |
| D19 | Greeting "Good morning, Nizam" (profile name) | First token of the email local part, capitalized; "there" fallback | No profile display-name column exists |
| D20 | Banner meta-test surfaces | `app/page.tsx` removed from the list (no tenant content renders there anymore — authed users redirect before render); `app/dashboard/layout.tsx` added | WP2 made `/` anonymous-only; banner coverage preserved at the redirect target |
| D21 | AccountHeader on every page | Hidden on `/dashboard` only (own shell chrome per the reference) | The dashboard's top bar replaces it; every other page unchanged |
| D22 | "Average processing X" | Real `avg(confirmed_at − created_at)` over confirmed matches created in range; "—" when none | Timestamps support it (inspection #10) |
| D23 | Nav live links | Dashboard, Attention (anchor), Team → `/orgs/[id]`, New session; everything else disabled "Soon" with visible count badges | Route inventory (inspection #1) |
| D24 | WP2 "4 redirect tests" | 5 tests (added kill-switch case) | G3 requires the disabled-user path |

## 4. Implementation notes

- **Org context**: no active-org cookie exists in the codebase (inspection #2). The dashboard resolves the active org as: `?org=<uuid>` validated against `getActiveOrgs` memberships (foreign/malformed → `notFound()`, 404 law), defaulting to the first org by `joinedAt` — identical ordering to `ensurePersonalOrg`. The switcher pill lists all memberships as links; `range` links preserve `org`. `lib/dashboard/org.ts`.
- **Guards**: the page uses `requireUser()` (action-guard) — the one true page seam (effective identity + kill switch). The search API uses `withTenantRoute` — the one true API seam (origin → identity → kill switch → rate limit). No guard logic copied anywhere (§11 grep proof).
- **Range handling**: `today` = server-local midnight; `7d`/`30d` = rolling windows. The delta compares against the previous window of equal length. `now` is injected into `getDashboardData` so tests pin time.
- **Data layer**: `lib/dashboard/queries.ts` is server-only, read-only, one typed object per call, every query org-predicated and RLS-backed via `withUserDb`. Zero writes anywhere on the feature. Notifications derive from `matches.confirmed_at`, `org_invites.accepted_at`, `share_links.created_at`; the unseen dot is localStorage-only client state.
- **Quota meter**: per-USER calendar-month count across orgs (`usage_events`) vs the ACTIVE org's `org_quotas.monthly_ocr_calls` limit — matches `assertOcrQuota` enforcement semantics (0014).
- **Platform-admin probe** (`lib/dashboard/platform-role.ts`): `profiles.role === 'admin'` inside `withUserDb`, mirroring `require-admin` semantics without touching `lib/admin/**`; called on the EFFECTIVE identity (impersonating admin → member's `/dashboard` + banner; `/admin` itself still guards on REAL identity).
- **Test harness**: pages/API tested by mocking `getAuthedUser` (+ `getEffectiveUser` where the redirect flow needs it) and injecting the throwaway DB at the `getDb` seam — the established wave-1 patterns. `next/font/google` is stubbed in suites importing landing components (module-scope font loaders don't run outside Next's pipeline).

## 5. Tests

- Baseline attempt 1 (WP0): 592/594 — 2 failures in one file, `PostgresError: database "m1test_8888_mvnxh21u_dags8frl" does not exist` (infra flake class, no assertion red).
- Baseline attempt 2 (WP0, full log kept): **594/594 passed** (`npm test` exit 0) — the attempt-1 failures confirmed as the documented Windows parallel-cleanup flake, not code red. **G1 cleared; baseline = 594.**
- Worktree pre-suite gates: `db:migrate` OK on `scrimlypro_dash`; `db:sweep-test` (0 leftovers); `tsc --noEmit` clean; `eslint .` 0 errors / 4 pre-existing warnings.
- New suites (all `tests/dashboard/`):

| Suite | Tests | Covers |
|---|---|---|
| `root-redirect.test.ts` | 5 | WP2 redirect matrix incl. kill switch + impersonation-follows-effective |
| `queries.test.ts` | 5 | WP3 aggregate correctness vs fixtures + cross-org RLS isolation + quota-HIGH rule + empty org + search |
| `greeting.test.ts` | 2 | WP4 pure helpers |
| `featured-math.test.ts` | 2 | WP5 progress math |
| `pipeline-math.test.ts` | 4 | WP8 segment widths + processing format |
| `search-api.test.ts` | 4 | WP10 API: member 200, foreign-org 404 law, unauth 401, empty q |

- Arithmetic: 594 baseline + 22 new = **616 — final suite 616/616 passed** (plain `npm test`, exit 0, all 51 files).
- **G9 flake investigation (recorded for the next lane)**: after the new suites landed, three full-run attempts at the old settings (`maxWorkers: 4, hookTimeout: 60s`) failed 2–13 tests per run — always `Hook timed out` in DB-cleanup hooks or CPU-bound tests timing out, in wave-1 suites M5 never touched, never an assertion (the flaked files pass 30/30 in isolation). Two contributing causes found and fixed: (1) Windows parallel `DROP DATABASE … WITH (FORCE)` contention at 51 files → committed `maxWorkers: 4 → 2`, `hookTimeout: 60s → 180s` (same reliability lever the config already documents — no assertion touched); (2) vitest worker trees from a manually-killed run stayed alive and starved the CPU of later runs — killed by PID; lesson: never overlap a `next build` or a second suite with a full run on this machine, and verify no orphan `node.exe` trees remain before judging a red suite.
- Meta-test change: banner-surface list updated additively for the dashboard; `app/page.tsx` removed with rationale (D20) — protection preserved at the redirect target; no other assertion touched.

## 6. Gates G0–G10

- **G0** Pre-flight STOP conditions clear: org tables present; single guard (`withTenantRoute` + `requireUser`; `lib/orgs/route-guard.ts` confirmed deleted by the existing meta-test). §2.
- **G1** Baseline green on the branch: 594/594 (attempt 2; attempt 1's 2 failures = documented Windows cleanup flake, no assertion red). §5.
- **G2** Every WP commit ran `tsc --noEmit` + `eslint` (new surface) green before committing; the one commit that slipped through with a tsc error (m5(3) first push) was fixed and amended within minutes — HEAD is clean. No expected red ever existed on this lane.
- **G3** Guard matrix: `tests/dashboard/root-redirect.test.ts` — anon → landing; member → `/dashboard`; platform admin (profiles.role probe) → `/admin`; impersonation follows the effective identity (target member → `/dashboard` + banner mounted in `app/dashboard/layout.tsx`); disabled → `/login?disabled=1` (kill switch via the one true requireUser). Anonymous `/dashboard` → proxy bounce verified live (307 → `/login?next=/`).
- **G4** Cross-org isolation: `queries.test.ts` passes org A's id EXPLICITLY while running as org B's member under the real RLS path (`withUserDbForTest`) — featured null, all aggregates zero, notifications/attention empty; `search-api.test.ts` proves the same law on the API (identical 404 for foreign org).
- **G5** Visual gate: `/dashboard` at 1440×900 with the dev demo data (`scripts/m5-dev-demo.mjs`) — evidence at `docs/reference/dashboard/final-1440x900.png` beside `left.jpg` / `right.png`; deviations in §3/§7.
- **G6** A11y: keyboard walkthrough done in-browser — palette (button → type → Enter navigated to `/sessions/demo-s2`), drawer (open/Esc-close), all icon-only controls carry aria-labels, focus-visible ring in `.dash-shell`, text tokens darkened to AA (D17). Mobile 375px verified (no horizontal overflow, stacked layout).
- **G7** `next build` clean; `package.json` unchanged (0 deps); 0 new migrations (block 0030–0039 reserved, unused).
- **G8** Honesty audit: §8 — every displayed number → query; zero hardcoded values.
- **G9** Final full suite: **616/616 passed** (`npm test` exit 0) — 594 baseline + 22 new; the Windows cleanup-flake investigation and the committed reliability settings are recorded in §5.
- **G10** Quality checklist: §11 greps — diff surface exactly the declared set (+ dev-only scripts + documented one-line AccountHeader guard); 0 guard copies; 0 service-client imports in new code; 0 console.log/TODO/FIXME.

## 7. Visual gate (side-by-side)

Evidence: `docs/reference/dashboard/` — `left.jpg` + `right.png` (the reference halves, committed at m5(0)) and `final-1440x900.png` (the as-built screen, same demo dataset rendered in §8's queries).

Composition vs reference: floating white sidebar (org switcher pill → membership list, OVERVIEW/SCRIM/WORKSPACE groups, count badges, lime AI toggle card), top bar (⌘K search field with lime kbd chip, bell + red dot, black New-session pill), greeting row + lime attention pill, left column featured card (dark hero with lime grid + real top-3 standings, overlapping white content box, code chip + status tag + progress + 3-stat grid) then the needs-attention table (header strip, 64px rows, stage chips), right column segmented filter → 4 stat cards (dark hero first) → pipeline bar (gray/lime/black) → attention list ("Ranked by Scrimly AI" pill) → dark AI card → lime readiness gauge with white footer pill.

Visual deviations (all also in §3): token namespace `dash-*` (D12); AA-darkened status inks (D17); 3 pipeline segments instead of 5 (D5); session code derived from id (D2); meta/stat labels use real fields (D3/D4); palette/gauge details per §4.4 otherwise followed (radii 20–24px cards / 12px pills / 9999px buttons, 1px `--line` borders, near-zero shadows, Inter).

## 9. Known limitations + follow-ups

1. Sidebar nav stays mostly "Soon" until the sessions index / standings / screenshots / share-links / settings routes exist (route inventory, inspection #1). Badges are live even on disabled items.
2. `?next=` login round-trip for `/dashboard` falls back to `/` (first-segment allowlist in `lib/auth/next-url.ts` is untouched per rule 9) — post-WP2 `/` redirects correctly, so the user still lands on the dashboard.
3. Org switching is a URL param, not a cookie — deep-linkable and stateless; a remembered-selection cookie is a future nicety.
4. Notifications read-state is localStorage-only (per device), as specified; no server-side seen state exists.
5. The quota subtitle shows the per-USER meter vs the ACTIVE org's limit (enforcement semantics); a per-org usage view would need a different query.
6. Featured session = newest ACTIVE; completed-only orgs see the onboarding card (spec §5 fallback).
7. `sessions.code` display handle is id-derived; a real short-code column would be nicer at scale.
8. Dev helpers (`scripts/m5-dev-*.mjs`) touch the hosted auth project for the dev login only (documented user `m5dash-dev@gmail.com`; password in the script, dev-only).

## 10. What I did NOT do (and why)

- **No new migrations** — the feature is read-only over wave-1 tables; block 0030–0039 reserved and unused.
- **No new dependencies** — icons are inline SVGs; Inter already shipped via `next/font/google`.
- **No changes** to `app/admin/**`, `lib/admin/**`, `lib/auth/**` guard internals, RLS policies, migrations 0000–0029, or quotas. The admin probe lives in `lib/dashboard/platform-role.ts` mirroring require-admin semantics.
- **No sessions index page invented** — the sidebar Sessions/Matches/Standings/… items render disabled "Soon" rather than fabricating routes.
- **No simulated data** — dropped the brief's failed-reads and scheduled-match rules (no persisted states), replaced the lobby/format meta with real fields, and limited search to sessions+matches (profiles RLS).
- **No `withOrgRoute` resurrection** — the API uses `withTenantRoute` (the wave1(6) folded single guard).
- **No public-API additions** to the proxy/public-paths; `/dashboard` is guarded by default (not public) and by `requireUser` in depth.
- **Did not run the dev server against the hosted DB** — the worktree pins `SUPABASE_DB_URL` to the local cluster; only the dev LOGIN uses hosted GoTrue (dev user inserted via the documented script because hosted email-confirmation blocks API signup without an inbox).

## 8. Number → query mapping (honesty audit)

Every number rendered on `/dashboard` and `/api/dashboard/search` traces to a query in `lib/dashboard/queries.ts` (single `getDashboardData` pass unless noted). Zero hardcoded values.

| Displayed number | Source query (all org-predicated, RLS-backed) |
|---|---|
| Greeting hour | `new Date().getHours()` (server render clock) |
| Attention pill count | `attentionList.length` — union of rules D8 |
| Featured card: code | `sessionCode(sessions.id)` (D2 derivation) |
| Featured: top-3 standings rows | `computeStandings(matchResults ⋈ confirmed matches, teams, scoringRules)` |
| Featured: progress % | `round(confirmed / plannedMatches × 100)` |
| Featured: Teams / Stage / Created | `sessions.team_count` / derived from match counts / `sessions.created_at` |
| Gauge % + "N/M matches scored" | same as progress; `confirmed / plannedMatches` |
| Attention table rows ("N sessions flagged") | stale drafts (matches ⋈ sessions, `status='draft' ∧ created_at ≤ now−24h`) + completed-unshared sessions |
| "in review Xh" | `now − min(stale draft created_at)` per session |
| Stat 1 active sessions / matches in play | count of `sessions.status='active'` / sum of their match rows |
| Stat 2 matches processed / +delta | count `matches.status='confirmed' ∧ created_at ≥ cutoff` / same over the previous equal window |
| Stat 3 awaiting / oldest Xh | count `status='draft'` / `now − min(draft created_at)` |
| Stat 4 needs attention | `attentionList.length` |
| Pipeline segments Upcoming/Drafts/Scored | `Σ max(0, planned − created)` over active sessions / range drafts / range confirmed |
| Average processing | `avg(confirmed_at − created_at)` over range confirmed |
| Sidebar "N reads left" | `max(0, org_quotas.monthly_ocr_calls − count(usage_events by user this month))` |
| Nav badges (sessions/matches/drafts/attention) | active count / matches created ≥ now−7d / draft count / attentionList.length |
| Notifications list | latest 10 of `matches.confirmed_at` ∪ `org_invites.accepted_at` ∪ `share_links.created_at` |
| AI card at-risk / stale / fresh / active | draft counts + active-session count as above |
| "X min ago" (AI card) | newest notification timestamp |
| Search results | `dashboardSearch` LIKE over session names + match_no (D9 scope) |
| Bell dot | client localStorage only (not a server number) |
