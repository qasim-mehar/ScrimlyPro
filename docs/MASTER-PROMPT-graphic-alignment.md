# MASTER PROMPT — Fix row-text alignment, team-name truncation & "Match #" typography across all art-backed result graphics

> Copy everything below this line and give it to the coding agent that fixes the graphics.

---

You are a senior software engineer working on **ScrimlyPro** (Next.js + TypeScript). A set of result graphics downloaded from the platform have small but widespread visual defects. Fix them **for every affected template**, not just one, and verify the result visually. Think before you edit, and think again after you edit.

## 1. Objective

For the art-backed **standings** graphics and the **grunge-red MVP** graphic:

1. Every data value inside a table row (rank, team name, all stat numbers) must be **truly vertically centered in the painted row** — never riding the top border, never floating above/outside the row.
2. **Team names must fit** inside their cell (no premature `…` / ellipsis truncation).
3. The number after **"Match #"** must be **larger, clearly spaced from the "#"**, and consistent across templates.
4. Do not change the data, OCR, scoring, brand watermark, or the baked-art labels. Only fix layout measurements and typography.

## 2. Read this first — how the graphics are actually built

- **Configs live in `lib/graphics/aesthetics.ts`** as `TemplateConfig` objects keyed by id (`ewc-yellow`, `onyx-green`, `pmgc-crimson`, `pmwi-violet`, `pmgc-aqua`, `challengers-red`, `grunge-red`, …).
- **Renderer:** `components/graphics/OverallStandingsGraphic.tsx`, function `StandingsRow`. For each row it computes `y = st.rowY0 + rowIdx * pitch`, then paints every cell with `top: y`, `height: st.rowHeight`, and `lineHeight: st.rowHeight px`. **That is the entire mechanism:** text is optically centered in a box of height `rowHeight` whose top edge is `rowY0`. If `rowY0 / rowPitch / rowHeight` do not match the **painted bar geometry in the background art**, the text appears high (uplifted) or low.
- **Per-column pitch:** `effectivePitch()` in `lib/graphics/layout.ts`; `columns[i].fixedRowPitch`, `columns[i].rowsBottom`. The two columns can drift independently if their measurements differ.
- **Team-name truncation:** `columns[i].teamW` vs `standings.nameFont`. `overflow: hidden; text-overflow: ellipsis` in `StandingsRow` is expected, but names must fit at the configured size.
- **Match number:** `subtitleMode: "matchNumber"` means the `variantHeaders.standings.subtitle` slot renders **only the digits** (the art bakes the words "MATCH #"). The relevant fields are `subtitle` (x/y/w/align), `subtitleFont`, `subtitleColor`.
- **Background art to measure against:** `public/templates/<id>/overall.png` (empty painted table). **Target look:** `public/templates/<id>/refrence-image.jpeg|jpg`.
- **Preview route:** `/dev/graphics` (dev-sandbox) renders templates quickly — use it instead of full downloads while iterating.

**Important:** the measurement comments in `aesthetics.ts` may be **stale relative to the current `overall.png` files on disk**. Re-measure from the actual art; do not trust the comments blindly.

## 3. Evidence — the result files I already kept (analyze these)

Open each of these with your image reader and compare it against that template's `overall.png` and reference image:

| Template | Downloaded result to inspect | Observed symptom |
|---|---|---|
| ewc-yellow | `public/templates/ewc-yellow/scrimlypro-standings-after-match-1.png` | Data in each row sits slightly above center; team names truncated (`TRB Gami…`, `4NM Esp…`). |
| onyx-green | `public/templates/onyx-green/scrimlypro-standings-after-match-1 (4).png` | Data lifted, touching the **upper border** of its row. |
| pmgc-crimson | `public/templates/pmgc-crimson/scrimlypro-standings-after-match-1 (3).png` | Data touching the **upper border** of its row. |
| pmwi-violet | `public/templates/pmwi-violet/scrimlypro-standings-after-match-1 (1).png` | Severe: numbers/team names almost **out of their rows**, sitting at the very top. Must push data well down into the vertical center. |
| pmgc-aqua | `public/templates/pmgc-aqua/scrimlypro-standings-after-match-1 (2).png` | Weird split: left column (ranks 1–12) only the **PLACE** value is lifted, others are centered; right column (13–25) **every** value is badly lifted. Needs per-column / per-stat handling. |
| challengers-red | `public/templates/challengers-red/scrimlypro-standings-after-match-1 (5).png` | Same uplift problem as the others. |
| grunge-red (MVP) | `public/templates/grunge-red/scrimlypro-top-5-fraggers (3).png` | Player names truncated (`4NM | BROK…`, `TRB HAN…`). |
| **all templates** | all of the above | The digit after "MATCH #" is too small and sits too close to the `#`. Needs a bigger font and a real gap. |

## 4. Diagnosis — the shared root cause

