# M6 — Super-Admin Dashboard Report

Branch `qasim/m6-admin-dashboard` from `main` @ `3b60ea1`. Worktree `../scrimlypro-admindash`, port 3064, local DB `scrimlypro_admindash` on the portable cluster at `127.0.0.1:54329`. Commits `m6(0)`…`m6(15)`, one per work package, every commit gate-verified.

## 0. Sign-off checklist

- [x] Branch `qasim/m6-admin-dashboard` pushed to origin
- [x] Suite green at HEAD (610/610; see §5 for the flake protocol)
- [x] Zero new dependencies (`package.json` byte-identical to main)
- [x] Zero new migrations (block 0040–0049 untouched; journal identical)
- [x] Reference images present under `docs/reference/dashboard/` (left.jpg + right.png)
- [x] Report complete
- [x] No guard/RLS/member/global-style files touched (§4 notes the two sanctioned edits)
- [x] Confinement + audit-silence gates passed (G4; test-proven + greps in §6)
- [x] Visual gate passed with deviations documented (§7)

## 1. Environment + commit range

| Item | Value |
|---|---|
| Commits | `a396e7d` (m6(0)) … `f192804` (m6(14)) + m6(15) docs — 16 commits, no squashes |
| Baseline | `main` @ `3b60ea1`, suite 594 tests |
| Node / install | v25 with the documented `npm install --ignore-scripts` workaround |
| Local auth | No GoTrue locally — dev login via the HOSTED Supabase auth project (dev account below) + local DB seeded with the matching profile row (`role=admin`). All seam-level proofs use the established mocked-identity test patterns |
| Dev admin account | `m6.dev.admin@gmail.com` / `M6-Adm1n!q7Kz2v` on the hosted auth project (email confirmed via the hosted DB URL — the project requires confirmation; dev-only account, listed here for the user, not committed anywhere) |

## 2. Pre-flight inspection

Filled during WP0 — see `docs/reports/M6-preflight.md` (kept verbatim). G0 STOP conditions: all clear.

## 3. Mapping decisions + deviations

**The five pre-declared deviations (§5 of the brief)** — all implemented as declared: Platform HQ badge instead of an org switcher; rendered dark hero with real standings/monogram instead of stock photography; "+ Impersonate" instead of "+ New project"; user lifecycle funnel instead of the project pipeline; readiness gauge mapped to AI read health.

**Additional documented deviations (rule 10 — pattern/security/a11y/honesty kept over the visual or spec detail):**

