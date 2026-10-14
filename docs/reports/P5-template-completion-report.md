# P5 — Template Completion Report

## 1. Outcome (Partial — art-blocked items deferred; base commit; branch)

**Outcome: Partial.** Fix A (session wiring) and the palette-only parts of Fix D
are complete, tested, and verified. Fix B (strict art gates) and Fix C
(mvp/announcement art calibration) are **deferred by user direction** pending
the `overall.png` re-export at 2160×3240 — they cannot be completed against
the current 1024×1536 file, and the 1024px file was deliberately never
committed on this branch.

- Base commit: `a65a4d1` (P4b pmpl-light calibration; P4a = `c638c3d`).
- Branch: `qasim/p5-template-completion`, isolated worktree `../Scrimly-p5`.
- Commits (unsquashed):
  - `4ceb8d4` fix(templates): thread matchCount and isFinal into standings previews
  - `b7a9fec` feat(graphics): palette-driven polish — plates, medallions, cell cards
  - `530801f` test(graphics): measured contrast and palette coverage
  - `2a80bef` fix(templates): dev routes mirror production prop threading
  - docs commit (this report).

## 2. Baseline (P4 commits inspected; dirty-main findings; test baseline)

**P4a (`c638c3d`) inspected:** template engine v2
(`backgrounds.{standings,mvp,announcement}` replaces `background`,
`GraphicCanvas` variant prop, ordered `statColumns`, `labelsBakedIn` +
`subtitleMode`, `Palette.watermarkColor`, `rowsBottom` auto-fit) + first
`pmpl-light/overall.png` art + `StandingsPreview` `matchCount?`/`isFinal?`
filename props (present but unwired — the known gap).

**P4b (`a65a4d1`) inspected:** pixel-segmented calibration of pmpl-light
standings geometry (1024×1536 art → ×1.0546875 canvas factor), pinned by
tests; `/dev/calibrate` harness (16/19/25, grid overlay, config readout).
Calibration method: node builtins (`fs` + `zlib`) temp scripts, art read-only.

**Dirty-main findings (reported, never touched):** main holds uncommitted
sibling work — modified `app/page.tsx`, `components/matches/ReviewForm.tsx`,
`lib/matches/mapping.ts`, `lib/sessions/queries.ts`,
`tests/matches-confirm.test.ts`, plus untracked `app/icon.svg`,
`app/loading.tsx`, `app/sessions/[id]/loading.tsx`, `scripts/acceptance/`,
`shots/`, `smoke.mjs`, `sweep-out.txt`. Nothing was staged, stashed, or
discarded; all P5 work happened in the `../Scrimly-p5` worktree.

