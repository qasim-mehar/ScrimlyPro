# P6 — Three-Aesthetics Report

## 1. Outcome (Complete; base commit; branch)

**Outcome: Complete.** Three new art files are wired, calibrated to the pixel,
and test-pinned: `neon-green/overall.png` (single full-width standings table,
one-column rendering), `challengers-red/mvp.png` (five slot cards, kills column
under the baked KILLS ink), `pmpl-light/announcement.png` (list panel between
the baked divider and border, title moved into the top strip). The announcement
graphic was restructured from grid cells to an auto-fit list for **all**
aesthetics, `subtitleBakedIn` became variant-scoped, the wizard tags
per-variant, and the registry grew 4 → 6 aesthetics. Quality-agent pass:
**no P0, no P1 — verdict MERGE** (§7).

- Base commit: `30e6b7a` (P5 tip; P5 branch is unmerged and `main` is dirty —
  see §2).
- Branch: `qasim/p6-three-aesthetics`, isolated worktree `../Scrimly-p6`.
- Commits (unsquashed):
  - `07bc521` chore(templates): add neon-green, challengers-red and pmpl-light announcement art
  - `ecb66f5` feat(graphics): neon-green + challengers-red aesthetics, announcement list layout
  - `79bcaf2` docs(readme): P6 notes — three new art aesthetics + stale-line amendments
  - `01ac6fc` test(graphics): harden imageSize bounds + honest contrast-zone comments
  - docs commit (this report).

## 2. Baseline (P5 tip inspected; dirty-main findings; environment)

**P5 tip (`30e6b7a`) inspected:** Fix A wiring, palette polish, contrast pins,
art gates, dev-route prop threading (21 files / 306 green at baseline).

**Dirty-main findings (reported, never touched):** `main` still holds the
sibling's uncommitted `app/page.tsx`, `ReviewForm.tsx`, `mapping.ts`,
`queries.ts`, `matches-confirm.test.ts` + untracked acceptance/shots files.
The three P6 art files were dropped into `main` untracked; they were copied
into this worktree and committed verbatim (`07bc521`) — never regenerated.
Merge order is P5 then P6 (or cherry-pick).

**Setup deviations (no STOP — all benign):**
- P6 branches from the **P5 tip**, not `main` (P5 unmerged, main dirty).
- `npm install` cannot build `better-sqlite3` here (gyp, node 25, no VS
  toolchain) → `node_modules` copied from the P5 worktree; `package.json` /
  lockfile untouched, zero new deps.
- `data/scrimly.db` (untracked, gitignored) copied from the P5 worktree for
  the dev smoke; dev server on `:3040` (port 3000 never touched).

**Test baseline / baseline gates:** 21 files / 306 tests green; `tsc` clean;
`eslint` clean; `next build` green. Post-P6: **348 green (+42)**.

**Art payload finding:** both 4096×6144 new arts are **JPEG payloads inside
`.png`-named files** (JFIF `ff d8 ff e0`), so the P5 IHDR gate could not read
them. `imageSize` in `tests/graphics.test.ts` now sniffs PNG vs JPEG
(first SOF marker; segments skipped, `C4`/`C8`/`CC` excluded) and the
malformed-input paths throw descriptive errors (hardened in `01ac6fc`).

## 3. Neon-green evidence (standings art, single column)

Art measured read-only (`sharp` temp scripts, identical algorithm to the test
pipeline), independently re-verified by the quality agent. Canvas factor
×0.263671875 (4096 → 1080).

| art feature (art px)                | canvas    | config pin                          |
| ----------------------------------- | --------- | ----------------------------------- |
| label ink centers RANK 759          | 200.1     | rankX 176 + 24                      |
| "TEAM" ink starts 1256              | 331.2     | teamX 332                           |
| PP / KP / 🐔 / TOTAL 2361.5 / 2724.5 / 3068.5 / 3431 | 622.6 / 718.4 / 809.1 / 904.7 | stat boxes 58w at pp 594 … total 876 |
| table strip x440–3656 (divider y1566) | x116 w848 | stripX 116, stripW 848            |
| rows top/bottom y1584 / y5568       | 417.7 / 1468.1 | rowY0 418, rowsBottom 1468     |
| match chip x1594–2501 y994–1185     | 420.3–659.4 / 262.1–312.5 | subtitle {x609, y265} 44px accent |
| title band y345–445 (max lum 0.009) | 91–117    | title {140, 90, 800, center}        |

