# SCRIMLYPRO — IMPLEMENTATION PLAN (v1-CORE, chunked)

**Status:** ACTIVE · Single source of truth for build order.
Companions: `PRD.md` (what), `ERD.md` (data).

## 1. Chunking philosophy

LLM agents execute small, well-bounded tasks far more reliably than large ones. v1-core is split into 17 chunks (C1.1–C7.1). Each chunk = exactly one agent prompt = one working session. After each chunk the app builds, tests green, and is committed. Prompts are generated on demand: ask "generate C5.3" and the full master prompt for that chunk gets produced from this file.

## 2. Global conventions (embedded in EVERY generated prompt)

**STACK:** Next.js App Router (latest), TypeScript strict, zero `any`, Tailwind CSS, Vitest, Drizzle + better-sqlite3 (local file DB at `./data/scrimly.db`), `@google/genai` (route handlers only), html-to-image, `@fontsource/rajdhani` (500/600/700) + `@fontsource/noto-sans-symbols-2`.

**RULES:**
- Mobile-first: interactive targets >=44px; ZERO horizontal overflow at 375px; every async action has loading + error UI.
- ALL business logic (scoring, matching, MVP, validation, standings) lives in `/lib` as pure typed functions with vitest tests. UI components never contain business logic.
- `GEMINI_API_KEY` exists only in `app/api/ocr/route.ts` (server).
- Allowed deps: `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `vitest`, `html-to-image`, `@google/genai`, `clsx`, the two `@fontsource` packages + `@types/better-sqlite3` (types-only). Anything else: justify in README Assumptions.
- `next.config`: `serverExternalPackages: ["better-sqlite3"]`.
- If better-sqlite3 fails to compile: switch to `drizzle-orm/libsql` with `file:./data/scrimly.db`, schema unchanged.
- PRD.md / ERD.md / PLAN.md are truth. Deviation -> record in README Assumptions; schema changes are forbidden without updating ERD.md.
- Done = `npm run build` AND `npm test` green, then one git commit `C#.# <summary>`.

## 3. Dependency graph

```
C1.1 → C1.2 → { C2.1 ∥ C2.2 ∥ C2.3 ∥ C2.4 }   (domain, all parallel)
                → C3.1 → { C3.2 ∥ C3.3 }        (graphics)
                          → C4.1 → C4.2 → C5.1 → C5.2 → C5.3 → C5.4
                          → C6.1 → C6.2 → C7.1
```

Hard sequence: C1 → C2 → C3 → C4 → C5 → C6 → C7. Inside C2 and C3 the tasks are independent of each other.

## 4. Chunks

### C1 — Foundation

**C1.1 Scaffold.** create-next-app (TS, Tailwind, App Router, ESLint zero errors, alias `@/*`, no `src/`). Folder tree: `app/` `components/ui` `components/graphics` `lib/{db,scoring,matching,mvp,gemini,graphics,fixtures,utils}` `db/` `data/`(gitignored) . vitest harness + one sanity test. Fonts imported globally (stack Rajdhani → Noto Sans Symbols 2; must render `× · | _ ₛ ≌`). `.env.example`: `GEMINI_API_KEY=` · `GEMINI_MODEL=gemini-3.1-flash-lite` · `GEMINI_MODEL_FALLBACKS=gemini-2.5-flash-lite,gemini-2.0-flash-lite` · `SAMPLE_OCR=0`. Build+test green with NO env set.
**ACCEPT:** tree exists; fonts+glyphs render on a dev page.

**C1.2 Data layer.** Drizzle schema EXACTLY per ERD §1–2 (types, constraints, indexes); migration via drizzle-kit; `toJson`/`fromJson` typed helpers; seed script inserting 1 session (6 matches, 16 teams, SUPER rules, dev-dark-gold) + 16 Pakistani esports team names + matches 1–2 CONFIRMED with plausible results (enables graphics/standings dev before OCR exists).
**ACCEPT:** `npm run db:migrate && npm run db:seed` works; scratch query returns the full graph; unit test round-trips a session.

### C2 — Domain logic (pure, no UI, all tested)

**C2.1 Scoring & standings.** `placementPoints(placement, rules)`, `computeStandings(results, teams, rules)` per PRD §6 + ERD §3, tie-break chain, WWCD count. Tests: full 1–25 placement table; tie fixture (equal totals, different WWCD → WWCD wins); empty results.
**ACCEPT:** all green; exported types `StandingRow`.

