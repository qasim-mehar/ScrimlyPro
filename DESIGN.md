---
name: ScrimlyPro Auth Console
description: A calm control room for sign-in and registration — a dark standings instrument beside a precise credential panel.
colors:
  ground: "#0b0d12"
  surface: "#12151c"
  surface-2: "#1a1e28"
  line: "#272d3b"
  ink: "#0b0b0d"
  paper: "#f7f8f4"
  paper-ink: "#101212"
  paper-muted: "#5f645f"
  paper-line: "#dfe3dc"
  muted-ink: "#656a63"
  danger: "#b3261e"
  gold: "#f5c542"
  lime: "#d9f99d"
  blue: "#3e6ff0"
  red: "#e5473b"
  yellow: "#f5b62e"
  green: "#3ea55c"
  satisfied: "#1f6f38"
typography:
  display:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(30px, 7vw, 38px)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(20px, 5vw, 28px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  input:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  pill: "999px"
  panel: "28px"
  panel-mobile: "24px"
  input: "13px"
  message: "12px"
  reveal: "10px"
  brandmark: "11px"
spacing:
  field-gap: "16px"
  form-top: "28px"
  label-gap: "8px"
  input-height: "52px"
  button-height: "52px"
  form-cap: "420px"
  panel-pad-mobile: "28px 20px 44px"
  panel-pad-desktop: "48px clamp(40px, 5vw, 88px)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "52px"
  input-field:
    backgroundColor: "#ffffff"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.input}"
    padding: "0 52px 0 46px"
    height: "52px"
  card-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.panel-mobile}"
    padding: "{spacing.panel-pad-mobile}"
  message-success:
    backgroundColor: "#eaf3d6"
    textColor: "#0a3d30"
    rounded: "{rounded.message}"
    padding: "12px 14px"
  message-failure:
    backgroundColor: "#fdecea"
    textColor: "#8e1d17"
    rounded: "{rounded.message}"
    padding: "12px 14px"
---

# Design System: ScrimlyPro Auth Console

## Overview

**Creative North Star: "The Standings Control Room"**

Authentication here is an instrument, not a pitch. A dark field carries the product's own standings output as a schematic SVG board; beside it, a warm off-white credential panel does one job — get an organizer into their session. The split is the identity: remove every word and the 46/54 grid, dot field, gold rank-one row, and 999px pill still read as ScrimlyPro. It deliberately refuses the generic centered auth card and the marketing hero.

The two halves use different materials and never blend. The field is ground `#0b0d12` with `#12151c`/`#1a1e28` surfaces, `#272d3b` hairlines, and a 26px dot grid; the panel is paper `#f7f8f4` with near-black ink and `#dfe3dc` 1px rules. Colour is information, not decoration: gold marks rank one, lime drives the scan sweep, and the four strength steps borrow red, yellow, blue, and green. Mobile keeps the desktop order — board first as a compact banner, form second — because organizers arrive from a match on a phone.

Motion is quiet and authored: one 7-second scan sweep across the board, 160–200ms state transitions on controls, and a reduced-motion path that stops the sweep and drops transitions. Feedback is advisory — password strength never gates submission — and every status message is a soft, blurred, tinted card rather than a modal.

**Key Characteristics:**
- Two-material 46/54 split with a 420px form cap
- Schematic standings board as proof, never invented claims
- 999px primary pill, 1px hairlines, soft blurred depth
- Contrast-compliant muted ink (`#656a63`, 5.19:1) and satisfied green (`#1f6f38`, 5.81:1)
- Lexend headlines over Inter body and tabular data

## Colors

The palette is a cool instrument dark paired with a warm paper light; six saturated accents are reserved strictly for signal.

### Primary
- **Instrument Ground** (`#0b0d12`): Base of the dark stage and of the root behind both halves.
- **Raised Surface** (`#12151c`) and **Surface Two** (`#1a1e28`): The stage gradient and the brand-mark plate; they lift elements without adding shadows.

### Secondary
- **Warm Paper** (`#f7f8f4`): The credential panel and the light material behind all form content.

### Tertiary
- **Rank Gold** (`#f5c542`): Rank-one row, brand mark, and the submit focus ring.
- **Scan Lime** (`#d9f99d`): The slow board scan sweep, the rank-one bar, and text selection on the panel.
- **Signal Red** (`#e5473b`), **Signal Yellow** (`#f5b62e`), **Signal Blue** (`#3e6ff0`), **Signal Green** (`#3ea55c`): Strength-meter steps 1 through 4, in that order.

