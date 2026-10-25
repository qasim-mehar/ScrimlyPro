# M4D — Dependency Upgrades & Audit Triage Report

Lane D (DEPS) · branch `qasim/m4-deps` · worktree `../scrimlypro-m4d` · port 3052 · DB `scrimlypro_deps`
Owned files touched: `package.json`, `package-lock.json` (+ this report). Nothing else.

## 1. Outcome (before/after version table)

| Package | Before | After | Note |
|---|---|---|---|
| `next` | 16.3.4 (exact) | **16.4.3** (exact) | latest stable 16.x — kills the critical; stays on 16.x per lane bounds |
| `eslint-config-next` | 16.3.4 (exact) | **16.4.3** (exact) | kept in lockstep with `next` |
| `drizzle-orm` | 0.45.2 | **0.45.4** | patch/minor within 0.x |
| `drizzle-kit` | 0.31.10 | **0.31.11** | patch |
| `vitest` | 4.1.11 | **4.1.12** | patch — clears `@vitest/mocker` moderate |
| `@supabase/supabase-js` | 2.118.0 | 2.118.0 | already latest 2.x — no change available |
| `@supabase/ssr` | 0.12.7 | 0.12.7 | already latest |
| `postgres` | 3.4.9 | 3.4.9 | already latest 3.x |
| `better-sqlite3` | 13.0.3 | 13.0.3 | pinned per rules (devDep, migration script only) |
| `react` / `react-dom` | 19.2.8 | 19.2.8 | untouched — satisfies next 16.4.3 peer `^19.0.0` |
| Transitive (via `npm audit fix`) | — | sharp, source-map-js, vite, zod, brace-expansion, minimatch family bumped to patched versions | all non-breaking patch/minor; zero new packages added |

**Audit: 12 findings (6 moderate, 5 high, 1 critical) → 4 moderate, 0 high, 0 critical. Production-only audit (`npm audit --omit=dev`): 0 findings.**