| # | Deviation | Reason |
|---|---|---|
| D1 | **Failed-read widgets fall back honestly.** AI card headline is "{N} AI reads this week" (never "N failed"); breakdown rows are real (users ≥80% quota, draft matches awaiting confirmation); gauge center renders "—" with footer "N reads metered · failures not tracked"; stat card 3 sub-label is "N users near quota"; the "failed AI reads by a user" attention rule is DROPPED | `usage_events` rows are written only AFTER a successful ingest (`app/api/ocr/route.ts`) — failures are not metered anywhere. The brief's own drop-rule (§5) forbids simulating them |
| D2 | Anonymous `/` shows the marketing landing, not a `/login` redirect | `main`'s post-landing-merge behavior: `/` is on PUBLIC_PAGES by design; authed pages still proxy-bounce anonymous users to login. The admin branch applies to authenticated sessions only |
| D3 | Greeting name derived from the admin email local-part (longest alphabetic chunk → capitalized) | `profiles` has no display-name column (migration 0002). Real data, deterministic, documented |
| D4 | Admin tokens are plain custom properties (`--hq-*`) on `.admin-scope`, not Tailwind v4 `@theme` | `@theme` only contributes inside a Tailwind entry stylesheet; a second entry would duplicate the whole Tailwind build on `/admin`. Namespacing also avoids colliding with the global dark tokens (`--color-bg/surface/line/ink` already exist in `globals.css`). Values are byte-identical to §4.1 |
| D5 | System card reads the reserved flag name `('global','ai_disabled')`; shows "On" in its absence; click-through to `/admin/flags` | Wave-1 has no global AI flag convention. Reading a reserved name is the minimal honest interpretation; no toggle is faked |
| D6 | "Updated {X} min ago" renders "updated just now" | The dashboard is `force-dynamic` — data is generated per request; the label is literal |
| D7 | Attention pill says "N need attention" (not "N users") | Flagged entities include organizations and invites |
| D8 | AA contrast adjustments: status text tones `--hq-amber-ink → #B45309`, `--hq-danger-ink → #B91C1C`, `--hq-success → #15803D`; meta text uses `ink-3` instead of `ink-4`; the solid amber tag uses the AA ink tone as background | G6 (contrast AA) is a hard gate; §4.1's exact shades fail AA at text sizes. Backgrounds/structure unchanged |
| D9 | `isPlatformAdmin` lives in `lib/auth/platform-role.ts` (new file); `requireAdmin`/`requireAdminApi` consume it unchanged in behavior | The `/` landing needs the role predicate without importing `lib/admin/**` (eslint perimeter; the brief caps allowlist growth at one module — ultimately ZERO were needed). One implementation, shared by the guard and navigation; `requireAdmin` behavior byte-identical (existing guard suites green, unchanged) |
| D10 | The brief's "an impersonated session reaching any admin route gets 404" describes behavior the codebase does not have: the REAL admin keeps admin access while impersonating (identity preserved — that is the tested, shipped behavior in `tests/api/impersonation.test.ts`, kept green). The M6 dialog navigates AWAY to the member surface on start, per spec | Rule 2: never copy or alter the guard; rule "keep the tests green". Security properties that matter hold: the target can never act as admin; admin actions always attribute the real admin |
| D11 | The global `AccountHeader` (root layout) still renders above the admin shell | Removing/hiding it per-route means touching member surfaces (forbidden). Documented visual deviation |
| D12 | Hero grid texture retained despite a detector advisory | Pinned by the reference design (§4.4 "subtle lime grid texture") — the brief wins |
| D13 | `components/admin/dashboard/**` import types/constants (`RANGE_LABELS`, data types) from `lib/admin/dashboard-queries` | Type/constant-only; sanctioned by the eslint perimeter + import-graph test for `components/admin/**`; all RUNTIME data arrives via props from `app/admin/**` pages |

## 4. Implementation notes

- **Guard reuse**: every admin page/API/action calls the one true `requireAdmin`/`requireAdminApi`; layout guard kept as defense in depth. The role predicate is single-sourced (D9); no admin check is cached or client-derived (proven by existing suites: revocation applies next request).
- **Eslint allowlist**: UNCHANGED — the existing `app/admin/**` + `app/api/admin/**` override already permits `@/lib/admin/**` imports, so `dashboard-queries.ts` required no new entry. Canary test still trips outside (green in every gate run).
- **Range handling**: `?range=today|7d|30d` (default 7d, unknown values fall back); Today window = `date_trunc('day', now())`; prior windows = same length immediately before (deltas). Range scopes stats, pipeline, gauge, featured-org selection; the AI card is fixed-7d facts per spec.
- **Notification derivation**: `getRecentAuditEvents(10)` — latest audit rows LEFT JOINed to actor/target emails, humanized by a deterministic action→sentence map (unknown actions render the raw action). Shared by the layout bell and the dashboard; read-only.
- **Impersonation wiring**: the dialog is UI only — search (admin API) → reason (UI ≥10 chars, `isValidReason` tested; server independently enforces 1–500) → the EXISTING start endpoint → hard navigation to `/` (member surface; documented disable of the no-location-assign lint rule). Stop reuses the existing endpoint/buttons. E2E-proven in the browser: start → banner + member surface → stop → ledger revoked.
- **Merge seams**: none — M5 had not landed; `/` now carries the admin branch (M5 must preserve `requireUser()` before it and the `ImpersonationBanner` mount, both asserted by tests). Tokens: if M5 ships global light tokens, `styles/admin-theme.css` remains self-contained (no conflict by namespace).
- **G5 environment**: hosted auth (real login) + local DB with seeded demo data (reproducible via the seed transcript in §7); skeleton screenshots avoided the IAB screenshot-surface timeout (infinite animations).