### Neutral
- **Panel Ink** (`#0b0b0d`): Form title, focused field icons, and the submit pill fill.
- **Paper Ink** (`#101212`): Panel base text and input text.
- **Paper Muted** (`#5f645f`): Lede, strength caption, and account-switch row (5.67:1 on paper).
- **Muted Ink** (`#656a63`): Placeholders, field icons, reveal control, unmet requirements, and the home link — the lightest muted ink allowed on paper (5.19:1).
- **Hairline Dark** (`#272d3b`) / **Hairline Paper** (`#dfe3dc`): The only structural lines, always 1px.
- **Danger** (`#b3261e`): Error field borders and inline field errors.
- **Satisfied** (`#1f6f38`): Met requirements and the "Strong" strength label (5.81:1).

### Named Rules

**The Two Materials Rule.** The dark instrument field and the warm paper panel are separate materials meeting at one edge; never blend, tint, or merge them into a single surface.

**The Signal-Only Accent Rule.** Gold, lime, red, yellow, blue, and green are instrument signals — rank one, scan sweep, strength steps — and never become buttons, links, or page chrome.

**The Legible Mute Rule.** Muted text on paper never goes lighter than `#656a63` on `#f7f8f4` (5.19:1); satisfied state uses `#1f6f38` (5.81:1). Legibility earns the value, not the other way around.

## Typography

**Display Font:** Lexend (exposed as `--font-lexend`, with ui-sans-serif and system-ui fallbacks)  
**Body Font:** Inter (exposed as `--font-inter`, with the same fallbacks)  
**Label/Mono Font:** None distinct — labels and board numerals also use Inter, with `tabular-nums` for data.

**Character:** A geometric, compact display face for the few headline moments over a neutral workhorse face for everything operational; both stay tight-tracked and never decorative.

### Hierarchy
- **Display** (700, `clamp(30px, 7vw, 38px)`, 1.06, -0.03em): Form heading — "Back in the lobby." / "Start your next scrim."; `text-wrap: balance`.
- **Headline** (700, `clamp(20px, 5vw, 28px)`, 1.1, -0.03em): Stage tagline — "Screenshots in. Standings out."
- **Brand** (700, 18px, -0.02em): "ScrimlyPro" lockup; board brand repeats at 15px with 0.14em tracking.
- **Body** (400, 14px, 1.6): Lede, capped at 36ch; stage sub is 13px / 1.55, capped at 34ch.
- **Label** (600, 13px): Field labels; the account-switch row is 13.5px.
- **Input** (inherited weight, 15px): Field text; caret is `#0e4b3b`.
- **Micro** (600–700, 9.5–12px, 0.14–0.16em uppercase): Brand tag, board captions and column heads; requirement text is 11.5px / 1.35 in sentence case.

### Named Rules

**The Two-Face Rule.** Lexend owns every headline; Inter owns every body string, label, and data value. Never introduce a third face or fall back to a system display face.

## Layout

The root is a single-column grid on small screens, becoming an exact 46% / 54% split at `min-width: 1000px`; both halves are `min-height: 100svh`. The dark stage stacks brand, board, and tagline with a 14px gap (padding 20px 18px 26px on mobile; `clamp(32px, 3.6vw, 56px)` on desktop). The board is capped at 300px wide / 202px tall on mobile and 520px wide on desktop, with one slow scan line crossing it.

The paper panel carries 28px 20px 44px padding and 24px top corners on mobile, and `48px clamp(40px, 5vw, 88px)` padding with 28px left corners on desktop, where its content is vertically centred. All form content lives in a column capped at 420px — centred on mobile, left-aligned on desktop. Fields are stacked with a 16px gap and 28px above the form; labels sit 8px above 52px-tall shells. At 390px the board reads as a compact banner above the form; no horizontal scroll is introduced (`overflow-x: clip`).

### Named Rules

**The Split Control-Room Rule.** At 1000px and up the field is 46% and the panel 54%, with the form capped at 420px; below that, the board becomes a compact banner above the form rather than a second column.

## Elevation & Depth

The system is flat at rest. Depth is conveyed only by soft, blurred, offset shadows under the submit pill, status cards, and notice, plus a 1px inset highlight on the brand mark; the dot grid and hairlines carry structure instead of stacked surfaces. The scan sweep is motion, not elevation.

