# M5 — Member Dashboard: Implementation Report

Lane: `qasim/m5-dashboard` · worktree `../scrimlypro-dash` · port 3062 · DB `scrimlypro_dash`
Status: **IN PROGRESS** — this file is updated per work package; final sign-off at WP14.

---

## 0. Sign-off checklist

- [ ] Branch `qasim/m5-dashboard` pushed
- [ ] Suite green at HEAD (count stated in §5)
- [ ] Zero new deps / zero new migrations
- [ ] Reference images committed under `docs/reference/dashboard/`
- [ ] Report complete
- [ ] No guard / RLS / admin files touched
- [ ] Visual gate passed, deviations documented (§7)

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

_Filled per WP as decisions land; final table at WP14._

## 4. Implementation notes

_Filled per WP._

## 5. Tests

- Baseline attempt 1 (WP0): 592/594 — 2 failures in one file, `PostgresError: database "m1test_8888_mvnxh21u_dags8frl" does not exist` (infra flake class, no assertion red).
- Baseline attempt 2 (WP0, full log kept): **594/594 passed** (`npm test` exit 0) — the attempt-1 failures confirmed as the documented Windows parallel-cleanup flake, not code red. **G1 cleared; baseline = 594.**
- Worktree pre-suite gates: `db:migrate` OK on `scrimlypro_dash`; `db:sweep-test` (0 leftovers); `tsc --noEmit` clean; `eslint .` 0 errors / 4 pre-existing warnings.

## 6. Gates G0–G10

_Pending._

## 7. Visual gate

_Pending._

## 8. Number → query mapping (honesty audit)

_Pending._

## 9. Known limitations + follow-ups

_Pending._

## 10. What I did NOT do (and why)

_Pending._
