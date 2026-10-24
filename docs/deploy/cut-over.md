# ScrimlyPro — Production Cut-Over Runbook

Standalone, ordered, checkable procedure for the first hosted deployment.
Expands M1 implementation report §9 into one document; every step has an
exact command and the expected observable. Work top-to-bottom — do not skip
steps. Steps marked **[AUTO]** are one command; **[MANUAL]** need a human and
a browser/phone.

Prerequisites on the operator machine:
- Node 25 (repo-documented), repository checked out at the merged `main` tip
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

3.1 **[AUTO]** Push migrations in order 0000→0003 (0003 enforces
    `sessions.user_id NOT NULL`). Either
    `supabase db push` after `supabase link`, or run each file of
    `db/migrations/*.sql` in numeric order in the SQL editor.
    The GoTrue-dependent conditional blocks in `0002` no-op on hosted
    (`auth` schema and `authenticated` role already exist there).
3.2 **[AUTO]** Assert the trigger exists:

    psql "<direct-dsn>" -tAc "select tgname from pg_trigger where tgname='on_auth_user_created';"

    Expected: exactly one row `on_auth_user_created`.
3.3 **[AUTO]** Assert the policy count:

    psql "<direct-dsn>" -tAc "select count(*) from pg_policies;"

    Expected: **≥ 27** (M1 report §6: 27 policies, all `to authenticated`,
    every insert/update/delete paired USING + WITH CHECK).

Observable: both commands print the expected values; anything less = STOP.

## 4. Pilot user + profile verification

4.1 **[MANUAL]** Dashboard → Authentication → create the pilot user
    (email + password, auto-confirm ON).
4.2 **[AUTO]** Verify the `handle_new_user` trigger created the profile:

    psql "<direct-dsn>" -c "select id, email, role from profiles where email='<pilot>';"

    Expected: one row, `role = user`. Missing row = trigger not installed →
    STOP, back to step 3.

## 5. Legacy data migration (only if migrating the local SQLite data)

5.1 **[AUTO]** Dry-run (prints per-table source→target→delta reconciliation,
    writes `.tmp/m1-pre-standings.json`):

    SUPABASE_DB_URL="<direct-dsn>" SUPABASE_PILOT_OWNER_EMAIL="<pilot>" node scripts/migrate-local-to-supabase.mjs

    Expected: `delta = 0` on every table, no target rows yet.
5.2 **[AUTO]** Apply (single transaction, idempotent `on conflict do nothing`,
    backfills `sessions.user_id`, enforces NOT NULL):

    SUPABASE_DB_URL="<direct-dsn>" SUPABASE_PILOT_OWNER_EMAIL="<pilot>" node scripts/migrate-local-to-supabase.mjs --apply
5.3 **[AUTO]** Golden check (recomputes standings for every migrated session
    with the real `computeStandings` and diffs legacy vs migrated):

    SUPABASE_DB_URL="<direct-dsn>" node scripts/golden-check.ts

    Expected: zero failures printed, exit 0.

Observable: golden check exit 0. Any mismatch = STOP before deploy.

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

## 10. First backup + restore test

10.1 **[AUTO]** First hosted backup:

     SUPABASE_DB_URL="<direct-dsn>" npm run db:backup

     Expected: `✔ backup written to backups/<ts>/`, manifest with table
     counts, exit 0. The connection string is never printed.
10.2 **[AUTO]** Prove the backup is restorable:

     SUPABASE_DB_URL="<direct-dsn>" npm run db:restore-test

     Expected: `RESTORE TEST PASS — N/N tables match the manifest`, throwaway
     `ops_restore_test_*` dropped, exit 0. An untested backup is a hope, not
     a plan — this step is mandatory before declaring cut-over complete.
10.3 **[MANUAL]** Schedule recurring `db:backup` (platform cron/scheduler)
     and a periodic `db:restore-test`; copy `backups/` off-host (it is
     gitignored and machine-local by design).

## 11. Rollback procedure

Trigger: verifier FAIL, golden-check mismatch after new data, or live
data-integrity incident.

11.1 **[AUTO]** Restore the previous good backup into the live project —
     NEVER with this repo's tooling into the live DSN (restore-test only
     ever targets throwaway DBs). On the host:

     pg_restore --clean --if-exists --no-owner \
       --dbname "<direct-dsn>" backups/<good-ts>/db.dump

     Expected: exit 0; then re-run `verify-production.sh` (step 8) and
     `db:restore-test` — both must pass.
11.2 **[MANUAL]** If the deploy itself is the problem: revert the hosting
     platform to the previous deployment (Vercel: *Instant Rollback* or
     `vercel rollback <previous-deployment>`), and/or revert DNS TTL to the
     previous origin. Expected observable: `/api/health` reports the
     previous app version and the verifier passes against it.
11.3 **[MANUAL]** Post-incident: re-run the manual tests of step 9 before
     re-opening traffic.

## 12. Kill-switch rehearsal (post-M3 — after Lane C merges)

12.1 **[MANUAL]** (Requires the M3 admin panel.) In the admin panel, disable
     a TEST tenant's feature flag; verify its users see the disabled state
     and the audit log row is written. Re-enable, verify restored.
     NOTE: cannot be rehearsed until M3 lands — do NOT attempt with SQL by
     hand; the feature-flag path is admin-panel-only by design.

---

## Cut-over sign-off

| # | Step | Status | Evidence |
|---|---|---|---|
| 1 | Hosted project created | | |
| 2 | Env matrix entered | | |
| 3 | Migrations + trigger + ≥27 policies | | |
| 4 | Pilot user + profile row | | |
| 5 | Dry-run → apply → golden-check exit 0 | | |
| 6 | `next >= 16.4` | | |
| 7 | Deploy + `/api/health` 200 | | |
| 8 | `verify-production.sh` 0 fail 0 skip | | |
| 9 | Manual: cross-device, cookies, timing ack | | |
| 10 | `db:backup` + `db:restore-test` pass | | |
| 11 | Rollback rehearsed (dry knowledge check) | | |
| 12 | Kill-switch rehearsal (post-M3) | | |

Signed: ______________  Date: ________
