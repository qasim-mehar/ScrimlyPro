# ScrimlyPro — Production Cut-Over Runbook

Standalone, ordered, checkable procedure for the first hosted deployment.
Expands M1 implementation report §9 into one document; every step has an
exact command and the expected observable. Work top-to-bottom — do not skip
steps. Steps marked **[AUTO]** are one command; **[MANUAL]** need a human and
a browser/phone.

Prerequisites on the operator machine:
- Node 22 LTS (dev/CI has also run on Node 25 with the documented
  better-sqlite3 `--ignore-scripts` workaround), repository checked out at
  the merged `main` tip
  (this runbook assumes Lane E's tooling is merged: `npm run db:backup`,
  `npm run db:restore-test`, `scripts/verify-production.sh`).
- PostgreSQL client binaries (`pg_dump`, `pg_restore`) available; default
  path `C:/Users/mianq/Projects/pg-embedded/pgsql/bin`, override with
  `PG_BIN_DIR` if yours differ.
- `openssl` or a password manager for generating the service-role key store.

Merge-order dependency (hard prerequisite): **Lane D must land first** — the
deployment runs `next ≥ 16.4` (M1 report §8.6: baseline `next` 16.3.4 carries
a critical audit finding in an unused surface; Lane D's upgrade is the fix).
Do not cut over from a tree that lacks the deps lane.

**This runbook targets the INTEGRATED tree** (M1 + Lanes A/B/C/D/E merged,
per the wave's runbook v3 merge order: D → A → B → C → E). Steps 3, 5 and 12
assume the merged schema (org tables from Lane B, admin/feature-flag tables
from Lane C). Before touching the hosted console, rehearse the full
sequence end-to-end on a local scratch database (fresh DB → migrate to head
→ legacy `--apply` → B's 0011 org backfill → golden check → counts →
`db:backup` → `db:restore-test`); the rehearsal is also where the exact
`pg_policies` floor is reconciled and where the legacy script's
auth-user provisioning path (service-role insert vs GoTrue invites — never
live-tested, M1 §8.4) gets its first real exercise.

---

## 1. Hosted project creation

1.1 **[MANUAL]** Create the hosted Supabase project (region nearest users).
1.2 **[MANUAL]** From the dashboard, note:
    - Project URL (`https://<ref>.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
    - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - service-role key (SERVER-ONLY, never in the client bundle)
    - pooled connection string (port 6543 / pooler host) → `SUPABASE_DB_URL`
1.3 **[MANUAL]** In the dashboard, note the direct (port 5432) connection
    string too — migrations and the pg-based tools run over the direct one.

Observable: four values recorded in the secret store, nothing committed.

## 2. Environment matrix (which var, where it comes from, where it lives)

| Variable | Source | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Step 1.2 | exposed to browser (by design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 1.2 | exposed to browser (by design) |
| `SUPABASE_DB_URL` | Step 1.3 (direct, for tools) | **server-only**; never referenced client-side; the `postgres` pool and the backup tooling read it |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 1.2 | **server-only**; used by `lib/db/admin.ts`; bypasses RLS |
| `GEMINI_API_KEY` | Google AI Studio | **server-only**; OCR route |
| `APP_ORIGIN` | the public site origin (e.g. `https://scrimlypro.example.com`) | **server-only**; authoritative origin for emailed recovery links (M1 §8.7 — forwarded headers are NOT trusted for link origins) |
| `TRUST_PROXY` | set per hosting platform | server-only; enables proxy-set `x-forwarded-for` attribution for the rate limiter (M1 §8.3) |

2.1 **[MANUAL]** Enter every variable in the hosting platform's encrypted
    env store. Never write `.env*` files on the server; never commit them.

Observable: `grep -r "SUPABASE_SERVICE_ROLE_KEY\|SUPABASE_DB_URL" app components lib --include=*.ts*` shows imports only from `lib/db/*` (server modules).

## 3. Schema push + post-conditions

3.1 **[AUTO]** Push the FULL migration chain in order 0000→latest
    (`supabase db push` after `supabase link`, or run each file of
    `db/migrations/*.sql` in numeric order in the SQL editor).
    The GoTrue-dependent conditional blocks in `0002` no-op on hosted
    (`auth` schema and `authenticated` role already exist there). On the
    integrated tree the exact chain is **0000–0003 (M1), 0010–0014 (Lane B
    orgs + the 0014 quota/role hardening), 0020 (Lane C admin tables)** —
    ten files; `db/migrations/meta/_journal.json` is the source of truth.
3.2 **[AUTO]** Assert the trigger exists:

    psql "<direct-dsn>" -tAc "select tgname from pg_trigger where tgname='on_auth_user_created';"

    Expected: exactly one row `on_auth_user_created`.
3.3 **[AUTO]** Assert the policy count:

    psql "<direct-dsn>" -tAc "select count(*) from pg_policies;"

    Expected: **≥ 55** on the integrated tree — the exact count measured at
    the wave-1 local rehearsal (M1's 27 + Lane B's org/share/usage policies
    + Lane C's admin policies; the 0014 hardening REPLACES several 0010
    policies rather than adding). M1-only trees have ≥ 27. A count below
    the floor means part of the chain did not apply — STOP.
3.4 **[AUTO]** Assert the integrated tables exist:

    psql "<direct-dsn>" -tAc "select table_name from information_schema.tables where table_schema='public' order by 1;"

    Expected: the 7 M1 tables PLUS Lane B's org/invite/share tables and
    Lane C's `audit_log`/`feature_flags`. Any missing table = STOP.

Observable: all three assertions print the expected values; anything less = STOP.

## 4. Pilot user + profile verification

4.1 **[MANUAL]** Dashboard → Authentication → create the pilot user
    (email + password, auto-confirm ON).
4.2 **[AUTO]** Verify the `handle_new_user` trigger created the profile:

    psql "<direct-dsn>" -c "select id, email, role from profiles where email='<pilot>';"

    Expected: one row, `role = user`. Missing row = trigger not installed →
    STOP, back to step 3.

## 5. Legacy data migration (only if migrating the local SQLite data)

**Order matters (E-2):** `migrate-local-to-supabase.mjs` is M1-era — it
inserts `sessions` rows directly. On the integrated schema `sessions.org_id`
is NOT NULL (Lane B), so the legacy migration MUST run against the 0000–0003
schema, and Lane B's `0011` backfill (creates one Personal org per user,
stamps every session) then assigns orgs to the migrated rows. Never "fix"
a failing `--apply` with NULL-busters at cut-over — the sequence below is
the fix.

5.1 **[AUTO]** Push ONLY 0000–0003 (hold back 0010+ until 5.3 — the legacy
    script predates `org_id`).
5.2 **[AUTO]** Dry-run (prints per-table source→target→delta reconciliation,
    writes `.tmp/m1-pre-standings.json`):

    SUPABASE_DB_URL="<direct-dsn>" SUPABASE_PILOT_OWNER_EMAIL="<pilot>" node scripts/migrate-local-to-supabase.mjs

    Expected: `delta = 0` on every table, no target rows yet. While here,
    confirm HOW the script provisions the pilot's `auth.users` row on
    hosted (direct service-role insert vs GoTrue invite) — this path was
    never live-tested; if it needs a dashboard-created user, do step 4
    before this step and record the finding.
5.3 **[AUTO]** Apply (single transaction, idempotent `on conflict do nothing`,
    backfills `sessions.user_id`, enforces NOT NULL):

    SUPABASE_DB_URL="<direct-dsn>" SUPABASE_PILOT_OWNER_EMAIL="<pilot>" node scripts/migrate-local-to-supabase.mjs --apply
5.4 **[AUTO]** Push the REMAINING chain (0010→latest). Lane B's `0011`
    backfill creates the pilot's Personal org and stamps every migrated
    session with `org_id` — verify:

    psql "<direct-dsn>" -tAc "select count(*) from sessions where org_id is null;"

    Expected: `0`.
5.5 **[AUTO]** Golden check (recomputes standings for every migrated session
    with the real `computeStandings` and diffs legacy vs migrated):

    SUPABASE_DB_URL="<direct-dsn>" node scripts/golden-check.ts

    Expected: zero failures printed, exit 0.
5.6 **[AUTO]** Row-count reconciliation vs the dry-run table (5.2) — every
    target count must equal the source count from the dry run.

Observable: golden check exit 0, zero NULL org_ids, counts reconciled. Any
mismatch = STOP before deploy.

## 6. Dependency gate (Lane D)

6.1 **[AUTO]** Confirm the deployed tree has the upgrade:

    node -e "console.log(require('./package.json').dependencies.next)"

    Expected: `>= 16.4`. If it prints `16.3.4`, Lane D has not merged — STOP
    (merge-order dependency, see header).

## 7. Deploy

7.1 **[AUTO]** `npm run build && npm run verify:secrets` on the CI/deploy box.
    Expected: build succeeds; secret scan exits 0 (no DSNs/keys in the
    client bundle).
7.2 **[MANUAL]** Deploy (platform-specific: `vercel deploy --prod` or
    equivalent), with the env matrix from step 2 attached.
7.3 **[AUTO]** Smoke:

    curl -s https://<site>/api/health

    Expected: `{"status":"ok","version":"<package.json version>"}` with
    `Cache-Control: no-store` — 200 within seconds of going live.

## 8. Automated verification — full verifier run

8.1 **[AUTO]** Run the production verifier WITH two real accounts
    (create the attacker account in the dashboard first; both must be
    confirmed users — this exercises the live GoTrue path that was never
    reachable locally, M1 §8.4):

    BASE_URL="https://<site>" \
    APP_ORIGIN="https://<site>" \
    OWNER_EMAIL="<pilot>"  OWNER_PASSWORD="..." \
    ATTACKER_EMAIL="<attacker>" ATTACKER_PASSWORD="..." \
    bash scripts/verify-production.sh

    Expected: `Verifier result: N pass, 0 fail, 0 skip`, exit 0. Every
    authenticated row must be a real PASS here — SKIP rows mean the
    credentials were not supplied and the run does not count as cut-over
    evidence. FAIL rows = STOP (the script exits 1).
8.2 **[AUTO]** Re-run the M1 matrix for its env-specific rows:

    BASE_URL="https://<site>" OWNER_COOKIE="..." ATTACKER_COOKIE="..." \
      bash scripts/verify-auth-matrix.sh

    Expected: 0 fail, exit 0.

## 9. Manual tests automation cannot cover

9.1 **[MANUAL] Cross-device email confirmation.** Sign up with a fresh email
    on the desktop; open the emailed confirmation link on a phone.
    Expected: the phone lands on a friendly "you can log in now" path
    (the `/auth/callback` → `/login` flow), NOT a raw error page. The PKCE
    exchange is browser-bound; a code opened on a different device can fail
    exchange — the observable must still be a *friendly* redirect, never a
    stack/blank page.
9.2 **[MANUAL] Live cookie inspection.** In a real browser (DevTools →
    Application → Cookies) after login, verify the `sb-…-auth-token` cookie:
    `HttpOnly` ✓, `SameSite=Lax` ✓, `Secure` ✓ (HTTPS host), and that it is
    cleared after logout. (The verifier asserts these from the response
    headers; this step confirms them in a real cookie jar on a real device.)
9.3 **[MANUAL] Timing-enumeration caveat acknowledgment.** Confirm the team
    has read M1 §8.1: login/signup copy is enumeration-safe (byte-identical
    for unknown-user and wrong-password) but *response timing* still differs
    slightly — a residual known limitation, deferred. Record the
    acknowledgment (who/when) in the cut-over log. Nothing to run.

9.4 **[MANUAL] Browser impersonation round-trip (M3).** In the admin
    console, start impersonating a TEST tenant user (reason recorded — it
    lands in `audit_log`); confirm in a real browser that every page shows
    the impersonation banner with the target identity, that the target's
    data renders (effective identity, not the admin's), and that Stop
    impersonation restores the admin session. Then verify the audit log
    page lists start AND stop events. The org surface (`/orgs`,
    `/orgs/[id]`) must show the banner too (wave1(9) mounts).
9.5 **[MANUAL] Residual-audit acknowledgment.** Confirm the team has read
    the wave-1 security posture: 4 moderate npm-audit findings remain
    (development-chain only, justified in the M4D report), `drizzle-kit`
    is a dev-only dependency, and the residual limitations recorded in the
    M2/M3 reports (in-memory share limiter, timing-enumeration caveat
    9.3). Record the acknowledgment (who/when) in the cut-over log.
    Nothing to run.

## 10. First backup + restore test

10.1 **[AUTO]** First hosted backup:

     SUPABASE_DB_URL="<direct-dsn>" npm run db:backup

     Expected: `✔ backup written to backups/<ts>/`, manifest with table
     counts + per-session standings digests, exit 0. The connection string
     is never printed. Table enumeration is dynamic
     (`information_schema`, `public` schema only) — new tables from any lane
     are covered automatically, never by a hardcoded list.
10.2 **[AUTO]** Prove the backup is restorable:

     SUPABASE_DB_URL="<direct-dsn>" npm run db:restore-test

     Expected: `RESTORE TEST PASS — N/N tables match the manifest, standings
     identical for M/M sessions`, throwaway `ops_restore_test_*` dropped,
     exit 0. An untested backup is a hope, not a plan — this step is
     mandatory before declaring cut-over complete.
10.3 **[MANUAL]** Schedule recurring `db:backup` (platform cron/scheduler)
     and a periodic `db:restore-test`; copy `backups/` off-host (it is
     gitignored and machine-local by design).
10.4 **[MANUAL] Backup boundary sign-off (E-1).** The dump covers the
     `public` app schema ONLY — it does **NOT** contain user accounts
     (`auth.users`/identities, incl. credential hashes), auth sessions, or
     Storage objects. Restoring it after a disaster brings the app data
     back with every login gone. Decision (recorded): rely on the Supabase
     platform's own backups for the auth schema (Pro plan daily backups —
     verify the plan tier at step 1); for pilot scale, accept the
     re-invite procedure (users re-sign-up or password-reset via the
     hosted dashboard) as the fallback. Do NOT dump the auth schema into
     `backups/` unencrypted — it is credential material. Sign below.

## 11. Rollback procedure

Trigger: verifier FAIL, golden-check mismatch after new data, or live
data-integrity incident.

11.1 **[MANUAL]** Quiesce first: put the app in maintenance mode / stop
     traffic (platform pause or deployment lock). A `pg_restore --clean`
     against a live serving app is a corruption window — never restore
     under load.
11.2 **[AUTO]** Restore the previous good backup into the live project —
     NEVER with this repo's tooling into the live DSN (restore-test only
     ever targets throwaway DBs). On the host:

     pg_restore --clean --if-exists --no-owner \
       --dbname "<direct-dsn>" backups/<good-ts>/db.dump

     Expected: exit 0; then re-run `verify-production.sh` (step 8) and
     `db:restore-test` — both must pass.
11.3 **[AUTO]** Re-provision what the dump does NOT contain (E-1 boundary):
     user accounts come from the platform backup or the re-invite
     procedure (10.4); Storage objects from the platform backup.
11.4 **[MANUAL]** If the deploy itself is the problem: revert the hosting
     platform to the previous deployment (Vercel: *Instant Rollback* or
     `vercel rollback <previous-deployment>`), and/or revert DNS TTL to the
     previous origin. Expected observable: `/api/health` reports the
     previous app version and the verifier passes against it.
11.5 **[MANUAL]** Resume traffic (lift maintenance mode), then re-run the
     manual tests of step 9 before re-opening signups.

## 12. Kill-switch rehearsal

12.1 **[MANUAL]** In the M3 admin panel (merged before this lane per the
     wave's merge order — this is an in-sequence step, not deferred):
     disable a TEST tenant's feature flag / disable the test user; verify
     the tenant's users see the disabled state and the audit log row is
     written. Re-enable, verify restored.
     NOTE: never attempt this with hand SQL — the feature-flag path is
     admin-panel-only by design.

---

## Post-integration verifier extension (E-4 — add when Lane B merges)

The verifier predates the org/share-link surface; after Lane B merges,
extend the authenticated block of `scripts/verify-production.sh` (it already
signs in an owner and scrapes a session id) with a share-link row:
create a share link → `GET` the public share URL → assert 200 +
`Cache-Control: no-store` + the `noindex` meta + zero-PII markers (no `@`
emails, no bare uuid patterns in the body) → revoke → `GET` again → 404.
This converts the pending manual A-c3 check into an automated cut-over gate;
the same pattern covers the invite page.

---

## Cut-over sign-off

| # | Step | Status | Evidence |
|---|---|---|---|
| 1 | Hosted project created (plan tier noted — auth-schema backups, step 10.4) | | |
| 2 | Env matrix entered | | |
| 3 | Full migration chain + trigger + policies ≥ 58 + integrated tables | | |
| 4 | Pilot user + profile row | | |
| 5 | Dry-run → apply → 0010+ push (orgs stamped) → golden-check exit 0 → counts | | |
| 6 | `next >= 16.4` | | |
| 7 | Deploy + `/api/health` 200 | | |
| 8 | `verify-production.sh` 0 fail 0 skip | | |
| 9 | Manual: cross-device, cookies, timing ack | | |
| 10 | `db:backup` + `db:restore-test` pass + **backup-boundary acknowledgment (10.4)** | | |
| 11 | Rollback rehearsed (maintenance-mode → restore → re-provision → resume) | | |
| 12 | Kill-switch rehearsal (admin panel, in-sequence) | | |

Signed: ______________  Date: ________