**C2.2 Normalization + suggestion engine.** `normalize(name)`: NFKD → strip combining marks (/\p{M}/gu) → remove zero-width chars (\u200B–\u200D, \uFEFF) → lowercase → every run of chars outside [\p{L}\p{N}] becomes ONE space → trim. No tag-prefix stripping (decision, C1.2 review): separator classes are ambiguous on single strings — Bawa·Qadra would lose its first token as a "tag" while Bawa Qadra keeps it; tag drift is rare and the MVP editor resolves it. Tag affinity for matching uses Gemini's squadTag vs team-name tokens — never derived by stripping player names. `suggestMappings(squads, rosters)` → greedy one-to-one over score matrix (`overlap/squad_size` + 0.3 tag bonus), tiers strong ≥0.6 / weak 0.3–0.6 / none. Pure `learnRosterDelta` / `rebuildRosters` data functions. Tests: full overlap; 2-of-4 substitute; zero overlap; tag-only; two teams sharing one tag (must NOT cross-assign).
**ACCEPT:** fixtures green; no DB access anywhere in `/lib/matching`.

**C2.3 MVP aggregation.** `collectPlayers(confirmedResults)` → within-team merge (exact normalized OR Levenshtein ≤2 AND len ≥4), variants list, canonical = most frequent raw spelling, top-5 draft (kills DESC → name ASC). Own Levenshtein. Tests: exact merge; separator drift normalizes identically (Bawa·Qadra + Bawa Qadra → both bawa qadra); glue drift (4NM | BROKEN + 4NMBROKEN, distance 1); edit drift (TRB HANAN + TRB HANN); heavy drift (TF×MAₛOOR + TFxMA_SODOR) MUST stay separate (editor resolves); similar names on DIFFERENT teams must NOT merge; non-Latin names (e.g. علی) are not emptied.
**ACCEPT:** fixtures green.

**C2.4 Gemini client + validation + fixtures.** `generateSquads(images, teamCount)`: model = env with 404-fallback chain, 60s timeout, ONE call with all images, `responseMimeType: application/json` + responseSchema below. Verbatim prompt (replace `{TEAM_COUNT}`):

> You are parsing PUBG Mobile custom-room match results.
> You will receive several sequential screenshots of ONE end-of-match results screen, captured by scrolling. Consecutive screenshots OVERLAP — the same squad may appear in multiple screenshots.
>
> Extract every squad in the lobby:
> - placement: the rank number PRINTED ON SCREEN (1 = the winner / Winner Winner Chicken Dinner squad), never the order rows appear in.
> - players: every player in that squad with their exact in-game name and elimination count ("X eliminations").
> - squadTag: shared prefix/tag across the squad's names, else "".
>
> Rules:
> - Copy names CHARACTER-FOR-CHARACTER — symbols, ×, ·, |, _, emojis, stylized capitals. Never normalize, translate, or "fix" spelling.
> - Kills = the number beside each name. Unreadable → 0 and confidence "low".
> - Deduplicate squads/players appearing in multiple screenshots.
> - Order squads by placement ascending, 1..N, no gaps, no duplicates.
> - The lobby has {TEAM_COUNT} squads. If you extract fewer, re-scan every screenshot before answering. NEVER invent squads, players, or numbers to reach the expected count.
> - Anything ambiguous → confidence "low".

```javascript
const SCHEMA = { type: "ARRAY", items: { type: "OBJECT", properties: {
  placement: { type: "INTEGER" }, squadTag: { type: "STRING" },
  confidence: { type: "STRING", enum: ["high","low"] },
  players: { type: "ARRAY", items: { type: "OBJECT", properties: {
    name: { type: "STRING" }, kills: { type: "INTEGER" },
    confidence: { type: "STRING", enum: ["high","low"] } },
    required: ["name","kills"] } } },
  required: ["placement","players"] } };
```

`validateSquads(squads, teamCount)` implements V1–V4 (PRD §F2) with typed errors `MISSING_SQUADS`/`BAD_PLACEMENTS`/`BAD_KILLS`/`PARSE_FAILED`; `withRetry` does the single corrective retry (appends `Previous extraction failed: {reason}. Fix this.`). `lib/fixtures/sampleMatches.ts`: matches 1–3 for 16 teams — clan tags, a tag-less team with a substitute across 2–3, the drifted TF×MAₛOOR/TFxMA_SODOR player; intended mapping documented in comments. Tests: each V-rule incl. duplicate placements and 100 lobby kills; retry called once.
**ACCEPT:** all green WITHOUT any network (client mocked).

### C3 — Graphics engine

**C3.1 Core.** `TemplateConfig` types (`Slot {x,y,w,align}`; `ColumnSpec {rankX,teamX,killsX,totalX,rowY0,rowPitch,maxRows}`); 3 dev-gradient aesthetics (dark-gold, purple-butterfly, pink-blossom) with geometry: margins 60; header y0–330 (title, subtitle chip "AFTER MATCH N"/"FINAL RESULTS", organizer slot); table y340–1500 calm; footer y1500–1620 + watermark scrimlypro.com (~x940,y1560, 26px, 70%). `<GraphicCanvas>` renders 1080×1620, scales to container; `exportPng` after `document.fonts.ready`, output EXACTLY 1080×1620. Dev route `/dev/graphics` renders from seed data.
**ACCEPT:** PNG dims exact; glyph string renders; zero layout shift.

