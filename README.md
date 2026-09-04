# ScrimlyPro

PUBG Mobile scrim results → cumulative standings & MVP graphics.

Truth: PRD.md (what) · ERD.md (data) · PLAN.md (build order).

## Prerequisites

Node 20 or 22 LTS.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build / npm test / npm run lint
```

Env: copy `.env.example` → `.env.local`. All optional in C1.1.

## Database

- `npm run db:generate` — regenerate SQL migrations from the Drizzle schema (`lib/db/schema.ts`) into `db/migrations/` (committed, versioned).
- `npm run db:migrate` — apply committed migrations to `data/scrimly.db` (created automatically).
- `npm run db:seed` — (re-)insert the deterministic demo session (16 teams, matches 1–2 confirmed). Idempotent: safe to run repeatedly.

`data/` is local and gitignored. `db/migrations/` is committed.

## Assumptions

(agent records autonomous decisions here, per chunk)

- **C1.1 — Node version:** installed runtime is Node v25.6.1 (prompt assumed 20/22 LTS). Scaffold, build, and tests all pass on it; flagged for awareness.
- **C1.1 — @types/better-sqlite3:** better-sqlite3 v13 ships no bundled TypeScript declarations; added `@types/better-sqlite3` as a types-only dev dependency to keep TS strict with zero `any` (build fails otherwise).
- **C1.1 — CNA-generated agent files:** create-next-app generated `AGENTS.md` / `CLAUDE.md` (Next.js agent-rule boilerplate, re-added by `next dev` if deleted). Kept as-is.
- **C1.2 — no separate toJson/fromJson helpers:** ERD §2 mentions typed `toJson`/`fromJson` helpers; drizzle's `mode: "json"` columns with `$type<>` already give typed JSON in/out, so no extra helper module was added (PLAN C1.2 lists no such file).
- **C1.2 — Bawa punctuation pair does NOT normalize identically under the C2.2 spec:** `normalize("Bawa·Qadra")` strips the clan-tag prefix (`Bawa·` matches `^[\w×]{2,6}\s*[|·:.\-/]\s*` because `·` is a separator) → `qadra`, while `normalize("Bawa Qadra")` has no separator → `bawa qadra`. The seed therefore stores them as two roster entries (like heavy drift). Flagged for C2.2/C2.3: the edited C2.3 test "punctuation drift (Bawa·Qadra + Bawa Qadra)" expects a merge, which the current PLAN C2.2 regex does not produce — the separator class likely needs revisiting in C2.2 (truth-file change, so not done here).
  - **RESOLVED in C1.2 review:** tag-prefix stripping dropped entirely from the normalize spec (PLAN C2.2 rewritten); seed `normalizeName` uses the new pipeline — Bawa pair merges (`bawa qadra`), rosters now 66.
- **C1.2 — one-token fix in tests/db.test.ts:** the prompt's exact test content passes `drizzle(sqlite)` without a schema, which TS strict rejects (`BetterSQLite3Database<Record<string, never>>` not assignable to the typed handle). Changed to `drizzle(sqlite, { schema })`; behavior unchanged.
- **C2.1 — kp applies the kill multiplier:** `computeStandings` computes kp as `kills × rules.kill_points`, not the raw `SUM(r.kills)` in ERD §3's SQL sketch (which assumes `kill_points = 1`). ERD §3 itself declares the sketch documentation-only and the TS function authoritative; pinned by test T3b so a later "simplification" back to a raw sum fails.
- **C2.1 — SUPER_RULES duplication:** the PRD §6 ruleset literal now exists in three places — `PRD.md`, `lib/scoring/rules.ts` (runtime canonical), and `scripts/seed.mjs`. All carry keep-in-sync notes; consolidating would require touching scripts/truth files outside C2.1's scope.
- **C2.3 — empty-norm names never group, even by identical raw spelling:** spec says an emoji-only name (normalizes to "") is "ALWAYS a standalone entry, never merged with anything — including another empty-norm entry", so each occurrence of an emoji-only name in a team creates its own aggregate (the same 🐉 in matches 1 and 2 yields two entries, kills not summed). If real sessions show repeated identical emoji names, the C6 editor handles it manually.
- **C2.3 — merge target on multiple fuzzy matches:** when a name fuzzy-matches more than one existing aggregate in the team (possible after ≥3 variants drift apart), it merges into the FIRST existing aggregate in creation (first-seen) order. Exact-norm matches are unaffected.
- **C2.3 — entry.norm on fuzzy merge:** a merged aggregate keeps the normalized form of its first-seen occurrence as its `norm` key (fuzzy partners may have slightly different normalized forms; the key is informational — merge decisions re-compute distance per pair).
- **C2.3 — normalize.ts created here:** `lib/matching/normalize.ts` did not exist in this tree (C2.2 not landed yet), so C2.3 created it byte-identical to the shared spec (§2.1). Git will auto-resolve the identical merge when C2.2 lands.