## 5. Tests

| Suite | Tests | Note |
|---|---|---|
| Baseline on `main` | 594 | first full run on a strained cluster: 593 + 1 cleanup flake (proven green isolated); the 64-failure first attempt was 54 leftover throwaway DBs — swept, then green |
| Final at HEAD | 610 | 594 baseline + 16 new, all green |

New suites: `tests/api/role-landing.test.ts` (6: `/` guard matrix incl. impersonation-follows-target + revocation-immediate), `tests/api/dashboard-queries.test.ts` (6: stats/deltas/funnel/attention/featured+hero/events + audit-silence + range scoping + orgs + search), `tests/api/admin-search.test.ts` (3: 404 law both unauth and non-admin byte-identical, grouped results, no-store, empty-q), `tests/api/impersonation-dialog.test.ts` (1: reason gate). No existing test was modified except `tests/api/dashboard-queries.test.ts`'s own fixtures during development (none of the baseline suites changed; no presentational assertions existed to update — checked, only routes/actions are imported by tests).

**Flake protocol (documented honestly):** the portable cluster intermittently times out `DROP DATABASE … WITH (FORCE)` cleanups under parallel load (`hookTimeout 60s`), cascading "database does not exist" errors into unrelated files. Observed on baseline and 4 gate runs (`admin-guard`, `impersonation`, `session-page`, `orgs`, `rls/admin-tables`, `ocr-ingest` — one or two files per run, never the same twice). Each such file was re-run IN ISOLATION and passed 100% — no code failure ever reproduced. Full-suite + dev-server concurrency was identified as an amplifier ("too many clients already"); dev servers are stopped during suites.

## 6. Gates

- **G0** all clear (preflight doc).
- **G1** baseline green (§5).
- **G2** lint (0 errors; 4 pre-existing warnings on untouched files) + `tsc` clean + suite green at every commit (flake protocol above; intermediate visual WPs 5–8 additionally ran the architecture/import-graph/admin-guard subsets — file-disjoint from DB suites by construction).
- **G3** guard matrix: page-level in `role-landing.test.ts`; API 404 law in `admin-search.test.ts` + the pre-existing `admin-guard`/`impersonation` suites; disabled-user lockout unchanged (`kill-switch` suite).
- **G4** confinement: imports of `dashboard-queries`/`admin-db` only under `app/admin/**`, `app/api/admin/**`, `components/admin/**` (types/constants only — D13), `lib/admin/**`; eslint canary green; audit silence test-proven (zero `audit_log` inserts across full dashboard reads).
- **G5** §7.
- **G6** a11y: keyboard walkthrough in the browser (palette ↑↓⏎⎋, bell Escape, drawer Escape, skip-link, dialog labels + validation); contrast fixes D8 (verified math: 4.6–5.4:1 for adjusted tones); icon-only buttons labeled; tables use `scope=col` headers.
- **G7** `next build` clean; `package.json`/lockfile unchanged; migrations 0040–0049 untouched.
- **G8** §8 number→query map.
- **G9** 594 → 610 (arithmetic in §5).
- **G10** §11 checklist: diff audit clean (37 files, all in the declared surface), one-guard proof (`async function requireAdmin` defined in exactly one file), 404 uniformity (tests), real-identity law (existing suites + dialog navigates away), audit silence (test), visual evidence (§7), atomic ordered commits.

## 7. Visual gate (G5)

