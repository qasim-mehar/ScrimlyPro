# M6 Pre-flight Evidence (WP0)

Branch `qasim/m6-admin-dashboard` from `main` @ `3b60ea1`. Worktree `../scrimlypro-admindash`, port 3064, local DB `scrimlypro_admindash` on `127.0.0.1:54329`.

## G0 STOP conditions — all clear

| Check | Verdict |
|---|---|
| M3 admin tables present | ✅ `audit_log`, `feature_flags`, `impersonation_sessions` in `lib/db/schema.ts` + migration `0020` |
| `requireAdmin`/`requireAdminApi` exist, single implementation | ✅ `lib/admin/require-admin.ts` only; proven by `tests/api/admin-guard.test.ts` + `tests/architecture/guards.test.ts` |
| Service-client confinement intact | ✅ `lib/admin/admin-db.ts` imported only inside `lib/admin/**` + `app/admin/**`/`app/api/admin/**` (eslint canary + import-graph test green on baseline) |
| Impersonation endpoints + banner present | ✅ `app/api/admin/impersonate/{start,stop}/route.ts`, `components/admin/ImpersonationBanner.tsx` |
| `main` suite green | ✅ verified on the branch before WP1 (see §G1 in final report; count recorded below when run) |

## Inspection table (§3)

| # | Inspect | Findings |
|---|---|---|
| 1 | Admin routes | `/admin` (dashboard), `/admin/tenants` (+`tenant-actions.tsx`), `/admin/flags` (+`actions.ts` server actions, `flag-form.tsx`), `/admin/audit`; layout `app/admin/layout.tsx` (guard + old dark chrome). APIs: `app/api/admin/impersonate/{start,stop}`, `app/api/admin/tenants/{disable,enable}` |
| 2 | Guard signatures | `requireAdmin(): Promise<AuthedUser>` (pages/actions; 404 via `notFound()`), `requireAdminApi(req): Promise<AuthedUser>` (adds `assertSameOrigin` first). Role read from `profiles` inside the request via `withUserDb` — never cookie/claim/client state, never cached |
| 3 | admin-db + eslint shape | `getAdminDb()` = drizzle over `getAdminSql()` (service connection, global singleton, `window` guard). **Key discovery:** the existing `app/admin/**` + `app/api/admin/**` eslint override already permits importing ANY `@/lib/admin/**` module — the new `lib/admin/dashboard-queries.ts` needs NO allowlist entry. Canary rule continues to trip everywhere else (proven by existing suite) |
| 4 | `profiles` | `id uuid pk, email text, role text default 'user', created_at timestamptz` (migration 0002). **No display-name column** → greeting humanizes the admin email local-part (documented mapping decision). Users live in `auth.users` (shim locally, GoTrue hosted); `profiles` auto-created by trigger |
| 5 | Organizations | `organizations(id, name, slug, created_by, created_at)`; `org_members(org_id, user_id, role owner\|admin\|member, joined_at)`; owner = `created_by` (+ `role='owner'` row); `org_quotas(org_id, max_sessions, monthly_ocr_calls)` defaults 100/300 |
| 6 | `usage_events` | `id, org_id, user_id, kind ('ocr' only), created_at`. **Row written ONLY after a successful ingest** (`app/api/ocr/route.ts`: "one usage row AFTER a successful ingest (failed attempts never [meter])"). No success/failure marker exists → failed-read rules DROPPED per §5 (never simulated); see deviation table in final report |
| 7 | Sessions/matches | `sessions(id, user_id creator, org_id, name, planned_matches 1–6, team_count 4–25, template_id, scoring_rules jsonb, status active\|completed, created_at)`; `matches(id, session_id, match_no, status draft\|confirmed, raw_squad_data, created_at, confirmed_at)`; `match_results(match_id, team_id, placement, kills, placement_points, players)`; `teams(session_id, name, logo_url)`. Standings are computed, never stored — `computeStandings(results, teams, rules)` from `lib/scoring/standings.ts` is reused for the featured-org hero |
| 8 | feature_flags | `(subject_type user\|org\|global, subject_id, flag, value jsonb)` unique triple; `('user','disabled')` reserved kill switch (`is_user_disabled()` SECURITY DEFINER). **No global AI flag convention exists in code** → system card reads a reserved name `('global','ai_disabled')` if present; absent → "On" (honest default, click-through to /admin/flags, not a fake toggle) |
| 9 | Impersonation contract | `POST /api/admin/impersonate/start {targetUserId, reason}` → `{ok:true}` + signed HttpOnly cookie `imp`, 30-min expiry; refuses double-impersonation, self, admin targets, unknown ids; audited `admin.impersonation.start`. `POST /api/admin/impersonate/stop` (cookie or `{impersonationId}`) → `{ok, revoked}`; audited `admin.impersonation.stop`. Banner = server component reading the validated ledger |
| 10 | Audit vocabulary | From code (none in dev seed): `auth.login/signup/forgot/reset`, `admin.impersonation.start/stop`, `admin.tenant.disable/enable`, `admin.flag.set/delete`. These drive the notification humanizer |
| 11 | Fonts/icons | **Inter already global**: root layout loads `next/font/google` Inter as `--font-inter` (plus Inter Tight/Lexend) — admin theme consumes the variable; zero font code added. No icon library → inline SVGs (lucide-style outline), zero new deps |
| 12 | Baseline test count | Recorded at G1 in the final report |

## Environment decisions

- `.env.local` in the worktree: `SUPABASE_DB_URL` → `postgresql://postgres:…@127.0.0.1:54329/scrimlypro_admindash`; hosted Supabase auth URL/keys kept (real login possible for the visual gate; local DB holds the seeded demo data).
- Tests reuse the shared `tests/helpers/pg.ts` throwaway pattern (`m1test_*` prefix — matches the sweep script's `/^m\d+test_/`; per-file prefixes are cosmetic, hygiene identical).
- Reference images committed at `docs/reference/dashboard/left.jpg` + `right.png` (M5 had not landed; no duplicates existed).
