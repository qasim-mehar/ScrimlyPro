# ScrimlyPro — Parallel Lane Orchestration (M-next wave)

Launch all 5 lanes simultaneously, each in a **separate conversation / agent session**. All lanes branch from the **completed, unmerged** M1 branch `m1-multitenancy-foundation` (tip `4d45aa7`). No lane merges to main by itself — merges are sequenced after all lanes finish.

## Lane map

| Lane | Branch | Worktree | Port | Database | Report |
|---|---|---|---|---|---|
| A — M1-HARDEN (review fixes + merge-prep) | `qasim/m1-hardening` | `../scrimlypro-m1h` | 3050 | `scrimlypro_m1h` | `docs/reports/M1H-hardening-report.md` |
| B — M2 ORGS (orgs, invites, quotas, share links) | `qasim/m2-orgs` | `../scrimlypro-m2` | 3054 | `scrimlypro_m2` | `docs/reports/M2-orgs-report.md` |
| C — M3 ADMIN (super admin panel) | `qasim/m3-admin` | `../scrimlypro-m3` | 3056 | `scrimlypro_m3` | `docs/reports/M3-admin-panel-report.md` |
| D — DEPS (Next ≥16.4 + audit triage) | `qasim/m4-deps` | `../scrimlypro-m4d` | 3052 | `scrimlypro_deps` | `docs/reports/M4D-deps-report.md` |
| E — OPS (cut-over automation + backups) | `qasim/m4-ops` | `../scrimlypro-m4e` | 3058 | `scrimlypro_ops` | `docs/reports/M4E-ops-report.md` |

## File ownership (conflict avoidance)

| Lane | Owns |
|---|---|
| A | `lib/auth/**`, `eslint.config.*`, `next.config.ts`, `app/dev/**`, `tests/security/**`, `scripts/reset-db.mjs`, `scripts/seed.mjs`, `scripts/verify-auth-matrix.sh`, `PLAN.md`, `ERD.md`, `lib/db/user.ts` (test-DI split), `lib/sessions/queries.ts` (signature fix only) |
| B | migrations `0010–0019`, org tables in `lib/db/schema.ts`, `lib/orgs/**`, `lib/share/**`, org/invite/share UI + routes, `lib/auth/public-paths.ts` additions |
| C | migrations `0020–0029`, `lib/admin/**`, `app/admin/**`, `audit_log` + `feature_flags` tables, impersonation, eslint admin allowlist |
| D | `package.json` + `package-lock.json` ONLY |
| E | NEW files only: `scripts/verify-production.sh`, `scripts/backup-db.mjs`, `scripts/restore-test.mjs`, `docs/deploy/**`, `app/api/health/route.ts` |

Gray zones (expected, mechanical): `lib/db/schema.ts` (B and C add different tables — C rebases after B), `eslint.config.*` (A and C add different rules — C rebases after A), drizzle journal (B and C append different entries — union on merge).

## Migration number blocks (prevents journal collisions)
- Lane B: `0010–0019` · Lane C: `0020–0029` · Lanes A/D/E: no new migrations.
- If `drizzle-kit generate` emits `0004_...`, rename the file AND its journal entry into your block before committing.

## Merge order (after all lanes report green)
1. **D** (deps — lands first so everyone else's final re-run is on the upgraded runtime)
2. **A** (hardening) → then execute A's integration runbook: commit sibling-lane work on main → integration branch → merge `m1-multitenancy-foundation` + `qasim/m1-hardening` → port sibling delta to async DB API → full gates → fast-forward main
3. **B** (rebase onto main, re-run gates, merge)
4. **C** (rebase onto main — picks up B's org tables for org-aware metrics if desired, re-run gates, merge)
5. **E** (rebase, re-run gates, merge) → then execute E's cut-over runbook against the hosted project.

## Shared environment facts (all lanes)
- Repo: `C:/Users/mianq/Projects/Scrimlypro` · M1 worktree: `C:/Users/mianq/Projects/scrimlypro-m1` (copy its `.env.local`, change DB name + port).
- Local PG: user-space PostgreSQL 17.6 at `127.0.0.1:54329` (portable binaries at `C:/Users/mianq/Projects/pg-embedded`; start procedure in M1 report §2). No Docker, no GoTrue — the migration `0002` auth shim + mocked identity seam are the established test patterns.
- Tests create throwaway `m1test_*` databases on the shared cluster — automatic cleanup; do NOT drop other lanes' databases.
- Node v25 non-LTS: keep using the documented `npm install --ignore-scripts` workaround.
- Main still has UNCOMMITTED sibling-lane work — leave it alone; only the user commits it (during step 2).

## Integration gates from the Lane C critical review (execute on the integration branch)

- **C-1 (P0, security-critical)**: after merging `qasim/m2-orgs`, fold
  `withOrgRoute` (`lib/orgs/route-guard.ts`) into the shared guard so org routes
  inherit the kill-switch probe + effective-identity swap; delete/delegate the
  copy. Gate: `tests/api/org-guard-fold.test.ts` (ships with `qasim/m3-admin`)
  — it must FAIL on B's unfolded copy and PASS after the fold-in.
- **C-2 (P1)**: after B+C merge the drizzle snapshot graph is forked (B's
  0010-0013 vs C's 0020 describe divergent worlds). Once, on the integration
  branch: 1) build a DB from the full migration chain; 2) run a throwaway
  `npx drizzle-kit generate`; 3) if the emitted SQL contains phantom org/admin
  tables, regenerate the latest snapshot from the live integrated schema and
  commit it; 4) delete the throwaway SQL; 5) re-run `npm run db:migrate` on a
  fresh DB to confirm a no-op.
- **C-3 wiring**: mount `ImpersonationBanner` in `app/orgs/layout.tsx` (and any
  Lane B surface outside `app/sessions/**`); wire the dashboard OCR metric to
  B's `usage_events`; the org-level kill switch
  (`feature_flags.subject_type='org'`) is RESERVED-UNTIL-M4 — schema-accepted,
  probed by nothing (decision recorded in Lane C's report SS5/SS11 and in the
  flags editor UI).
- **C-4**: land the Lane AB review's I-2 (worker-owned teardown with retry +
  `db:sweep-test` + maxWorkers cap) before the integration full-suite run.

## Drizzle snapshot reconciliation procedure (wave1(8) — inherit this)

The snapshot graph forked (B's snapshots lack admin tables; C's lack org
tables). Fixed at wave1(8); any future lane that adds migrations to a
forked graph must: (1) move db/migrations aside, (2) `npx drizzle-kit
generate` against an EMPTY migrations dir to mint a snapshot describing
the full integrated schema, (3) splice that snapshot in as the latest
`NNNN_snapshot.json` (set prevId to the previous snapshot's id; keep the
real journal + SQL files), (4) re-run `npx drizzle-kit generate` — the
diff must be EMPTY before committing.

## Wave 1 outcome (integrated)

All five lanes merged to `integration-wave-1` (then main) in the order
M1(+A) -> B -> C -> D -> E, history preserved, review gates applied as
atomic wave1(n) commits. Migration blocks consumed: 0010-0013 + 0014
(Lane B; 0014 is B's own review hardening) and 0020 (Lane C) — the
journal is the source of truth (see the snapshot procedure above).