Renderer: `StandingsTableSpec.singleColumn` → columns[0] with ALL rows (the
art is one wide table; the baked label row includes the chicken icon →
`labelsBakedIn: true`, `subtitleMode: "matchNumber"`). SSR proof: 16 teams →
last row `top:1402.375px` + `SQUAD 16` + strip `width:848px`; the match number
renders as bare digits; no code labels.

Contrast (pinned zone constants, own-rect re-measured by the agent):
text/table **15.4:1**, accent match number/chip **11.6:1**, text/title band
**17.0:1** — all ≥ 4.5.

## 4. Challengers-red evidence (MVP art)

**Art note:** the art is a **teal/navy** design, not red. `palette.accent`
stays the spec'd `#ff4655` (badges, kills digits), but the title renders
`palette.text` — accent red vs the teal band measures 1.13:1 (unreadable).

| art feature (art px)                     | canvas   | config pin                       |
| ---------------------------------------- | -------- | -------------------------------- |
| slot card interiors start y1966/2586/3217/3849/4480 (pitch drifts 620–634) | 518.9–1181.3 | rowY0 519, rowPitch **165.5** (best fit; every top ≤2.2px), rowHeight 140 |
| card left/right x364 / x3708             | 96 / 978 | rankX 110, boxes inside          |
| baked KILLS ink x3464–3702 → center 3583 | 944.7    | killsX 900 + 45 = 945            |
| kills digit mid-band (row middle ±121)   | —        | mean lum 0.019–0.023 all 5 rows  |
| title band y18–288                       | 4.7–75.9 | title {140, 18, 800, center}     |
| "TOP 5 FRAGGERS" + "KILLS" baked         | —        | `mvp.subtitleBakedIn: true`      |

**Calibration story:** the initial kills center was misread as canvas 819
(polluted ink scan); the clean ink-bbox probe + an adversarial per-row
digit-band scan (and the quality agent, independently) settled on 945 — the
box centers under the baked KILLS ink, glyphs on the dark card interior, the
chevrons crossing only the band bottom beyond the painted edge. Pitch 166 was
corrected to 165.5 after the pinned ≤3px bound failed row 3 by 0.03px.

Contrast: text/name band **11.9:1**, text/kills **12.7:1**, accent kills
**4.3:1** (rank-1, large text), title/teal band **3.05:1** (large; sits at the
floor — flagged for future art re-exports).

## 5. pmpl-light announcement evidence

| art feature (art px, ×0.50657)     | canvas   | config pin                        |
| ---------------------------------- | -------- | --------------------------------- |
| white panel between divider y840 → 425.5 and border y3058 → 1549.1 | — | rowsTop 440, rowsBottom 1540 |
| "SLOT NO" ink center 295.5         | 149.7    | slotX 125 + 24                    |
| "TEAM" ink starts 498              | 252.3    | teamX 253                         |
| white top strip (art x276–1856 y60–160) | 139.8–940.2 / 30.4–81 | variantHeaders.announcement title {140, 36, 800, center} |
| "PARTICIPATING TEAMS" baked        | —        | `announcement.subtitleBakedIn: true` |

List: 25 teams fit at 44px pitch ≥ 40 rowHeight; slot numbers `01`..`25`
zero-padded; logos in circular plates (plate = logoSize + 10); rank-1 rows in
the `wwcdBg` band. The announcement PNG is a true PNG → contrast is
**decoded live in-process** by the test (zlib/IPA): text/panel **14.2:1**,
muted slot numbers **5.3:1**, accent slot **4.1:1** (large), title/strip
**15.7:1**.

## 6. Engine + wizard evidence

- **Announcement restructure:** `announcementGrid`/`announcementCells` →
  `announcementRowLayout(n, spec)` → per-row `{y, pitch}`; pitch =
  (rowsBottom−rowsTop)/n; content vertically centered in the slot
  (`y + (pitch − rowHeight)/2`). SSR: 4 teams → last content `top:1320px`
  (auto-fit, not the fixed cell grid); 16 teams → `>01<` … `>16<` + names
  across all six ids. `NAME_BLOCK_H` (the last component-internal layout
  constant) is gone.
- **Variant-scoped headers:** `HeaderSpec` + `TemplateConfig.variantHeaders` +
  `headerFor(config, variant)` — shallow merge, only pmpl announcement
  overrides (title x140 y36 w800 + 600 28px). SSR: pmpl announcement renders
  `left:140px` and never the standings slot `left:295px`.
- **Variant-scoped baked subtitles:** `subtitleBakedIn` moved OFF
  `TemplateConfig` into `MvpSpec`/`AnnouncementSpec`. Pinned non-leakage:
  pmpl standings still renders the match number (`>6<`), pmpl announcement
  skips "PARTICIPATING TEAMS", challengers announcement still renders it,
  neon MVP still renders "TOP 5 FRAGGERS".
