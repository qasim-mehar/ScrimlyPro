# P7 — Font Swap (Exo 2) + Template Fixes Report

## 1. Outcome (Complete; base commit; branch)

**Outcome: Complete.** Exo 2 is now the primary display face across every
graphics aesthetic (Rajdhani retained as the metric fallback), data-bearing
fonts moved 600 → 700, and three per-theme config flags landed:
`hideScrimName` (neon-green), `uniformMvpRows` (all six aesthetics),
`watermarkYOffset` (pmpl-light announcement, `16`). Two calibration values
changed after WOFF1/art-pixel measurement: neon subtitle slot width 44 → 48
and the pmpl-light announcement watermark y 1570 → 1586. Art files were never
edited. Quality-agent pass: **no P0, no P1 — verdict MERGE** (§6).

- Base commit: `c0f6774` (`main` tip after P5 + P6 were fast-forwarded in — §2).
- Branch: `qasim/p7-font-and-fixes`, isolated worktree `../Scrimly-p7`.
- Commits (unsquashed):
  - `f2e0460` feat(fonts): swap Rajdhani for Exo 2 across all graphics
  - `9b2d1b9` feat(templates): uniform MVP rows, hide-scrim-name, watermark offset
  - `73021c4` test(graphics): pin Exo 2 stack, font wiring and data-fit guarantees
  - `838dec2` docs(readme): P7 notes — Exo 2 swap, flags, measured calibration
  - `7fa70b7` test(graphics): cover MVP watermark variant; repair describe-name encoding
  - `336c691` chore(docs): P7 review corrections (measured numbers, stale font comments)
  - docs commit (this report).

**Plan deviation (recorded):** the prompt listed 6 commits (a separate
calibration commit for pmpl-light + neon). Measurement showed only two
coordinate values needed to change (neon `subtitle.w` 44 → 48,
`watermarkYOffset` 16) and both live in `lib/graphics/aesthetics.ts`, the same
file as the font swap — so those steps were folded into `f2e0460` instead of
creating commits whose diffs would have been 2 lines inside a file otherwise
identical. All other commits are self-contained and green in isolation.
`7fa70b7`/`336c691` are the quality-review follow-ups (§6).

## 2. Baseline (main merge of P5+P6; environment; setup deviations)

**Main must contain P6 (precondition) — done by fast-forward:**
- Verified `main` @ `a65a4d1` was an ancestor of `qasim/p6-three-aesthetics`
  (FF possible) and byte-verified the 4 art files: working-tree files hashed
  with `git hash-object` matched the branch blobs exactly (`overall.png`
  `ab52fe72…`, `neon-green/overall.png` `4af5b5c6…`,
  `challengers-red/mvp.png` `f96f4e32…`, `pmpl-light/announcement.png`
  `34dbf846…`). Main's duplicated untracked copies were then removed /
  restored, and `git merge --ff-only qasim/p6-three-aesthetics` moved `main`
  `a65a4d1 → c0f6774` (29 files).
- Main's dirty sibling work was never touched: `app/page.tsx`,
  `components/matches/ReviewForm.tsx`, `lib/matches/mapping.ts`,
  `lib/sessions/queries.ts`, `tests/matches-confirm.test.ts` (modified) plus
  untracked acceptance/screenshot files.
- Main baseline: **21 files / 349 green** (348 + 1 from the dirty sibling
  test file).

**Setup deviations (no STOP — all benign):**
- `npm install` cannot build `better-sqlite3` here (gyp, node 25, no VS
  toolchain) → `node_modules` copied from the P6 worktree; the single
  authorized new dep `@fontsource/exo-2@^5.3.0` was installed with
  `--ignore-scripts` (package.json +1 line, lockfile +10).
- `data/scrimly.db` (+ shm/wal, untracked, gitignored) and `.env.local`
  (`SAMPLE_OCR=1`) copied from the P6 worktree for the dev smoke; dev server
  on `:3040` (port 3000 never touched).
- P7 baseline in the worktree: 21 files / 348 green; `tsc` clean; `eslint`
  clean; `next build` green.
- Post-P7 gates: **365 green (+17)**, `tsc` clean, `eslint` 0 errors,
  `next build` green with Exo 2 woff2 emitted under `.next/static/media`.

