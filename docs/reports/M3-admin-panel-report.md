# M3 — Super Admin Panel Report (Lane C)

## 1. Outcome (base commit, branch, counts)

| Item | Value |
|---|---|
| Base | `m1-multitenancy-foundation` tip `9b50f83` (brief said `4d45aa7`; the tip moved — it now includes Lane A's hardening commits. Per the brief's parallel-lane note, Lane A's hardening **is** the base and was built on, not merged). |
| Branch / worktree | `qasim/m3-admin` in `C:/Users/mianq/Projects/scrimlypro-m3` (port 3056, DB `scrimlypro_m3` on the shared PG 17.6 cluster at `127.0.0.1:54329`). |
| Commits | `m3(0)` … `m3(9)` — 11 atomic, unsquashed commits, gates green before each (two recorded gate lapses + corrections, §8). |
| Baseline | tests **460/460** (not 455 — the base tip includes Lane A's added tests), lint/tsc/build green **after** `m3(0)`, which fixes a pre-existing base lint error (§7). |
| Final | tests **520/520** (37 files) · `tsc --noEmit` clean · lint clean · production build green (all admin routes emitted) · `verify:secrets` OK · adversarial suites 60/60. |
| Deviation from base-tip state | `m3(0)`: `lib/auth/action-guard.ts` imported `getDb()` as a value — a violation of Lane A's own A3/C4 eslint perimeter that shipped on the base tip. Fixed exactly as the rule message prescribes (production path through `withUserDb`; `*ForTest` DI unchanged). **Integration merge point** — Lane A may land its own fix; the two are semantically identical. |

## 2. Schema & policies (0020 block, audit immutability proof)

Migration `0020_m3_admin_tables` (drizzle-kit output renamed into the Lane C `0020–0029` block; journal entry + `0020_snapshot.json` renamed/aligned; the stale `0003` NOT NULL diff the generator re-emitted was removed). Only `0020` was needed.

- **`audit_log`** — `id`, `actor_user_id`/`effective_user_id` (FK → `auth.users`), `action`, `target_type`, `target_id`, `metadata jsonb`, `ip_hash`, `created_at`.
  - RLS enabled + **FORCED**. Policies: `audit_insert_own` (insert, `with check (actor_user_id = auth.uid())`) and `audit_select_admin` (select, `using ((select role from profiles where id = auth.uid()) = 'admin')`).
  - **No update/delete policies exist for any role.** Immutability proof: `tests/rls/admin-tables.test.ts` asserts `UPDATE`/`DELETE` affect **zero rows under both user AND admin claims** and the row survives; a foreign-actor insert is rejected by WITH CHECK.
- **`feature_flags`** — `id`, `subject_type` (`user|org|global`), `subject_id`, `flag`, `value jsonb`, `updated_by`, `updated_at`; unique `(subject_type, subject_id, flag)`. RLS admin-only for select/insert/update/delete. The **`disabled` flag on a user is reserved** (§5).
- **`impersonation_sessions`** — `id`, `admin_user_id`, `target_user_id`, `target_email` (snapshot at start — the banner must render the target without a cross-tenant profiles read; deviation noted, additive column), `reason`, `expires_at`, `revoked_at`, `created_at`. RLS: select for involved parties (row admin / target) or any admin; insert requires `admin_user_id = auth.uid()` AND admin role; update admin-scoped; no delete policy.
- **Security-definer helpers** (the request path's only doors into admin data):
  - `is_user_disabled(uuid)` — kill-switch probe; EXECUTE revoked from public, granted to `authenticated`.
  - `audit_auth_event(action, metadata, ip_hash)` — auth-event sink; action whitelist enforced **in the function**; actor derived **only from claims** (`auth.uid()`, guarded by an `auth.users` EXISTS so a nil/placeholder sub stores NULL).
- Schema additions to `lib/db/schema.ts` are the three new tables only (gray zone per LANES-README; no existing table touched).

## 3. Activation runbook (SQL to grant/revoke admin, IMP_SECRET generation)

```sql
-- Grant admin (human superuser runs this on the project DB; there is NO UI —
-- by design, brief rule 4):
update profiles set role = 'admin' where id = '<user-uuid>';
-- Revoke:
update profiles set role = 'user'  where id = '<user-uuid>';
```

The M1 `guard_profile_role` trigger blocks any role change attempted under the
`authenticated` role (self-elevation), so the statement must run as the schema
owner/superuser — proven still-required by `tests/rls/admin-tables.test.ts`.

```bash
# IMP_SECRET (32 bytes) + AUDIT_SALT, one per environment:
openssl rand -hex 32   # -> IMP_SECRET   (impersonation cookie signing)
openssl rand -hex 32   # -> AUDIT_SALT   (audit ip_hash = sha256(ip + salt))
```

- `IMP_SECRET` is **production fail-closed**: without it, `impersonate/start`
  refuses and cookie validation never trusts anything — impersonation is
  simply unusable (same pattern as `APP_ORIGIN`, which is also documented as
  fail-closed in `.env.example`).
- `AUDIT_SALT` missing ⇒ audit rows carry no `ip_hash` (correlation data is
  dropped, never the action itself).

## 4. Admin surface inventory (routes + guards)

| Surface | Guard (all server-side, before any data access) |
|---|---|
| `app/admin/layout.tsx` | `requireAdmin()` — chrome 404s non-admins before rendering |
| `/admin` (dashboard) | `requireAdmin()` + layout; counters via admin-db; active-impersonations table + global stop |
| `/admin/tenants` | `requireAdmin()`; searchable list (email/id), usage counts, disable/enable + impersonate controls |
| `/admin/flags` | `requireAdmin()`; editor = audited server actions (`admin.flag.set/delete`) |
| `/admin/audit` | `requireAdmin()`; read-only filterable viewer |
| `POST /api/admin/tenants/disable` | `requireAdminApi()` → 404 uniformity incl. cross-origin; audited `admin.tenant.disable` |
| `POST /api/admin/tenants/enable` | `requireAdminApi()`; audited `admin.tenant.enable` |
| `POST /api/admin/impersonate/start` | `requireAdminApi()` (**real identity**); refuses double impersonation, self/admin/unknown targets; audited `admin.impersonation.start` |
| `POST /api/admin/impersonate/stop` | `requireAdminApi()`; cookie-holder mode (validates the **cookie**, not current identity) or real-admin global stop by row id; audited `admin.impersonation.stop` |
| `app/admin/flags/actions.ts` | `requireAdmin()` first line of each action |

Every guard failure = `notFound()` ⇒ Next's own 404 (page: standard not-found
UI; route handler: real 404 response) — indistinguishable from a missing
route. The architecture meta-test (`tests/architecture/guards.test.ts`) now
recognizes `requireAdmin` so drift is a CI failure.

## 5. Kill switch + flags semantics (fail-closed decisions documented)

- **Kill switch**: the reserved `feature_flags` row (`subject_type='user'`,
  `flag='disabled'`) — **presence = disabled**; `value` is metadata only
  (`reason`, `disabled_at`). Removal (enable) = delete the row.
- Checked in **`requireUser()` — the single choke point** — in both shared
  guards: `lib/auth/route-guard.ts` (every authed API route via
  `withTenantRoute`) ⇒ `403 {"error":"account_disabled"}` (no-store, no
  detail); `lib/auth/action-guard.ts` (every authed page/action) ⇒ redirect
  `/login?disabled=1`, where the login page renders a plain "Account
  disabled" notice. Proven on the real `/api/ocr` route and on the page guard
  (`tests/api/kill-switch.test.ts`, 11 cases incl. re-enable-works-again).
- **Fail-closed decision**: a missing flag row means **allowed** (explicit
  design — the flag marks disabled, it does not gate existence); a *present*
  `disabled` marker means locked out everywhere. The DB probe itself fails
  closed: `is_user_disabled()` errors (missing table/function) ⇒ the guard
  query throws ⇒ request denied/redirected, never silently allowed.
- The tenant request path cannot read `feature_flags` directly (admin-only
  RLS); the probe is a `security definer` function called through the
  caller's own RLS context — no service client in the tenant path.
- Disable/enable flows are audited with actor + effective + target ids and
  `sha256(ip + AUDIT_SALT)` (raw IPs never stored).
- **Deviation from brief §3 rule 3 vs §5**: §5 said pages redirect `/`;
  rule 3 (non-negotiable) says 404 — implemented **404 everywhere**
  (`requireAdmin` uses `notFound()`), recorded here as the stricter rule
  winning.

## 6. Impersonation design

- **Cookie contract**: `imp=<session id>.<hex HMAC-SHA256>`; key =
  `IMP_SECRET`; signature payload = `id|admin_user_id|target_user_id|expiry_ms`
  — all four read back from the `impersonation_sessions` **row** at
  validation time, so a cookie can never outlive or contradict the ledger.
  Cookie flags: HttpOnly, SameSite=Lax, Path=/, Max-Age 1800, Secure in
  production. 30-minute TTL, both in the row and the cookie.
- **Validation on every request** (`getEffectiveUser` in
  `lib/admin/impersonation.ts`, called by both guards): cookie parses → row
  exists → cookie holder == row admin (the browser must hold the admin's auth
  session) → holder's `profiles.role` is still `admin` → not revoked → not
  expired → timing-safe HMAC match. Any miss ⇒ **real identity** (the
  impersonation is treated as absent; nothing is cleared mid-render — the
  stop endpoint clears the cookie).
- **Real-vs-effective identity rules**: `getEffectiveUser` is used ONLY by
  the two tenant guards. `requireAdmin`/`requireAdminApi` and all
  `/api/auth/*` routes use `getAuthedUser` (REAL identity) — grep-verified:
  zero `getEffectiveUser` references under `app/api/auth/**` /
  `app/api/admin/**`. Consequences (all tested): a stolen cookie in a
  non-admin's browser is worthless; the target cannot reach `/admin`; the
  real admin keeps console access while impersonating; disabling the admin
  or revoking their role kills active impersonations on the next request.
- **Double impersonation** refused (`403 already_impersonating` — post-auth
  response to the verified admin); an *expired* cookie does not block a fresh
  start (it validates as absent).
- **Revocation**: banner "Exit impersonation" (cookie-holder stop), dashboard
  global stop (by row id, real admin), and expiry — all produce the same
  dead state; stopping is audited with both admin and target ids.
- **Banner**: server component (`components/admin/ImpersonationBanner`)
  mounted on the tenant surfaces (home + `app/sessions/layout.tsx`);
  validated against the ledger on every render; renders nothing for normal
  users.

## 7. Adversarial results (red→green evidence)

- `tests/rls/admin-tables.test.ts` (13 cases) — **red proof**: with migration
  `0020` stashed out of `db/migrations` (+journal/snapshot), the suite fails
  **13/13**; **green**: restored, 13/13 pass. Recorded in the m3(2) commit
  body.
- API-layer adversarial suites (mocked-identity seam, real throwaway
  Postgres, real guards/routes): `admin-guard` (9: 404-uniformity for
  unauth/non-admin/cross-origin, DB-driven role incl. instant revocation and
  ghost-id fail-closed, **live eslint canary** — trips outside app/admin,
  silent inside — runtime client-bundle guard, static import-graph check),
  `kill-switch` (11), `impersonation` (18: full cookie contract — expiry,
  revocation, forgery, row-tampering, stolen-cookie-worthless — start/stop
  authorization matrix, audit rows), `admin-audit-events` (9). Total
  adversarial: **60/60**.
- **Deviation from the commit plan**: the API-guard adversarial file landed in
  m3(3) (its subject, `requireAdmin`, does not exist before m3(3)) — still
  strictly *before the UI* as brief §6 requires.

## 8. Verification (commands, exit codes, test counts)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors |
| `npm run build` | ✓ compiled; all admin routes emitted (`/admin`, `/admin/tenants`, `/admin/flags`, `/admin/audit`, 4× `/api/admin/*`) |
| `npm test` | **520/520** (37 files) — baseline 460 + 60 adversarial |
| `npm run verify:secrets` | OK — no secret material in build output |
| Import graph (`grep -rl "lib/db/admin\|lib/admin/admin-db" app components lib`) | exactly 6 hits: 5 under `app/admin/**`/`app/api/admin/**`, 1 = `lib/admin/admin-db.ts` (the sole `lib/db/admin` importer) |
| Two gate lapses + corrections | m3(4) was committed with one lint error (`react/jsx-no-comment-textnodes` on the `//ADMIN` brand string); corrected in m3(4b) with an explicit rule note. `m3(8)` corrected a `verify:secrets` failure caused by a **pre-existing base comment** in `lib/db/admin.ts` spelling the service-role env var name (now embedded in emitted `.js.map`s); comment-only fix, recorded as a merge point. |

**Observed test-env flake** (not product): one full-suite run mid-stream
showed ~56 timeout failures and one earlier run a single timeout; the shared
local PG cluster saturates under full-parallel workers. Two consecutive full
runs after that were green (520/520); the focused adversarial suites are
deterministic.

## 9. Quality-agent findings

Independent quality-agent pass (10-point checklist): **PASS on all ten** —
no UI-hiding anywhere (layout + every page/action/route re-checks); 404
uniformity holds with cross-origin probes; audit immutability verified at
policy level AND by tests; kill switch is the single choke point and cannot
be skipped (no tenant-path file authorizes via `getAuthedUser` directly);
impersonation HMAC covers id|admin|target|expiry re-read from the row and is
validated on every request; expired/revoked/forged cookies are dead;
admin-db reachable only from `app/admin/**`/`app/api/admin/**`/`lib/admin`
(canary + graph); escalation guard intact with no code path writing
`profiles.role`; metrics queries parameterized and LIMITed; lane ownership
clean (45 files, every shared-file diff minimal and matching its documented
purpose). Test counts confirmed: 60/60 adversarial.

Findings (all addressed or accepted):
- [Low] dangling uncommitted journal-timestamp edit → dropped (m3(9)).
- [Nit] home-page JSX indentation after banner mount → fixed (m3(9)).
- [Info, accepted] stop-by-id on an already-revoked row returns
  `ok:true, revoked:false` (idempotent, still audited).
- [Info, accepted] targets can SELECT their own impersonation rows
  (deliberate policy: "they are entitled to know"; documented in 0020).
- [Info, accepted] OCR-call metric renders "not metered" (no persisted OCR
  usage table exists — honest placeholder, see §10).

## 10. Limitations + integration notes (M2 org-metric hooks, shared-file merge points)

- **Org-aware metrics (M2 hooks)**: `lib/admin/queries.ts` carries
  `// M3-INT: org-aware after M2 merge` markers; `feature_flags.subject_type`
  already accepts `'org'`. Per-org counters land where `sessions` gains
  `org_id`.
- **OCR metering**: OCR calls are not persisted anywhere in the base schema;
  the dashboard metric is `null` ("not metered") rather than a misleading 0.
  A usage table is M-next work.
- **Live impersonation round-trip in a browser**: not executable in this
  environment — local PG has no GoTrue (M1 shim mode; `NEXT_PUBLIC_SUPABASE_URL`
  points at a non-running stack), so real login cannot happen. The round-trip
  is proven at the seam level instead: start → row+cookie+audit, banner state
  from the validated ledger, effective identity = target on tenant surfaces,
  stop → revoked + cookie cleared + real identity restored, expiry honored
  (tests/api/impersonation.test.ts). A hosted-stack smoke test remains
  pre-merge manual work.
- **Shared-file merge points** (Lane A owns these files; my diffs are the
  documented minimal insertions):
  - `lib/auth/route-guard.ts` / `lib/auth/action-guard.ts` — kill-switch call
    + effective-identity swap (the single-choke-point design; if Lane A
    reshapes `requireUser`, these two insertions must survive).
  - `lib/auth/action-guard.ts` **also** carries m3(0) (pre-existing base lint
    fix) — on merge, prefer either fix, not both.
  - `app/api/auth/{login,signup,forgot-password,reset-password}/route.ts` —
    one import + one `auditAuthEvent(...)` line each (login/signup
    additionally destructure `data` from the existing provider call).
  - `app/login/page.tsx` (`?disabled=1` notice), `app/page.tsx` +
    `app/sessions/layout.tsx` (banner mounts), `lib/db/admin.ts`
    (comment-only), `tests/architecture/guards.test.ts` (`requireAdmin`
    marker), `tests/helpers/pg.ts` (additive `url` return), `.env.example`.
- **ESLint gray zone** (LANES-README: "C rebases after A"): my perimeter
  additions ban `lib/admin/**` + `lib/admin/admin-db` request-path-wide with
  sanctioned consumers `app/admin/**`, `lib/admin/**` internals,
  `components/admin/**` (identity hooks only) and the two guard files. If
  Lane A touches the same blocks, union the patterns — do not drop the
  `components/admin` or guard-file exceptions.
- **Merge order**: per LANES-README, Lane C rebases onto main after D and A
  (and B for org tables). The 0020 migration number block and journal are
  collision-free by construction; the only gray-zone files I touched are
  `lib/db/schema.ts` (additive tables) and `eslint.config.mjs` (additive
  blocks).

## 11. Post-review response (Lane AB critical review, flag-and-fix)

Verdict was **approved with conditions**; the conditions are integration-shaped.
Per-item disposition — what was fixed in THIS branch vs encoded as enforced
merge gates:

- **C-1 (P0, B×C seam)** — not executable in-lane (no `lib/orgs` in this tree;
  merging B here would violate lane protocol). **Shipped the merge gate
  instead**: `tests/api/org-guard-fold.test.ts` — in this tree it skips
  cleanly (guard file absent, 3/3 pass); the moment Lane B's
  `lib/orgs/route-guard.ts` lands it enforces (a) structurally that the copy
  carries no identity logic of its own (no `getAuthedUser` /
  `createServerSupabaseClient` imports; must delegate to
  `lib/auth/route-guard`), and (b) semantically through whatever
  `with*Route` wrapper B exports: disabled user → `403
  {"error":"account_disabled"}` and impersonating admin → handler receives
  the TARGET identity. It FAILS on B's unfolded copy and passes after the
  runbook's step-7 fold-in — exactly the review's red→green gate. The
  procedure is also written into `LANES-README.md` (new "Integration gates"
  section; see merge-point note below).
- **C-2 (P1, forked snapshot graph)** — reconciliation itself requires B+C
  merged (B is not in this tree). The 5-line procedure is now in
  `LANES-README.md` ("Integration gates" section) so Lanes D/E inherit it.
- **C-3 (wiring debt)** — banner-on-org-layout and OCR-meter→`usage_events`
  require B's tree; recorded as checklist items in `LANES-README.md`. The
  **org-level kill switch decision is now written down**: reserved-until-M4 —
  `subject_type='org'` is schema-accepted but probed by nothing; documented in
  the flags editor UI (`app/admin/flags/flag-form.tsx`) and here. (ERD/PLAN are
  Lane A files — the decision is recorded in C's surfaces instead; transpose
  to ERD/PLAN during the merge if desired.)
- **C-4 (cluster-saturation flake)** — integration-branch item (I-2); the
  in-lane mitigations already shipped are per-suite timeout bumps and the
  deterministic focused suites. Noted in `LANES-README.md`.
- **C-5 confirms**:
  - *Flags editor vs reserved flag*: **decided — the editor now REFUSES**
    `flag='disabled'` (`app/admin/flags/actions.ts`) so the Tenants console
    disable/enable API is the single audited path; test added
    (`admin-audit-events` suite, 10/10); UI text updated.
  - *Browser round-trip*: kept as a manual cut-over checklist item (§10);
    also listed in `LANES-README.md` integration gates.
  - *Auth-route merge point*: Lane A's per-email rate-limit edits and C's
    `auditAuthEvent` insertions are both additive in the same four files —
    resolvers must keep BOTH sides (already §10; restated here per review).
  - *m3(0) duplicate fix*: resolution recorded — C's fix wins by default if
    Lane A's tip still ships the violation.
  - *Meta-test naming*: union target is A's `tests/architecture/guards.test.ts`
    (C-extended with the `requireAdmin` marker) plus B's stand-in folded in —
    one walk, not three files. Recorded for the merge.
- **New merge point**: `LANES-README.md` is untracked in the main repo (the
  orchestrator's file); this branch now carries a tracked copy with the
  "Integration gates" section appended. At integration, union — the original
  content is unchanged, the section is append-only.