**Test baseline:** main worktree `npm test` = 19 files / 263 green (includes
the sibling's +1 uncommitted `matches-confirm` test). Clean worktree at
`a65a4d1` = 19 files / **262** green — the 1-test delta is exactly the
sibling's dirty test, not a regression. Post-P5: **21 files / 304 green**
(+42: 4 filename-matrix, 5 palette-coverage, 18 SSR, 15 contrast).

**Gate baseline (clean worktree, before coding):** `tsc --noEmit` clean;
`eslint` 0 errors / 0 warnings (main's 3 warnings come from the sibling's
untracked `scripts/acceptance/` files, absent here); art IHDR
1024×1536 — exact 2:3 PASS, width ≥ 1080 **FAIL** (see §4).

## 3. Fix A evidence (wiring path, final-state renders, filename matrix)

Wiring path (verified end-to-end, production + dev):

```text
app/sessions/[id]/page.tsx (confirmedCount + status, unchanged)
  → SessionView (isFinal={isCompleted} from session.status) [NEW]
    → GraphicsTab (isFinal prop; matchCount={confirmedCount}) [NEW]
      → StandingsPreview (matchCount/isFinal → filename + graphic) [EXISTING props, now fed]
        → OverallStandingsGraphic (matchCount → number slot) [NEW prop]
```

- `OverallStandingsGraphic` in `matchNumber` mode renders
  `String(matchCount)` verbatim when provided — completed sessions read
  **MATCH 6**; digit-parsing (`subtitleMatchNumber`) is fallback only.
  Gradient (`full`) mode ignores `matchCount` entirely (regression-pinned).
- Filenames via `resolveStandingsFilename` (`lib/graphics/standings.ts`):
  explicit props win; absent props → legacy subtitle parsing.

Filename matrix (all pinned in `tests/standings-graphic.test.ts`):

| matchCount | isFinal | subtitle         | filename                              |
| ---------- | ------- | ---------------- | ------------------------------------- |
| 6          | true    | FINAL RESULTS    | scrimlypro-final-standings.png        |
| 2          | false   | AFTER MATCH 2    | scrimlypro-standings-after-match-2.png|
| 4          | —       | (anything)       | scrimlypro-standings-after-match-4.png|
| —          | —       | AFTER MATCH 2    | scrimlypro-standings-after-match-2.png|
| —          | —       | FINAL RESULTS    | scrimlypro-final-standings.png        |
| —          | —       | (other)          | scrimlypro-standings.png              |

SSR render pins (`tests/graphics-ssr.test.ts`): pmpl-light final +
`matchCount={6}` contains `>6<`, never `FINAL RESULTS`; without the prop the
documented empty slot remains (callers must pass it — `GraphicsTab` always
does when `confirmedCount > 0`); all three gradients render the full subtitle
even with `matchCount` passed. `dev/standings` and `/dev/calibrate` now also
thread the props (quality-pass P2 fix, commit `2a80bef`).

## 4. Fix B gates (measured art dimensions; gate test proof)

**Measured (PNG IHDR, node, read-only):**
`public/templates/pmpl-light/overall.png` = **1024×1536, 8-bit, colorType 2
(RGB)**, ratio exactly 2:3, **width 1024 < 1080 → FAILS the ≥1080 gate.**

Per the prompt's STOP condition the user was asked and directed: re-export at
**2160×3240 (same design, drop-in)** is in progress; proceed with Fix A +
palette-only Fix D now; re-run the gate when the new file lands; the 1024px
file must not be committed on the branch (it wasn't — zero art changes in all
commits).

**Status:** strict gate test (`every image background: exact 2:3 AND width ≥
1080`) is **not yet added** — adding it now would fail the build against the
known-pending 1024px file. It lands together with the re-exported art, before
merge: drop in `overall-2160.png` handling per user instruction, add the IHDR
gate test (pass + deliberately-failing temp-copy fixture, never committed),
and re-run. The contrast test in §6 already reads the live file
resolution-independently, so it re-verifies automatically.

## 5. Fix C status (art wired + calibration values, or fallback state)

**Fallback state (verified, documented):** `public/templates/pmpl-light/`
contains only `overall.png` — no `mvp.png` / `announcement.png` in any
casing (case-insensitive directory listing confirmed; no `git mv` needed).
`backgrounds.mvp/announcement` remain the light-gradient fallbacks; the
existing test ("falls mvp/announcement back to the light gradient") still
passes; `/dev/mvp` + `/dev/announcement` return **200** on `:3040` with the
PMPL Light toggle rendering the fallback (markers asserted: toggle label,
subtitles, medallion ink `#f5c542`, cell-card `border-radius:16px`).

**Pending (blocked on user art):** when `mvp.png` / `announcement.png` land,
wire into `backgrounds`, pixel-measure zones (fs+zlib pipeline), calibrate
`MvpSpec`/`AnnouncementSpec` for pmpl-light, pin every value, SSR-assert
announcement at 16/19/25 + MVP at 5 rows. Same pipeline as P4b/§6.

## 6. Fix D polish (palette additions, contrast measurements, both themes)

**Palette additions** (`lib/graphics/types.ts` + per-theme defaults in
`lib/graphics/aesthetics.ts`, all pinned exactly in `tests/graphics.test.ts`):

| theme            | plateBg                  | plateRing                  | medalGold | medalSilver | medalBronze | medalText |
| ---------------- | ------------------------ | -------------------------- | --------- | ----------- | ----------- | --------- |
| dark-gold        | rgba(255,255,255,0.07)   | rgba(245,197,66,0.45)      | #f5c542   | #c9d1dd     | #d19a5b     | #11141b   |
| purple-butterfly | rgba(255,255,255,0.07)   | rgba(192,132,252,0.45)     | #f0c44c   | #c9d1dd     | #d19a5b     | #1c1533   |
| pink-blossom     | rgba(255,255,255,0.08)   | rgba(255,158,199,0.45)     | #f0c44c   | #ccd2de     | #d29a5c     | #2c1521   |
| pmpl-light       | #ffffff                  | rgba(28,35,51,0.18)        | #b57e0d   | #7d8698     | #9c6327     | #ffffff   |

Rendering (zero hardcoded colors in all four graphic components — verified by
search; `export.ts`'s `#0b0d12` is export plumbing, not rendering):
logo plates (44px circle, rank-1 ring in accent), MVP medallions (1/2/3 metal
+ medal ink, 4/5 neutral plates), announcement cell cards (rounded 16px card
+ plate circle + circular logo crop). Rank-1 emphasis (strip + accent)
retained in both themes; code-drawn labels uppercase + `0.08em` letter-spaced
(gradient templates; pmpl-light draws none — baked); numerals all on
`statFont`.

**Contrast, measured (not eyeballed)** — WCAG helpers in
`lib/graphics/layout.ts` (`parseHexColor`, `relativeLuminance`,
`contrastRatio`, `gradientStopColors`, `minContrastAgainstStops`), tests in
`tests/graphics-contrast.test.ts`:

| check                                              | worst case                    | measured |
| -------------------------------------------------- | ----------------------------- | -------- |
| text vs gradient stops (≥ 4.5), all 4 aesthetics   | pink-blossom darkest stop     | 10.84:1 ✓ |
| pmpl-light fallback gradient                       | `#e8ecf5`                     | 13.27:1 ✓ |
| **art table zone** vs `#1c2333` (≥ 4.5)            | mean sRGB (250.4,248.3,252.8), L=0.94854 | **14.93:1** ✓ |
| medal ink vs metals, large-text floor (≥ 3.0)      | pmpl gold `#b57e0d`/white     | 3.53:1 ✓  |

Art method: IHDR → IDAT inflate → unfilter (all 5 filters + Paeth) →
canvas zone x60/y380/w960/h1080 mapped to art px by measured width scale
(57/360/910/1024 on today's file); 931,840 pixels averaged; block min/max
0.8283/0.9846 (uniform light zone). Resolution-independent — re-verifies on
the 2160×3240 file automatically.

Both-themes verification: SSR presence of every new palette value in
light + all three dark aesthetics (`tests/graphics-ssr.test.ts`, extended to
all four ids) + dev-server markers on `:3040` (§8).

## 7. Quality-agent findings (list, fixes, remaining P2s, verdict)

Independent subagent pass (full reads, recomputation, focused suites 150/150,
tsc, eslint, 5 dev routes 200): **no P0, no P1 — verdict MERGE.**
Contrast claims reproduced independently (10.84 worst gradient, 3.53 worst
medal); threading path verified file-by-file.

P2s fixed in `2a80bef`: dev/standings threads `matchCount`/`isFinal`;
calibrate renders via `matchCount={6}`; SSR polish loops cover all four ids;
contrast test asserts distinct-css coverage.

Remaining P2s (accepted, dev-only/nits): dev-sandbox rank-chip drift
(pre-existing, out of scope); `matchCount=0` filename edge (unreachable via
the `confirmedCount > 0` UI gate); MVP React key nit (rank-prefixed keys are
unique while C6.1 ranks 1–5 hold).

## 8. Verification (commands, exit codes, test counts)

All run in `C:\Users\mianq\Projects\Scrimly-p5` (`node_modules` copied from
the main worktree — `npm ci` cannot build `better-sqlite3` here: no VS
toolchain; `package.json`/lockfile untouched, zero new deps):

- `.\node_modules\.bin\vitest.cmd run` → **21 files / 304 tests green**
  (baseline 262 + 42 new), exit 0.
- `.\node_modules\.bin\tsc.cmd --noEmit` → clean, exit 0.
- `.\node_modules\.bin\eslint.cmd` → 0 errors / 0 warnings, exit 0.
- `node …/next/dist/bin/next build` → green (all routes), exit 0.
- Dev server `next dev -p 3040` (port 3000 never touched): after local-only
  `db:migrate` + `db:seed` (gitignored `data/`, seed prints all PASS),
  `dev/calibrate`, `dev/mvp`, `dev/announcement`, `dev/graphics`,
  `dev/standings` → **all 200** with content markers asserted (art src,
  `left:284px`/`top:371px`, plates readout, PMPL Light toggles, subtitles,
  medallion ink, cell cards, legacy `AFTER MATCH 2`).
- Per-commit trees: `fix` commit stages pure Fix A (0 plate refs in staged
  `OverallStandingsGraphic`, verified via `git show :<file>`); each commit
  verified green before the next.

## 9. Limitations and handoff (what the user still owes)

1. **`overall.png` re-export at 2160×3240 (same design, drop-in).** On
   landing: verify IHDR (expect 2160×3240, exact 2:3, ≥1080), add the strict
   Fix B gate test (pass + deliberately-failing temp-copy fixture, never
   committed), re-run the full suite + contrast (auto re-verifies), then merge.
2. **`mvp.png` / `announcement.png` art (lowercase).** On landing: wire into
   `backgrounds`, pixel-measure zones, calibrate specs, pin by test, SSR-assert
   16/19/25 + 5-row MVP. Until then fallbacks render and are pinned.
3. **Dirty-main cleanup** (`app/page.tsx`, `ReviewForm.tsx`, `mapping.ts`,
   `queries.ts`, `matches-confirm.test.ts` + untracked acceptance/shots files)
   stays yours — this branch never touched it and must not be merged with it
   (`git status` on main before merging this branch).
4. **Golden-path export on the real art** remains the ship gate for the
   graphics phase; `pmgc-violet` (aesthetic #2) follows the same pipeline
   later.