## 3. Font swap evidence (method, stack, measured widths)

**Measurement method:** Fontsource ships **WOFF1** files (original flavor),
which are parseable in-process with Node `zlib` alone — WOFF header (44 B) →
table directory (20 B/entry) → `zlib.inflateSync` → `head`/`hhea`/`cmap`(4)/
`hmtx`/`glyf`. No new runtime or dev dependencies were needed. Exo 2:
`unitsPerEm` 1000, `hhea` ascent 999 / descent −201, cmap format 4.

**Stack (all six aesthetics, every shorthand):**
`"Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif` —
`lib/graphics/aesthetics.ts` (`FONTS`), `components/graphics/GraphicCanvas.tsx`
(`FONT_STACK`, `WATERMARK_FONT`), `app/globals.css` (`--font-display`).
`app/layout.tsx` imports `@fontsource/exo-2/{500,600,700,800}.css` and keeps
the Rajdhani 500/600/700 + Noto imports (fallback + C1.1 glyph set). 800 is
loaded per spec and currently unused by any shorthand (reserved; noted in
README).

**Widths (700 unless noted; Exo 2 vs Rajdhani ≈ +15–22%):**

| string / context | size | Exo 2 | Rajdhani | conclusion |
| --- | --- | --- | --- | --- |
| `scrimlypro.com` (600) | 26px | 187.98 | 159.82 | watermark fits brand-law box unchanged |
| `Zero Degree Esports` | 28px | 270.17 (231.14 @ Rajdhani 700) | | still ellipsizes in pmpl `teamW` 158 |
| 3-digit stat worst case `444` | 30px | 57.33 | 44.6 | fits 58px value box (0.67px margin) |
| `999` (kills) | 34px | 60.18 | — | fits kills box 90 |
| slots `01` / `25` | 28px | 29.76 / 31.72 | — | fit slot box 48 |
| subtitle `12` | 44px | 44.57 | — | drove neon slot w 44 → 48 |
| `TRB ZORAWAR` | 36px | 250.38 | — | >200 → ellipsizes (accepted limit) |
| title/dev strings | 72px | ≤ 793.1 (`GLYPH TORTURE SCRIM`) | — | < w900 titles |

**Weight bump:** standings `nameFont`/`statFont`, MVP `playerFont`/`statFont`,
announcement `slotFont`/`nameFont` 600 → 700 (`lib/graphics/aesthetics.ts`);
titles, subtitles and labels unchanged. All fit re-verification above was done
at the new weights against the shipped WOFF1 metrics.

## 4. Config flags + renderer evidence

**`lib/graphics/types.ts`** — three optional, documented fields:

- `hideScrimName?: boolean` — renderer skips the scrim-name/title slot.
  Set **neon-green only**. All three renderers honor it
  (`OverallStandingsGraphic` `StandingsHeader`, `MvpGraphic`,
  `AnnouncementGraphic`), including neon's gradient-fallback MVP/announcement
  variants where no baked title band exists — intended per the prompt's "skip
  the scrims-name slot entirely (all three renderers)".
- `uniformMvpRows?: boolean` — every MVP row renders identically: neutral
  `plateBg` plate with `plateRing` border, rank digit in `palette.text`, name
  and kills in `palette.text`, no rank-1 strip/accent, no medal fills.
  Set **true for all six** (shared `GEOMETRY` + three per-theme configs).
  `MvpGraphic` computes `isMedal = !uniform && rank ∈ 1..3`; the strip is
  gated `isRankOne && !uniform`; name/kills colors use the same guard. The
  non-uniform path is unchanged (stays available for future themes; medal
  palette values remain in every config, now unrendered).
- `watermarkYOffset?: number` — added to the brand-law y **only for
  `variant === "announcement"`** (`GraphicCanvas`); standings/MVP keep
  `top:1570px` unconditionally (now asserted for both — §6/F6).

**Neon subtitle slot 44 → 48** (`aesthetics.ts` neon `subtitle.w`): the only
standings/VALUE coordinate change. Exo 2 `12` @ 700 44px = 44.57px; at
`x609` the ink ends 653.6, inside both the w48 slot and the baked chip's right
edge (659.8).