1. **Vertical offset:** `standings.rowY0` (and/or `rowHeight`) is set **too high** relative to the painted row bars in `overall.png`. Because the renderer centers text inside a `rowHeight` box starting at `rowY0`, a box that starts above the painted bar makes the text look uplifted / top-touching / outside the row. **Fix direction: increase `rowY0` (push text down) until the text-box center equals the painted bar center.** Keep `rowHeight` ≤ `rowPitch` and roughly equal to the bar's interior height.
2. **Per-column drift:** `pmgc-aqua`'s two columns were measured independently; `columns[1]` (teams 13–25) has the wrong `rowY0`/`rowPitch`, and its `pp` (PLACE) stat box in `columns[0]` is also mis-centered. Fix the columns separately.
3. **Name truncation:** `nameFont` px is too large for `teamW`, so CSS ellipsis kicks in. Reduce `nameFont` (e.g. ewc-yellow 24px → ~20px) and/or widen `teamW` only where the painted art has clear space.
4. **Match number:** `subtitleFont` is too small and `subtitle.x` places the digits flush against the baked `#`. Increase the font size, move `x` right to create a visible gap (~8–14 px), widen `w`, keep `align`, and keep `subtitleColor` matched to the art.

## 5. Exact fix instructions

### Phase A — Analyze before editing (mandatory)
For each template: open the result PNG, `overall.png`, and reference image. Measure, in **canvas pixels** (if the art file is larger than 1080 px wide, scale every measurement by `1080 / artWidth`):
- painted row 1 **top** and **height** for the left and right columns,
- the **pitch** (distance between consecutive bar tops),
- the baked "MATCH #" ink end x and the free slot where digits belong.

Write the measured numbers next to the current config values for `rowY0`, `rowPitch`, `rowHeight`, `columns[i].teamW`, and `variantHeaders.standings.subtitle`.

### Phase B — Center the row data
- Set `rowY0` so the text-box center (`rowY0 + rowHeight/2`) lands on the painted bar center for row 1.
- Set `rowPitch` to the measured bar pitch; set `rowHeight` to the bar interior height (keep it within the pitch).
- If every row is high: **increase `rowY0`** by the measured delta. For `pmwi-violet`, push down substantially (its data is far above the rows). For `ewc-yellow`, `onyx-green`, `pmgc-crimson`, `challengers-red`, nudge down by the measured delta.
- `pmgc-aqua`: repair **both** columns separately — fix the left `pp` (PLACE) box and give the right column (13–25) a corrected `rowY0`/`rowPitch` so all its values drop into the row centers.
- Re-check that the **last row still fits** inside the painted table (no overflow below it).

### Phase C — Stop name truncation
- Reduce `standings.nameFont` for `ewc-yellow` (start ~20–21px) and for any other template whose result shows `…`. Keep `800` weight and tabular numerals.
- `grunge-red`: reduce the MVP `name.maxFontSize`/`playerFont` or widen the name box so `4NM | BROK…` / `TRB HAN…` render fully where space allows.

### Phase D — Fix "Match #<n>"
- For every `subtitleMode: "matchNumber"` template, increase `variantHeaders.standings.subtitleFont` to a size comparable to the baked "MATCH #" ink (roughly 34–40 px where the slot allows).
- Move `subtitle.x` right so the digits do not touch the `#`; widen `subtitle.w`; keep `align` and `subtitleColor` matched to the art.
- Verify the digits stay inside the ribbon/slot and don't collide with baked art.

### Phase E — Verify (mandatory)
- Re-render/download the same results through `/dev/graphics` or the real flow.
- Re-open every image and confirm: data centered in every row, names fitting, match number readable and spaced.
- Run the graphics test suite (`npx vitest run tests/graphics*.test.ts tests/ewc-standings.test.ts`) and fix any coordinate assertions that encoded the old (wrong) values — update them to the corrected measurements, do not delete them.

## 6. Constraints
- Do **not** change the rendering architecture, data/OCR pipeline, brand watermark, or baked-art labels.
- Keep changes scoped to `lib/graphics/aesthetics.ts` (measurements/fonts), minimal renderer tweaks only if unavoidable, and affected tests.
- Update the stale measurement comments in `aesthetics.ts` to reflect the new, re-measured values.

## 7. Acceptance criteria
- [ ] No row value touches the top border or sits outside its painted row in any of the 6 standings templates.
- [ ] `pmgc-aqua` left PLACE column and entire right column are centered.
- [ ] Team names render fully (or ellipsis only for genuinely over-long names).
- [ ] "Match #<n>" digits are larger, spaced from `#`, and inside the slot in all templates.
- [ ] grunge-red MVP names are no longer cut short.
- [ ] Freshly downloaded results match the reference images' alignment; tests pass.

## 8. MANDATORY SECOND PASS — THINK AGAIN
After you believe you are done, stop and do a **full second review**. Do not skip this. Answer each question explicitly:

1. Did re-measuring against the **current** `overall.png` change any of the old config values? If the art changed, are the `fit` crop offsets (`pmwi-violet`, `pmgc-aqua`) still correct?
2. Did increasing `rowY0` push the **last row (25)** below the painted table, or push row 1 into the baked header band?
3. Does the fix for one template accidentally break another that shared a value? (e.g. `header.subtitle` is shared with gradient MVP/announcement fallbacks — only `variantHeaders.standings` should change for standings.)
4. Are the match-number digits actually bigger and spaced, or did a larger font clip inside `subtitle.w` / collide with baked ink?
5. Are there templates **not listed** that share the same root cause? Scan all art-backed configs and fix them too.
6. Are the test assertions and comments now consistent with the new values?
7. Look at the freshly generated images one more time with fresh eyes. If anything still looks off, iterate before reporting done.

Report what you changed per template, the before/after values, and the verification results.