### Shadow Vocabulary
- **Submit rest** (`box-shadow: 0 12px 26px -10px rgba(11, 11, 13, 0.45), 0 2px 6px rgba(11, 11, 13, 0.14)`): Primary pill at rest.
- **Submit hover** (`box-shadow: 0 16px 30px -10px rgba(11, 11, 13, 0.5), 0 3px 8px rgba(11, 11, 13, 0.16)`): Pairs with `translateY(-2px)`.
- **Panel lift** (`box-shadow: 0 -18px 50px -38px rgba(0, 0, 0, 0.65)`): The paper panel edge over the dark field.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(217, 249, 157, 0.6)`): Focused input shell; error state uses `0 0 0 3px rgba(179, 38, 30, 0.16)`.
- **Status lift** (`box-shadow: 0 10px 22px -16px rgba(10, 61, 48, 0.55)` success / `rgba(145, 29, 23, 0.5)` failure): Tinted message cards.
- **Brand inset** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07)`): Top-edge light on the brand mark.

### Named Rules

**The Soft-Depth Rule.** Depth is diffuse and blurred with generous negative spread; hard offset shadows are not part of this world.

## Shapes

Actions are fully rounded pills (999px). Structure is quiet: 1px hairlines, 13px input shells, 12px status cards, 10px reveal buttons, and an 11px brand-mark plate; the paper panel has 24px top corners on mobile and a 28px left edge on desktop. The board repeats a 22px frame, 10px row plates, 4px bar caps, and a 1px scan line. The recurring ground motif is a 26px dot grid drawn as a 1px `rgba(255, 255, 255, 0.13)` radial dot, layered under a 158° surface-to-ground gradient.

### Named Rules

**The Pill and Hairline Rule.** Calls to action are 999px pills; everything structural is a 1px rule with a modest radius, never a heavy border.

## Components

### Buttons
- **Shape:** Full pill (999px); 52px minimum height; 15px / 600 label with a 10px gap and an 18px inline arrow.
- **Primary:** `--ink` (#0b0b0d) fill, white text, no border; soft two-layer shadow.
- **Hover / Active / Focus:** Hover lifts `translateY(-2px)` with a larger blur; active settles to `translateY(0) scale(0.99)`; `:focus-visible` switches the outline to `--gold` on top of the panel's 2px ink outline; disabled drops to 0.5 opacity.
- **Reveal:** 44×44px, 10px radius, transparent, `#656a63` inline eye icon; hover fills `#f0f2ec` and turns the icon to ink.

### Inputs / Fields
- **Style:** 52px white shell, 1px `#dfe3dc` border, 13px radius; icon at 15px from the left; text padded `0 52px 0 46px`.
- **Focus:** Border shifts to `#0b0b0d` with a `0 0 0 3px rgba(217, 249, 157, 0.6)` lime halo; the icon darkens with it.
- **Error / Disabled:** Error border `--danger` with a red-tinted halo; `#b3261e` 12.5px / 600 message below; disabled fields drop to 0.6 opacity with a not-allowed cursor.

### Password Strength
Four 5px-tall meter segments (999px, 6px gap) on a `#e4e7df` track, filling red → yellow → blue → green as the score rises; labels take the darker counterparts (`#c2352c`, `#9a6506`, `#2d55c4`, `#1f6f38`). Two-column requirement list in 11.5px muted ink, with met items in `#1f6f38`. Purely advisory: a weak-but-valid password still submits.

### Cards / Containers
- **Corner Style:** Panel 24px/28px; notice and status cards 12px.
- **Background:** Paper `#f7f8f4` panel; notices and success use `#eaf3d6` with `#0a3d30` text, failures use `#fdecea` with `#8e1d17` text.
- **Shadow Strategy:** See Elevation & Depth — panel lift and status lift only.
- **Border:** 1px tinted hairline on status cards; none on the panel.

### Standings Board (signature)
A 520×560 schematic SVG, hidden from assistive tech, drawn in the same tokens: gold frame at 22% alpha, Lexend brand at 15px / 0.14em, Inter column heads at 10px / 0.16em, five demo rows with tabular numerals, a gold rank-one plate with a lime bar, and one lime scan line over a 7s loop. It is product proof, not a claim about customers.

## Do's and Don'ts

### Do:
- **Do** keep the 46% / 54% split at ≥1000px and cap the form at 420px.
- **Do** hold muted text on paper at `#656a63` or darker and satisfied text at `#1f6f38`.
- **Do** reserve gold, lime, red, yellow, blue, and green for board and meter signals.
- **Do** keep password strength advisory so a valid weak password can still submit.
- **Do** stop the scan sweep and drop transitions under `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** use hard offset shadows; this world's depth is soft and blurred.
- **Don't** centre the form in a floating card; the panel is a full-height material half of the split.
- **Don't** swap the Lexend/Inter pairing or substitute a system display face.
- **Don't** use icon fonts or glyphs; icons are inline 20px SVG strokes at 1.75px.
- **Don't** blend the dark field and paper panel into one tinted surface.
