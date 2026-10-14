# P5 — Template Completion Report

## 1. Outcome (Complete; base commit; branch)

**Outcome: Complete.** Fix A (session wiring), Fix B (art gates, amended per
user direction — see §4), and the palette-only parts of Fix D are complete,
tested, and verified. Fix C stays in its documented fallback state because
`mvp.png` / `announcement.png` were never supplied — fallbacks render,
are pinned, and are 200-verified; wiring them later is new-art work, not a
gap in this branch.

- Base commit: `a65a4d1` (P4b pmpl-light calibration; P4a = `c638c3d`).
- Branch: `qasim/p5-template-completion`, isolated worktree `../Scrimly-p5`.
- Commits (unsquashed):
  - `4ceb8d4` fix(templates): thread matchCount and isFinal into standings previews
  - `b7a9fec` feat(graphics): palette-driven polish — plates, medallions, cell cards
  - `530801f` test(graphics): measured contrast and palette coverage
  - `2a80bef` fix(templates): dev routes mirror production prop threading
  - `a308602` chore(templates): accept user re-exported pmpl-light overall art (2132×3200)
  - `957d3de` test(templates): enforce image art ratio and resolution gates
  - docs commits (this report + art-acceptance update).

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
sibling's dirty test, not a regression. Post-P5: **21 files / 306 green**
(+44: 4 filename-matrix, 5 palette-coverage, 18 SSR, 15 contrast, 2 art
gates).

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
`public/templates/pmpl-light/overall.png` = **2132×3200, 8-bit, colorType 6
(RGBA)**, 5,084,527 bytes — the user's re-export, committed verbatim
(`a308602`, byte-identical to the file dropped in main; never regenerated
or edited here).

Gate history: the original 1024×1536 file failed the width gate, so the user
was asked and first directed deferral; mid-session the re-export landed in
main at 2132×3200 — width PASS, but ratio 2132:3200 deviates from exact 2:3
by 4px (|w/h − 2/3| = 0.0004). The user then directed accepting it as-is and
amending the gate: **|w/h − 2/3| ≤ 0.01, width ≥ 1080 unchanged**, with the
rationale that `objectFit: cover` absorbs ≤1% deviation as a centered ~1–2px
crop at canvas scale (verified: cover scale = max(1080/2132, 1620/3200) crops
~1px vertically for this file), while grossly wrong ratios (9:16, 4:5) still
fail. Calibration is unaffected — it lives in canvas space; the ≤0.6px skew
is noise against the 1px test tolerance.

**Gate test** (`tests/graphics.test.ts`, commit `957d3de`): iterates every
image-type background across ALL aesthetics (currently the one pmpl-light
standings case, asserted present), reading IHDR — tolerance + width; a
missing/unreadable file fails the build. Fixture proof (temp scripts, never
committed): real 2132×3200 → PASS; crafted 1080×1920 (9:16) → FAIL;
1080×1350 (4:5) → FAIL; 800×1200 → FAIL (width); old 1024×1536 → FAIL
(width). The contrast test (§6) re-verified automatically against the new
file: table-zone mean (252.7, 251.6, 254.8) vs old (250.4, 248.3, 252.8) —
same design, 15.32:1.

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
| **art table zone** vs `#1c2333` (≥ 4.5)            | mean sRGB (252.7,251.6,254.8), L=0.97475 | **15.32:1** ✓ |
| medal ink vs metals, large-text floor (≥ 3.0)      | pmpl gold `#b57e0d`/white     | 3.53:1 ✓  |

Art method: IHDR → IDAT inflate → unfilter (all 5 filters + Paeth) →
canvas zone x60/y380/w960/h1080 mapped to art px by measured width scale
(118/750/1895/2132 on the accepted file); 4,040,140 pixels averaged; block min/max
0.8974/1.0000 (uniform light zone). Resolution-independent — re-verified
automatically on the re-export (the old 1024 file measured 14.93:1).

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

- `.\node_modules\.bin\vitest.cmd run` → **21 files / 306 tests green**
  (baseline 262 + 44 new), exit 0.
- `.\node_modules\.bin\tsc.cmd --noEmit` → clean, exit 0.
- `.\node_modules\.bin\eslint.cmd` → 0 errors / 0 warnings, exit 0.
- `node …/next/dist/bin/next build` → green (all routes, re-run after the art
  swap), exit 0.
- Art-gate fixtures (temp scripts, never committed): PASS on 2132×3200;
  FAIL on 9:16, 4:5, sub-1080 width, and the old 1024 file.
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

1. ~~**`overall.png` re-export at 2160×3240**~~ — DONE as 2132×3200,
   accepted as-is with the amended gate (see §4). No further action unless a
   future re-export changes dimensions (gate + contrast re-verify automatically).
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