Base-branch note: the brief named base tip `4d45aa7`; the actual `m1-multitenancy-foundation` tip is `9b50f83` (the M1 hardening pass, `aada109`, was committed onto the foundation branch after the brief was written; `4d45aa7` is a verified ancestor). The branch was created from the branch tip as instructed. Consequence: the true test baseline is **460** (not the brief's stale 455) — the delta is the hardening commits' new tests.

## 2. Audit before/after (every finding: fixed / justified / blocked)

**Before (verbatim summary):** `12 vulnerabilities (6 moderate, 5 high, 1 critical)`.

| # | Finding | Severity | Disposition |
|---|---|---|---|
| 1 | `next 16.0.0–16.4.0` — 11 advisories incl. **critical** RCE in `next/og` ImageResponse (GHSA-vcvr-r3jv-pc5j), plus cache-poisoning/SSRF/DoS/information-disclosure set (GHSA-3w37-wq28-93x7, 4jqv-mc3x-m676, 39w2-rjm5-chcv, f87g-xv8r-7p7x, mcj8-r9mp-w47p, cjq9-62q9-8jv4, 2464-fhr4-w9xw, p3m5-59mp-jv5r, h694-7cp9-m8p3, 673q-mjm6-r5xr) | 1 critical + highs | **FIXED** — `next@16.4.3` (in bounds, latest 16.x) |
| 2 | `sharp <0.35.5` — librsvg CVE-2026-96889 (GHSA-wq5f-xc86-pv6w) | high | **FIXED** — `npm audit fix` (non-breaking) |
| 3 | `source-map-js ≤1.2.1` — event-loop DoS (GHSA-68fv-2mgg-jv7q) | high | **FIXED** — `npm audit fix` |
| 4 | `vite 8.2.0–8.2.2` — 6 advisories incl. launch-editor command execution (via vitest devDep chain) | high | **FIXED** — `npm audit fix` |
| 5 | `zod <4.6.6` — memory exhaustion (GHSA-mrhx-c7xc-m3w5) | high | **FIXED** — `npm audit fix` |
| 6 | `brace-expansion` — 3 quadratic/recursive DoS advisories (GHSA-q2hr-2g5m-vwhr, qhr7-859c-m2p7, 6j4f-fj2g-mc7p) | high | **FIXED** — `npm audit fix` |
| 7 | `@vitest/mocker ≤4.1.11` — code injection via manual mock registration (GHSA-qxg6-89mg-rqv8, xp26-3454-mjgp) | moderate | **FIXED** — `vitest@4.1.12` (patch, in bounds) |
| 8 | `esbuild ≤0.24.2` (GHSA-67mh-4wv8-2f99) via `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils` | moderate | **JUSTIFIED (blocked in-bounds)** — see below |

**Finding 8 justification:** npm's only offered fix is `drizzle-kit@0.18.1`, which npm itself flags as a breaking change (a 13-minor *downgrade* from 0.31.11, out of bounds for this lane). The vulnerable `esbuild` 0.18.20 exists only at `node_modules/@esbuild-kit/core-utils/node_modules/esbuild` — a dev-only path used by the drizzle-kit migration-authoring CLI. The advisory concerns esbuild's **development server** (`--serve`) allowing cross-origin reads; this repo never runs drizzle-kit as a server, and drizzle-kit is not part of any runtime or build output (`npm audit --omit=dev` = 0 findings). Unlocked by: a future drizzle-kit major that drops the `@esbuild-kit` loader stack (out-of-bounds this lane).

## 3. Gate evidence (commands, exit codes, test counts — including npm ci proof)

| Gate | Baseline (before) | After next 16.4.3 | After all bumps | After `npm ci` (clean install) |
|---|---|---|---|---|
| `npm run lint` | 1 error (pre-existing, see below) | same 1 error | same 1 error | same 1 error |
| `npx tsc --noEmit` | clean | clean | clean | clean |
| `npm run build` | exit 0 | exit 0 | exit 0 | exit 0 |
| `npm test` | **460/460** (32 files) | **460/460** | **460/460** | **460/460** |
| `npm audit` | 12 (1 critical) | — | 4 moderate | 4 moderate |
| `npm audit --omit=dev` | — | — | **0** | **0** |

- The lint error is `lib/auth/action-guard.ts:5` `no-restricted-imports` (`@/lib/db/client` in a tenant path) — a **Lane A hardening file**, present identically at baseline and untouched by this lane (not in Lane D ownership). Identical before/after proves the upgrade neither caused nor hid it. **Flag for Lane A.**
- `npm ci --ignore-scripts` from scratch: exit 0; full gate set re-run on that clean `node_modules` — all green (proves the lockfile, not the cache).
- `npm run db:migrate` re-run post-upgrade on `scrimlypro_deps`: `✔ migrations applied` (drizzle-kit 0.31.11 + drizzle-orm 0.45.4 functional against PG 17.6 @ 127.0.0.1:54329).
- Node v25.6.1 non-LTS: documented `npm install --ignore-scripts` workaround used throughout (README C5.2 still accurate; `better-sqlite3@13.0.3` pin unchanged, prebuild loads fine).

## 4. Smoke evidence (proxy redirect, public assets, login page)

Production server (`next start -p 3052` on a fresh `.next` build; .env.local from the M1 worktree with DB `scrimlypro_deps`):

| Check | Result |
|---|---|
| `GET /` unauthenticated | **307 Temporary Redirect**, `location: /login?next=%2F` ✅ (proxy.ts executing; sanitized `next` param present) |
| `GET /login` | **200** ✅ |
| `GET /file.svg` (public asset) | **200** ✅ |
| `GET /templates/challengers-red/mvp.png` (public asset) | **200** ✅ |
| `npm run verify:secrets` (after fresh build) | **OK** — scanned 667 files under `.next/static`, `.next/server/app`, `.next/server/chunks` + binary name-scan; no secret material ✅ |
| `next/og` absence spot-check | zero `next/og`/`ImageResponse` imports in `app/`, `components/`, `lib/`; zero `opengraph-image`/`twitter-image` routes in source or `.next/server/app` — the critical's vulnerable surface is genuinely absent from the runtime build ✅ |

## 5. Deprecation/warning deltas other lanes must know

1. **No new deprecation warnings.** `next build` on 16.4.3 emits zero `⚠`/deprecation lines; `ƒ Proxy (Middleware)` builds and executes identically (smoke 307 above). `proxy.ts` needs **no changes** from other lanes.
2. **Next 16.4.0 minor (no forced breaking changes):** Cache Components (`cacheComponents`, `partialPrefetching`) is *recommended* but strictly opt-in via `next.config.ts` — existing app config is unaffected; do not enable it casually mid-lane. Next 17 will make it the default (relevant to the future 17 upgrade, out of scope here).
3. **React 19.3 ships inside Next 16.4**, but the peer range is `^19.0.0` — the app's pinned `react 19.2.8` satisfies it and was deliberately not bumped (outside Lane D bounds). No reconciliation needed.
4. **`experimental.agentUpgrade` defaults to `'security'`** on 16.4: `next dev`/`build` may print upgrade nudges when installed version has known advisories. If a lane sees these, they are informational nudges, not errors (and after this lane's bump, should be quiet).
5. **16.4.3 patch note touching proxy:** "don't load the app-page runtime in proxy.ts" — a fix, no behavior change observed here.
6. **Node v25 workaround unchanged** — `npm install --ignore-scripts` still required and documented (README C5.2); better-sqlite3 pin untouched.

## 6. Quality-agent findings

Independent QA pass (7 checks): **all PASS**.

1. `npm ls next @supabase/supabase-js @supabase/ssr postgres drizzle-orm drizzle-kit vitest react react-dom` — clean tree, correct versions, no invalid/unmet markers.
2. Lockfile in sync: `npm ci --dry-run` "up to date", exit 0; `next`/`eslint-config-next` exact pins `"16.4.3"` preserved (repo convention restored after npm rewrote them to `^16.4.3` during install).
3. `proxy.ts` executing: fresh server, 307→`/login?next=%2F`, `/login` 200, asset 200; server stopped, port freed.
4. Audit claims verified true: exactly 4 moderate, all in the single drizzle-kit chain; prod audit 0; vulnerable esbuild present only in the dev-only `@esbuild-kit` path; `next/og` absent from source and build.
5. Scope clean: `git status --porcelain` / `git diff --stat` show only `package.json` + `package-lock.json`; `.env.local` git-ignored (`.gitignore:34`).
6. Node v25 workaround documentation still accurate; better-sqlite3 rationale intact.
7. Version ground truth recorded (table §1); better-sqlite3 and react/react-dom untouched.

QA anomalies (all resolved/explained): (a) 4 extraneous wasm packages left in `node_modules` by the Node-v25 sharp fallback path — pruned afterwards; `npm ci` was already clean, this was cosmetic disk state only; (b) a stale `next start` process was squatting on :3052 during review (it was this lane's own smoke server) — killed before re-verification; (c) cosmetic `npm ls esbuild` optional-peer marker: vite declares esbuild `^0.27||^0.28` as an *optional* peer while drizzle-kit pins 0.25 at root — dev-only, no functional impact (460/460 green).

## 7. Limitations (blocked upgrades + what would unlock them)

1. **`esbuild ≤0.24.2` via `drizzle-kit` (4 moderate)** — the only remaining findings. Unlock: upgrade `drizzle-kit` to a major that drops the `@esbuild-kit` loader stack, or add an npm `override` for `@esbuild-kit/core-utils → esbuild`. Both out of bounds for this lane (breaking / new-config risk). Zero runtime exposure (dev-only CLI, `--omit=dev` audit = 0).
2. **Next 17** — deliberately not taken (lane bound: 16.x only; parallel lanes build against the 16.x API surface). The 16.4 Cache Components work is the migration runway for 17.
3. **react 19.3** — not bumped (not in lane bounds); nothing requires it today.
4. Pre-existing baseline lint error in `lib/auth/action-guard.ts` (Lane A file) — recorded, untouched; Lane A owns the fix.

## 8. Critical-review response (post-approval) — flag disposition

Lane D review verdict: **APPROVED, no in-lane defect**. Dispositions for the record:

- **D-1 (live-stack re-verification) — accepted, deferred by design, integration runbook step 12.** The in-lane smoke covered proxy redirect + page/asset rendering. The auth matrix (`scripts/verify-auth-matrix.sh` → 11/11) and the A-c3 header curls (CSP + `Cache-Control: no-store` on `/share/[token]` and an authenticated response) were **not re-runnable in-lane**: the matrix's authenticated columns require `OWNER_COOKIE`/`ATTACKER_COOKIE` from real browser sessions (M1 §9.7) and there is no local GoTrue. This is the lane's single verification gap; because D merges last (single-variable change), any red there isolates the bump.
- **D-2 (lint-error attribution corrected):** the §3/§7 note "Flag for Lane A" is superseded — `lib/auth/action-guard.ts:5` is the exact violation **Lane C already fixed as `m3(0)`** on its branch. No Lane A or Lane D action. The integration lint gate stays red until C's fix merges — expected, not a regression — and the `no-restricted-imports` rule must not be weakened to turn it green mid-merge.
- **D-3 (esbuild justification accepted as settled).** Handoff to Lane E's deploy/cut-over docs: record the residual audit state there (4 moderate, all one drizzle-kit chain, justification in §2) so CI `npm audit` isn't re-triaged from zero. Unlock option refined: `overrides: { "@esbuild-kit/core-utils": { "esbuild": "^0.25" } }` as a future, separately-tested change (§7 already excludes it from this lane).
- **D-4.1 — handoff to Lane E:** hosted/CI should pin an LTS Node (20/22); the v25 `--ignore-scripts` dance is a local-workstation workaround only.
- **D-4.2 — integration item:** re-run the throwaway `drizzle-kit generate` under 0.31.11 after D lands. In-lane coverage: `db:migrate` (the *apply* path) was re-run green under 0.31.11 + drizzle-orm 0.45.4; the *generate* path needs C-2's scenario and stays an integration check.
- **D-4.3 (commit granularity — answered, not "confirmed"):** the next/eslint-config-next bump is **not** a separate commit from the transitive audit-fix bumps; there is exactly one code commit (`m4d(1)`). The brief's commit plan mandated one atomic pair ("deps + lockfile together"), and splitting retroactively is not safely possible: lockfile hunks can't be cleanly partitioned across two commits, and each sub-commit would have to be gate-green, requiring a rebuilt intermediate install state and a second full gate run. Revert path if 16.4.3 ever needs rolling back: revert `m4d(1)` wholesale, re-run `npm audit fix` (reproduces the transitive bumps deterministically from the advisory data), re-gate. Convention-enforcement one-liner (`save-exact=true` in `.npmrc`) noted but not actioned — `.npmrc` is outside this lane's ownership.