- **Wizard:** six aesthetics; "(placeholder)" iff every background is a
  gradient, "(partial)" when art backs some variants (the three art-bearing
  ids); `VALID_TEMPLATE_IDS` + message → "Pick one of the six aesthetics."
  (order-sensitive sync test with `Object.keys(AESTHETICS)` retained).
- **Contrast battery extended:** all six aesthetics keep ≥1 gradient fallback
  verified ≥4.5 vs every stop; new medal pins for neon/challengers; recorded
  JPEG-zone constants documented with rects + method (JPEG cannot be
  zlib-decoded in-process; re-measure via temp `sharp` scripts when art
  changes).

## 7. Quality-agent findings (list, fixes, remaining P2s, verdict)

Independent subagent pass (own rects + own probe scripts, full file reads,
348-test suite, focused 181-test runs, tsc, lint, build, art sha256s):
**no P0, no P1 — verdict MERGE.**

Independently reproduced: every neon label center (≤0.4px), TEAM start
(0.83px), strip/rows; all five card tops (≤2.1px), KILLS center 944.74 vs 945,
digit-band means ≤0.0233 vs pinned 0.0228 (kills accent ratio 4.27 — not
cherry-picked); pmpl divider/border/slot/team/strip checks. Test-drift
sensitivity confirmed by mutation (stripW 848→850, teamX 253→255, rowY0
519→520 all caught).

Fixed in `01ac6fc`: `imageSize` truncation/bounds hardening; honest
kills-window + title-floor comments.

Remaining P2s (accepted, none block merge):
1. Challengers title band ratio at the 3.0 large-text floor (3.04–3.06) —
   documented in the test; a band-brightening re-export must re-measure.
2. `organizer` slot == title slot for neon/challengers (dead in production —
   every caller passes `null`; same as pre-P6 pmpl).
3. JPEG zone pins are recorded constants — a same-dimension art swap won't
   fail tests. A sha256 pin was considered and declined to keep art
   swap-able (P5 gate philosophy); rects are documented for re-measurement.
4. No wizard test file exists; the tag rule is covered by review + SSR smoke
   only.
5. README contrast numerics are ~0.3 off the agent's alt-rect recomputation
   (cosmetic; README matches the pinned constants).

## 8. Verification (commands, exit codes, test counts)

All run in `C:\Users\mianq\Projects\Scrimly-p6`:

- `npm test` → **21 files / 348 tests green** (baseline 306, +42), exit 0.
- Focused suites (graphics, ssr, contrast, mvp-announcement, session-input) →
  181 green.
- `npx tsc --noEmit` → clean; `npm run lint` → 0 errors; `npm run build` →
  green (all routes).
- Dev smoke `next dev -p 3040`: `/`, `/sessions/new` (6 aesthetics, both tags
  SSR), `/dev/standings`, `/dev/announcement`, `/dev/mvp`, `/dev/calibrate`
  → all 200 with markers asserted (`>01<`, `SQUAD 16`, art srcs).
- Art gates: JPEG sniff test (ffd8 + exact 4096×6144), PNG sniff
  (2132×3200), 4-case coverage incl. exact file list; ratio/width pass for
  all four art files.
- `git status` clean at HEAD; every commit self-consistent (`07bc521` inert
  art, `ecb66f5` feature green, `79bcaf2` README, `01ac6fc` tests green).

## 9. Limitations and handoff (what the user still owes)

1. **Challengers title contrast is at the floor** (≈3.05:1 large-text). Fine
   today; a future re-export that brightens the teal band needs a re-measure
   (zone constants documented in `tests/graphics-contrast.test.ts`).
2. **Kills digits assume ≤2 digits** (kills per player ≤ 20 in scoring rules;
   3+ digit totals would reach the painted card edge).
3. **Neon single column assumes ≤25 teams** (25 rows fit at 41.6px ≥ 40).
4. **JPEG-in-`.png` naming is load-bearing for the gate sniff only** —
   renaming the files is harmless (magic bytes drive the sniff), but
   re-exporting them as actual PNGs also works (both paths tested).
5. **Merge order matters:** merge P5 (`qasim/p5-template-completion`) before
   P6 (or cherry-pick `07bc521`→`01ac6fc`); do not merge main's dirty sibling
   work along with them.
6. **Golden-path export on the real arts** (browser legibility of the kills
   digits + neon rows) remains the ship gate for the graphics phase — this
   lane verified geometry/contrast programmatically (no browser automation
   available in this environment), plus SSR + dev-server 200s.