**Watermark offset 16 (pmpl-light announcement) — derivation:**
Exo 2 `scrimlypro.com` @ 600 26px inks from divTop+7.7 to divTop+31.4 (glyf
bounds; baseline at divTop+25.97 from hhea 999/1000). Art measured read-only
with `sharp` (2132×3200 → canvas ×1.97407/×1.97531): the footer's dark border
line occupies canvas y1579.5–1583.0, and a diagonal notch descends to
(x852, y1595.2); the strip is otherwise flat (lum 212.5–217.6, 0 px < 200 in
x852–1040 / y1596–1618). Results: offset 16 → ink 1593.7–1617.4 (below the
border, ≥3.7px clear of the notch at the first glyph, descenders 2.64px above
the canvas edge); offset **19+ would clip** (bottom 1620.4). The prompt's
"~20–30" target is unreachable for this strip at 26px without clipping, so 16
is the measured maximum with bottom safety (documented in README).

## 5. New test coverage (+17 tests → 365 total)

- `tests/graphics.test.ts` (+8 declarations): fixture font strings moved to
  `'700 30px "Exo 2", "Rajdhani", sans-serif'`; the font-stack test asserts
  Exo 2 primary + Rajdhani fallback ordering across all config font fields
  (incl. `variantHeaders.announcement`); new describes
  **"P7 — font swap + template flags"** (uniformMvpRows on all six,
  hideScrimName neon-only, watermarkYOffset 16 pmpl-only, data fonts all lead
  `700`, no `px "Rajdhani"` primary anywhere) and
  **"P7 — font wiring (source-level)"** (layout imports 500–800 + keeps
  Rajdhani, `--font-display` token, `GraphicCanvas` `FONT_STACK`+
  `WATERMARK_FONT` sources).
- `tests/graphics-ssr.test.ts` (+3 declarations + `it.each`): the medallion
  test became "MVP rows render uniformly (P7): neutral plates, no metals, no
  rank-1 accent" — negatives scoped to `background:${medalGold|Silver|Bronze}`,
  `color:${medalText}`, `wwcdBg` strip (raw color equality is unusable:
  dark-gold's `medalGold` equals its `accent`, pmpl's `medalText` equals
  `plateBg`); P7 SSR describe renders every aesthetic and asserts Exo 2 in
  inline styles with ordering, `hideScrimName` title suppression (neon only,
  all three renderers), watermark y per variant (1570 for standings/MVP,
  1570+offset for announcement), and `it.each(IDS)` 16/19/25-team renders
  across all six aesthetics.
- `tests/mvp-announcement.test.ts`: font assertion moved to the Exo 2 stack.
- Regression sensitivity spot-checked by the quality agent (flip
  `hideScrimName` theme → fail; unset one `uniformMvpRows` → fail; leak the
  offset into standings → fail; leak into MVP → caught after F6 fix). Source-
  level string pins are intentionally brittle (change-detector style, matching
  the P4/P5 precedent).

## 6. Quality-agent findings (list, fixes, remaining P2s, verdict)

Independent adversarial subagent (own WOFF1 parser, own `sharp` rect/notch
measurements, full file reads, full 365-test suite, tsc, lint, dev smoke,
diff-scope audit): **no P0, no P1 — verdict MERGE.**

Independently reproduced: watermark ink +7.67/+31.36 vs offset-16 placement
(worst art-pixel luminance under glyph ink boxes 213; clean-zone min 212.5);
notch end (852, 1595); offset 19 clipping (1620.36) and 16 safe; neon `12`
= 44.57px; "Zero Degree Esports" 270.17 @28; `01`/`25`/`999` matches; suite
365 (not 359 — the earlier count predated the `it.each` expansion); tsc/lint
clean; `git diff c0f6774..HEAD` exactly the 14 intended files; `public/`
untouched.

**Fixed in review commits:**
1. (F1/F3/F9, P2) README P7 notes corrected: test count 359 → **365** (+17,
   incl. the `it.each(IDS)` 6-way expansion), ink-derived absolute (1593.7,
   not 1592.8), "offset 19+ clips" (not 20+), worst-case stat string `444`
   57.3px, checked title strings max 793.1px, Rajdhani comparison is the 700
   face (231.1px). — `336c691`