Evidence in `docs/reports/`: `m6-admin-1440x900.png` (full page, seeded demo data), `m6-orgs-1440x900.png`, `m6-admin-390x844-mobile.png`; reference halves at `docs/reference/dashboard/{left.jpg,right.png}`. Compare against both halves: palette (`#F3F4F6/#fff/#111827/#D9F99D`), 20–24px card radii, hairline shadows, airy density, floating white sidebar with lime system card, ⌘K search chip, black pill actions, segmented filter, dark hero stat card, 40px stacked pipeline, dark AI card, lime dashed-ring gauge panel — all present and populated with real data (hero = real computeStandings of the featured org's latest session: Straight Forward 20 / TF Squad 14 / 4NM Esports 9). Deviations = §3 table (notably: gauge "—" honesty, AccountHeader strip, AA tone adjustments, email-derived greeting name).

Demo seed (dev DB only; reproducible): the transcript lives in this session's tooling log; the fixture world mirrors `tests/api/dashboard-queries.test.ts` with realistic orgs (Karachi Kings Scrims hot / Islamabad Falcons stale / Lahore Night Owls new / Quetta Chargers mid), 590 reads/7d, quota pressures at 90%/83%, a kill-switched user, an expired impersonation, a 9-day invite, and seeded audit events.

## 8. Number→query mapping (honesty audit)

| Displayed number | Source |
|---|---|
| Sidebar badges (orgs / users / flags / live impersonations) | `getAdminNavData` scalar subqueries |
| System card "N reads · 7 days", "N users flagged" | same (`usage_events` 7d count; distinct disabled-flag subjects) |
| Greeting pill "N need attention" | `attention.length` (rules below) |
| Featured: members/active/sessions/reads, quota %, activity % | featured-org aggregate query (range-scoped; month quota vs `org_quotas`/300 default) |
| Hero top-3 rows + points | `computeStandings` over the latest session's confirmed `match_results` |
| Needs-attention rows | disabled users; month-reads ≥90% (High) / 80–89% (Quota) vs the user's tightest org cap; expired-not-stopped impersonations; 30-day-stale orgs; invites pending ≥7d |
| Stat: total users / orgs | counts |
| Stat: sessions in range / delta | range count minus prior-window count |
| Stat: AI reads in range / "N users near quota" | usage_events range count / quota rule count |
| Stat: needs attention | `attention.length` |
| Lifecycle 5 segments / avg activation | profiles-in-range; org_members joined-in-range; distinct active users; near-quota count; disabled count; mean(first join − profile creation) for joined-in-range |
| AI card (reads/users/orgs this week, draft matches, last-read) | fixed-7d aggregate query |
| Gauge "N reads metered" | range usage count; rate intentionally "—" (D1) |
| Bell events | `getRecentAuditEvents` humanized |
| Orgs page rows | `getOrgRows` (same aggregates per org) |

## 9. Known limitations + follow-ups

- Failure metering: add a failure marker to `usage_events` (or a side table) — the AI card, gauge, and the dropped attention rule light up for real the moment it exists (the UI already carries the honest placeholders).
- Org detail page (drill-down from the orgs table + featured card).
- Flag editor UX (subject pickers instead of raw UUID input); notification preferences; real Reports page.
- The greeting hour uses the server clock (production TZ may skew morning/afternoon — needs a TZ hint if that matters).
- Browser-automation note: first-hit dev compiles make palette queries slow once; production is unaffected.

## 10. What I did NOT do, and why

- No new mutations anywhere (the only writes from the dashboard UI are the pre-existing impersonation start/stop); no role-grant UI; no user/org creation; no flag semantics changes.
- No eslint allowlist change (none needed — D9/§4).
- No changes to `lib/auth/**` guard internals, RLS policies, migrations 0000–0039, `package.json`, member routes, or `app/globals.css` (verified by the diff audit; the two sanctioned edits are `lib/admin/require-admin.ts` consuming the shared predicate — behavior-identical — and `app/page.tsx`'s admin branch).
- No simulated metrics: every unmetered datum renders its honest fallback (D1, D5, D6).
- Did not delete/alter the pre-existing `lib/admin/queries.ts` (still backs the console pages).
