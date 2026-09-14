# SCRIMLYPRO — PRODUCT REQUIREMENTS DOCUMENT (v1-CORE)

**Status:** ACTIVE · Single source of truth for WHAT we build.
Companions: `ERD.md` (data), `PLAN.md` (build order & chunk prompts).
This build supersedes all prior specs/demos for scope described here.

## 1. Summary

A tool for PUBG Mobile scrim organizers (Pakistan) that turns the 6–7 end-of-match screenshots they already take into a cumulative standings graphic after every match and a Top-5 MVP graphic at session end — in ~90 seconds per match, on a phone.

## 2. Problem & user

Organizers manually retype results from screenshots into Canva/Photoshop after every match, track running points in their head or sheets, and produce standings/MVP graphics by hand. 30–60 min per match, error-prone.

User: solo scrim organizer; mobile-first; uploads happen immediately after each match ends (phone or emulator screenshots). 5–15 pilot organizers. Runs locally in this build (single operator, no login).

## 3. The Core Loop (heart of the product — CUMULATIVE model)

1. Create session: name, planned matches (1–6), team count (4–25), team names (bulk paste), optional logos, aesthetic choice.
2. Ingest match N: upload 1–14 result screenshots → ONE Gemini call → validated squads JSON (placement, players, per-player kills).
3. Review form: rows = this match's squads sorted by placement (placement, kills, expandable players — all editable, low-confidence cells highlighted). Each row has a team-name dropdown, pre-filled by suggestions learned from earlier matches. Organizer confirms every mapping (distinct teams, no duplicates).
4. Confirm → points stored → one graphic is produced: "OVERALL STANDINGS — AFTER MATCH N" (cumulative: adds this match's points to all previous). Downloadable 1080×1620 PNG.
5. Repeat for the next match. Match 2+ dropdowns auto-suggested from match-1 rosters; human still confirms.
6. Session end: "FINAL RESULTS" standings graphic + Top-5 MVP (kills aggregated across all matches, fuzzy name merge, editable, then locked) graphic.

Scope decision: per-match result graphics are NOT produced in v1 (organizers share the running standings after each match). Per-match data is still stored, so a per-match graphic can be added later with zero schema change.

## 4. Scope

**In (this build):** F1–F7 below, running locally.
**Out (deferred, see §11):** auth, user accounts, dashboard, payments, share links/OG, custom template upload, per-match graphic, duo/solo, deployment, entitlements. Watermark always rendered (brand growth).

## 5. Functional requirements

### F1 — Session creation

Wizard: (a) basics — name, planned matches 1–6, team count 4–25, aesthetic (3 choices); (b) teams — bulk textarea (split on newline/comma) + per-team optional logo (client-resized 256px PNG data URL, alpha-preserving); (c) confirm summary with scoring table shown read-only. Validations per ERD constraints. On submit: session + teams rows; redirect to session page; announcement graphic available immediately.

### F2 — Screenshot ingest (OCR)

- Upload 1–14 screenshots (≈10 for a 16-team lobby; more for larger); client-side downscale to ≤1600px longest edge, JPEG q0.85 (strips EXIF), each ≤4MB after downscale.
- ONE Gemini request with ALL images (cost ≈ $0.004/match).
- Model: env `GEMINI_MODEL` (default `gemini-3.1-flash-lite`) with 404-fallback chain. 60s timeout. Key only in `/api/ocr` route.
- Validation before the form ever renders:
  - V1 squad count == session team_count → else `MISSING_SQUADS` `{extracted,expected}`
  - V2 placements exactly 1..N, unique, no gaps → `BAD_PLACEMENTS`
  - V3 squad size 1–4; name 1–30 chars; kills 0–20 → `BAD_KILLS` (failures = V1–V3 only; 16–19 are legit on Rondo — recalls inflate individual totals; 20 still catches digit misreads like 77/99)
  - V4 lobby-wide total kills > 99 → soft warning `LOBBY_KILLS_HIGH{total}` — never a failure, never retried. Rondo recalls (eliminated players return and can die again) legitimately exceed 99 — e.g. a 19-squad Rondo match produced 109 lobby kills — so a human judges (Rondo recalls vs OCR double-count) in the review form.
- On failure (V1–V3 only): ONE automatic retry appending a corrective note, then a typed error. Warnings never retry: retrying on lobby kills > 99 would pressure the model to fabricate lower numbers when the read is correct. Manual fallback always exists (add rows by hand).
- Parsed JSON persisted on the match row (draft); reopening a draft loads it — no second Gemini call.
- Dev fixture mode (env-gated, off by default) returns sample data for matches 1–3 so the flow is testable without a key.

### F3 — Review & mapping form (the operator's main screen)

- Rows sorted by placement ASC. Per row: placement (editable number), team dropdown (options = registered teams; teams already chosen in another row are filtered out), kills total (editable), this-match points (computed, readonly), expandable player list (name + kills, editable).
- Suggestion tiers: strong → preselected; weak → preselected + yellow border; none → empty + red border + row pinned to top.
- "Accept all suggestions" fills every empty dropdown with its best candidate (still changeable).
- Yellow highlight on OCR-flagged low-confidence cells.
- `MISSING_SQUADS` → banner + "add squad row" button.
- `LOBBY_KILLS_HIGH{total}` → non-blocking warning banner showing the lobby kill total for human review (never blocks confirm, never retries).
- Confirm disabled until every squad maps to a distinct team.
- The engine only SUGGESTS; a human confirms every mapping, every match (tags and rosters are hints, not truth — substitutes and tag-less teams are normal).

### F4 — Cumulative standings

- Computed from `match_results` (confirmed matches only) — never stored (see ERD §5). Per team: WWCD count, PP, KP, TOTAL.
- Tie-break order (authoritative): `total DESC → wwcd DESC → kp DESC → pp DESC → team name ASC`.
- Graphic available after every confirm, labeled "AFTER MATCH N"; becomes "FINAL RESULTS" when session is completed.

### F5 — Top-5 MVP

- Collect per-player kills from all confirmed matches (team-joined).
- Merge name variants within a team only, never across teams: exact normalized match, OR Levenshtein ≤2 with normalized length ≥4.
- Draft list → editor (rename, adjust kills, add via search, remove, reorder, merge two entries (kills sum, variants union, canonical = organizer-picked name, flagged manual-merge), variants expander) → Lock. MVP graphic renders ONLY from the locked list. Unlock allowed.

### F6 — Graphics

- Canvas 1080×1620 (2:3), PNG export at exact size, client-side (DOM → html-to-image). Watermark scrimlypro.com bottom-right.
- Types: Overall standings (RANK, TEAM, WWCD, PP, KP, TOTAL — two-column table, rank-1 row gold, optional 44px logos), MVP (rank, player, team, kills), Announcement (team grid with logos).
- Templates = background image + coordinate config. This build ships 3 dev-gradient aesthetics; real PNGs drop in later with config changes only.

### F7 — Match lifecycle & robustness

- Match states: draft (OCR saved, not confirmed) → confirmed.
- Unlock any confirmed match: deletes its results, returns to draft, rosters rebuilt from remaining confirmed matches, standings recompute.
- Confirm is idempotent (re-confirm replaces cleanly) and atomic.
- Session status: active → completed via explicit "Mark complete" (allowed anytime; warns if confirmed < planned). Re-openable.

## 6. Scoring rules (authoritative — "SUPER ruleset")

Kills: 1 point each. Placement: 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th=1, 8th=1, 9th–25th=0.

```json
{"kill_points":1,"placement_points":{"1":10,"2":6,"3":5,"4":4,"5":3,"6":2,"7":1,"8":1},"default_placement_points":0}
```

Sanity bounds: kills 0–20/player (≥8 flagged "verify" in UI; 16–19 are legit on Rondo — recalls inflate individual totals; 20 still catches digit misreads like 77/99), squads 1–4 players, lobby kills > 99 → `LOBBY_KILLS_HIGH{total}` soft warning (Rondo recalls legitimately exceed 99; a human judges, the validator doesn't block).

## 7. Edge cases → required behavior

| Case | Behavior |
|---|---|
| Same player, different OCR spelling across matches | mild drift (≤2 edits after normalization) auto-merges within-team; heavy drift stays split and the organizer merges it manually in the MVP editor |
| Substitute / zero roster overlap | weak or no suggestion; manual dropdown; fast |
| OCR missed squads (screenshot gap) | MISSING_SQUADS banner; manual row add; never dead-end |
| OCR duplicated squad across overlapping screenshots | prompt dedupes; V2 rejects; auto-retry once |
| Rondo lobby total > 99 (recalls — eliminated players return and die again) | `LOBBY_KILLS_HIGH{total}` warning banner; human confirms; never a failure, never retried |
| Wrong kill parsed | editable in form before confirm |
| Fix a confirmed match | Unlock → edit → re-confirm; everything recomputes |
| Session ended under planned matches | final graphics allowed + warning banner |
| Tie at MVP rank-5 boundary | kills DESC → name ASC; organizer can override in editor |
| Gemini fails twice | form opens empty at correct capacity; manual entry |
| No API key | fixture mode via env flag; otherwise typed error with guidance |

## 8. Non-functional (robustness doctrine — every chunk must honor)

- **R1** Validate-before-trust: OCR output never writes results directly.
- **R2** Human confirms every squad→team mapping, every match.
- **R3** Aggregates never stored — always derived from `match_results`.
- **R4** Confirm atomic + idempotent.
- **R5** Unlock/edit always available; rosters rebuilt.
- **R6** Drafts persist; no repeat OCR cost.
- **R7** Deterministic tie-breakers → stable, reproducible graphics.
- **R8** Every failure path has a manual fallback (never a dead-end).
- **R9** Mobile-first: ≥44px targets, zero horizontal overflow at 375px, all async states have loading/error UI.
- **R10** One Gemini call per match; client downscale before upload.

## 9. v1-CORE acceptance (all must be true)

- Create a 6-match / 16-team session with 2 logos; announcement graphic downloads at exactly 1080×1620 with watermark.
- Ingest real screenshots for match 1 → validated form → dropdown mapping → confirm → "AFTER MATCH 1" standings graphic correct vs hand-computed SUPER points.
- Matches 2–3: dropdowns pre-filled by suggestions (incl. one tag-less substitute team); cumulative totals correct after each.
- Unlock match 2 → standings reflect matches 1 & 3 only; re-confirm restored.
- MVP page: drift-merged player appears once with variants note; edit → lock → graphic; re-download identical.
- Mark complete → "FINAL RESULTS" graphic.
- `npm run build` + `npm test` green; zero `any`; business logic pure and unit-tested.

## 10. Stack (locked)

Next.js App Router + TypeScript strict + Tailwind · SQLite + Drizzle (local; Postgres-shaped schema per ERD) · Gemini `@google/genai` (route-only key) · client-side graphics via html-to-image · Vitest.

## 11. Parking lot (do NOT build now)

Auth + Supabase port · payments (manual JazzCash/Easypaisa later) · share links/OG · per-match graphic · custom template upload · duo/solo · kills×2 toggle · CSV export · tournament mode · entitlements.