2. (F6, P2) Watermark SSR test now also renders `variant:"mvp"` and asserts
   `top:1570px`, closing an offset-leak gap. — `7fa70b7`
3. (F8, P2) Stale "Rajdhani + Noto" wording in dev-glyph-torture / glyphNames
   headers now names the Exo 2 stack. — `336c691`
4. (process) The first PowerShell append wrote two describe titles and the
   README section in cp1252 (0x97 em dashes, invalid UTF-8). All touched files
   were byte-repaired to strict UTF-8 and re-validated; commits `7fa70b7`
   (tests) / `336c691` (README). No other file was affected.

**Remaining P2s (accepted, none block merge):**
1. Neon two-digit match counts **≥20** can pass the baked chip's right edge
   ("20" = 53.3px → ends 662.3 vs chip 659.8); counts 10–19 fit. Documented
   in README known limits.
2. `hideScrimName` also suppresses the title on neon's gradient-fallback
   MVP/announcement exports (no baked band exists there) — intended per the
   prompt wording; documented in the README notes.
3. Exo 2 **800** is loaded but unused (spec-mandated import; reserved).
4. Medal palette values are now dead in all six configs until a
   `uniformMvpRows: false` theme exists (kept intentionally + documented).
5. Challengers MVP IGNs of 10+ chars ellipsize (wider face); "TRB ZORAWAR"
   250.4px @36px vs box 200 — accepted, art untouched.
6. Source-pin tests (layout/CSS sources) are brittle by design.

## 7. Verification (commands, exit codes, test counts)

All run in `C:\Users\mianq\Projects\Scrimly-p7` (dev smoke on `:3040`):

- `npm test` → **21 files / 365 tests green** (baseline 348, +17), exit 0.
- Focused runs during development: graphics + ssr + contrast +
  mvp-announcement + session-input → 188 green; single-file ssr run 34 green.
- `npx tsc --noEmit` → exit 0; `npm run lint` → 0 errors; `npm run build` →
  "Compiled successfully in 20.0s" with `exo-2-*-normal.*.woff2` bundled in
  `.next/static/media`.
- Dev smoke: `/`, `/sessions/new`, `/dev/standings`, `/dev/announcement`,
  `/dev/mvp`, `/dev/calibrate` all 200; wizard shows "(placeholder)" /
  "(partial)" + Neon Green / Challengers Red options; announcement renders
  `>01<` + Exo 2; neon standings has no `>SCRIM<` title; gradient announcement
  watermark stays `top:1570px` (pmpl path covered by SSR tests — the dev
  announcement route hardcodes the gradient template).
- Art integrity: `git diff c0f6774..HEAD -- public/` empty — all four art
  files byte-identical to the P6 merge.
- `git status` clean at HEAD; every commit self-consistent.

## 8. Limitations and handoff (what the user still owes)

1. **Watermark sits at 1586, not 1590–1600.** The prompt's "~20–30px lower"
   is geometrically impossible for the 26px brand-law watermark on this art:
   the ink is 23.7px tall and everything below y1596 is within 2.6px of the
   canvas edge; offset 19 clips. 16 is the measured maximum. Moving further
   would need a different font size (breaks brand law) or an art change
   (out of scope). If brand later allows, dropping to 24px would enable
   offsets up to ~20.
2. **Neon counts ≥20 overflow the baked chip** (§6 P2 1). Counts ≤19 render
   clean; a wider slot than 48 starts to miss the chip's left cap.
3. **Challengers 10+ char IGNs ellipsize** (Exo 2 wider); acceptable until a
   real-data pass shows longer names.
4. **Medals are now unused everywhere**; re-enable per-theme by clearing
   `uniformMvpRows` (renderer path intact and covered by pre-existing tests).
5. **Pre-existing dead code unchanged:** pioneer `organizer` slot == title
   slot (all callers pass `null`); JPEG-zone contrast constants unchanged.
6. **Merge:** `qasim/p7-font-and-fixes` is a clean fast-forward candidate from
   `main` @ `c0f6774`; do not merge main's dirty sibling work along with it.
7. **Golden-path browser export** (Exo 2 actually painting in exported PNGs
   via html-to-image) remains the ship gate for the graphics phase — this
   lane verified fonts/metrics/geometry programmatically + SSR + dev-server
   smoke (no browser automation available here).