**C3.2 Standings graphic.** `OverallStandingsGraphic` per PRD F6: RANK/TEAM/WWCD/PP/KP/TOTAL; two-column split by team count (16→8+8, 20→10+10, 25→13+12); rank-1 row gold `#f5c542`; optional 44px logos; subtitle from match count or final flag. Fed by `computeStandings` output (C2.1) + seed data.
**ACCEPT:** matches seed standings; 25-team case renders 13+12 with no clipping; long names ellipsize.

**C3.3 MVP + announcement graphics.** MVP: 5 rows (rank, player, team, kills) from a locked `mvp_lists`-shaped object. Announcement: team grid cols = `clamp(ceil(sqrt(n)), 4, 6)` (25→5×5), ~180px cells, logo+name.
**ACCEPT:** both render from fixtures at exact canvas size.

### C4 — Session flow UI

**C4.1 Create wizard.** `/sessions/new`, 3 steps per PRD F1: basics → teams (bulk paste split newline/comma, count badge, per-team logo upload → 256px JPEG data URL, "load sample teams" dev helper) → confirm summary (read-only scoring table). Server action inserts session + teams; redirect to session page. All PRD validations.
**ACCEPT:** 16 teams via bulk paste; wizard usable at 375px; logo stored.

**C4.2 Session page.** `/sessions/[id]`: header (name, aesthetic, N/M confirmed, status), match list (draft/confirmed states, "Add Match N" gated to `planned_matches`, Unlock action per confirmed match), tabs: Standings (HTML table from C2.1, full tie-break), Graphics (announcement / latest overall / MVP previews + Download via C3), "Mark complete" (warns if confirmed < planned; re-openable). Server components + server actions; loading skeletons.
**ACCEPT:** with seed data all tabs correct; unlock recomputes standings.

### C5 — Match loop (core of the core)

**C5.1 Upload UI.** Multi-select 1–10 images; client downscale (≤1600px, JPEG q0.85); thumbnail strip remove/reorder; POST FormData (images, sessionId, matchNo) to `/api/ocr`; loading + typed error banners with retry.
**ACCEPT:** 7×3MB photos → payload each ≤4MB; reorder persists.

**C5.2 /api/ocr route.** Contract: validate input; if `SAMPLE_OCR=1` and no key → return fixture for matchNo 1–3 (else 400); else `generateSquads` → `validateSquads` → `withRetry` → upsert match row (status draft, raw_squad_data) → return squads or typed error. Raw images never persisted.
**ACCEPT:** fixture mode works end-to-end; mocked-Gemini tests cover each typed error path.

**C5.3 Review & mapping form.** `/sessions/[id]/matches/[matchNo]` per PRD F3 in full: rows by placement; editable placement/kills; expandable players; team dropdown (chosen teams filtered out); suggestion tiers with colors; accept-all; low-confidence highlights; `MISSING_SQUADS` banner + manual add-row; confirm gating (distinct teams, all mapped); draft reopen loads `raw_squad_data` (NO new OCR). (If the agent stalls, split into C5.3a layout / C5.3b mapping logic.)
**ACCEPT:** full confirm flow with fixtures; gating airtight; mobile keyboard-friendly.

**C5.4 Confirm pipeline.** Server action, one transaction: replace `match_results` for the match; learn rosters (C2.2 delta); match → confirmed + `confirmed_at`; standings recompute via C2.1; redirect to session page with the new "AFTER MATCH N" graphic ready. Unlock action: transactional delete results + status→draft + rosters rebuild.
**ACCEPT:** idempotent re-confirm; unlock leaves consistent state; tests cover both paths.

### C6 — Finale

**C6.1 MVP editor + lock.** `/sessions/[id]/mvp`: draft from C2.3; variants expander; rename/adjust kills/add via search/remove/reorder; merge two players: kills sum, variants union, canonical = the name the organizer picks; merged entry flagged as manual-merge for the graphic's variants note; Lock → `mvp_lists` write; graphic renders from locked entries only; Unlock re-opens editor.
**ACCEPT:** post-lock re-export identical.

**C6.2 Finalize.** Mark complete → standings subtitle switches to "FINAL RESULTS"; MVP promoted in graphics tab; warning if incomplete; re-open allowed.
**ACCEPT:** state transitions tested.

### C7 — Hardening & handoff

**C7.1 Audit + docs.** 375px pass on every route; error boundaries; empty states; loading skeletons everywhere; README (setup, env, manual test script = PRD §9 acceptance as numbered steps, troubleshooting, Assumptions); final commit.
**ACCEPT:** PRD §9 checklist fully passable by a human following only the README.

## 5. Future phases (separate plans — do not start)

P1 Supabase + auth port (ERD §6) · P2 share links/OG · P3 entitlements + manual PK payments · P4 real template PNGs + geometry recalibration · P5 landing page (owner-coded) · P6 per-match graphic (data already supports it).