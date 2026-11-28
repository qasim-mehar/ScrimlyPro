---
name: ScrimlyPro Auth Console
description: A calm control room for sign-in and registration — a credential panel that leads on phones, a dark standings instrument beside it on desktop.
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
  grid-dot: "rgba(255, 255, 255, 0.13)"
  board-rule: "rgba(255, 255, 255, 0.12)"
  spinner-track: "rgba(255, 255, 255, 0.35)"
  board-muted: "#8b93a7"
  board-value: "#aeb6c8"
  stage-muted: "#a7aebd"
  stage-ink: "#edf0f5"
  forest-ink: "#0e4b3b"
  forest-line: "rgba(14, 75, 59, 0.2)"
  forest-line-soft: "rgba(14, 75, 59, 0.18)"
  forest-shadow: "rgba(10, 61, 48, 0.5)"
  success-bg: "#eaf3d6"
  success-ink: "#0a3d30"
  white: "#ffffff"
  strength-weak: "#c2352c"
  strength-fair: "#9a6506"
  strength-good: "#2d55c4"
  failure-line: "#f3cfca"
  failure-bg: "#fdecea"
  failure-ink: "#8e1d17"
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
  brand:
    fontFamily: "Lexend, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.02em"
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
  detail:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    lineHeight: 1.45
  small:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
  fine:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11.5px"
    lineHeight: 1.5
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.14em"
  micro:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "9.5px"
    fontWeight: 700
    letterSpacing: "0.16em"
rounded:
  pill: "999px"
  panel: "28px"
  panel-mobile: "24px"
  input: "13px"
  message: "12px"
  reveal: "10px"
  brandmark: "11px"
  focus: "6px"
  rail-dot: "3px"
spacing:
  field-gap: "16px"
  form-top: "22px"
  label-gap: "8px"
  input-height: "52px"
  button-height: "52px"
  form-cap: "420px"
  social-top: "26px"
  panel-brand-gap: "26px"
  stage-gap: "18px"
  rail-width: "180px"
  rail-gap: "clamp(32px, 4vw, 56px)"
  panel-pad-mobile: "22px 20px 36px"
  panel-pad-desktop: "48px clamp(32px, 3.5vw, 64px)"
  stage-pad-mobile: "28px 20px 36px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "52px"
  button-google-soon:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.message}"
    padding: "0 14px"
    height: "48px"
  badge-soon:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  input-field:
    backgroundColor: "{colors.white}"
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
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.message}"
    padding: "12px 14px"
  message-failure:
    backgroundColor: "{colors.failure-bg}"
    textColor: "{colors.failure-ink}"
    rounded: "{rounded.message}"
    padding: "12px 14px"
---

# Design System: ScrimlyPro Auth Console

## Overview

**Creative North Star: "The Standings Control Room"**

Authentication here is an instrument, not a pitch. A dark field carries the product's own standings output as a schematic SVG board; beside it, a warm off-white credential panel does one job — get an organizer into their session. The split is the identity: remove every word and the dot field, gold rank-one row, and 999px pill still read as ScrimlyPro. It deliberately refuses the generic centered auth card and the marketing hero.

The two halves use different materials and never blend. The field is ground `#0b0d12` with `#12151c`/`#1a1e28` surfaces, `#272d3b` hairlines, and a 26px dot grid; the panel is paper `#f7f8f4` with near-black ink and `#dfe3dc` 1px rules. Colour is information, not decoration: gold marks rank one, lime drives the scan sweep, the four strength steps borrow red, yellow, blue, and green, and blue/green/yellow diamonds mark the three product moves in the rail. On a phone the credential panel leads — compact brand lockup, heading, a visibly disabled Google option with a SOON badge, every field and the submit pill inside the first 844px viewport — and the board follows below as proof, because organizers arrive from a match on a phone.

Motion is quiet and authored: one 7-second scan sweep across the board, 160–200ms state transitions on controls, and a reduced-motion path that stops the sweep and drops transitions. Feedback is advisory — password strength never gates submission — and every status message is a soft, blurred, tinted card rather than a modal. At 1280px and up a hairline-separated three-step rail turns the otherwise empty right half into a real product sequence: upload, confirm, download, in about 90 seconds per match.

**Key Characteristics:**
- Credentials first on phones; 46/54 split at desktop with a 420px form cap
- Schematic standings board as proof, never invented claims
- 999px primary pill, 1px hairlines, soft blurred depth
- Contrast-compliant muted ink (`#656a63`, 5.19:1) and satisfied green (`#1f6f38`, 5.81:1)
- Lexend headlines over Inter body and tabular data
- Disabled Google option marked SOON, never a faked sign-in
- Three-step flow rail with blue/green/yellow rotated-square bullets at ≥1280px

## Colors

The palette is a cool instrument dark paired with a warm paper light; six saturated accents are reserved strictly for signal, with a forest-green ink for product language on paper.

### Primary
- **Instrument Ground** (`#0b0d12`): Base of the dark stage and of the root behind both halves.
- **Raised Surface** (`#12151c`) and **Surface Two** (`#1a1e28`): The stage gradient and the brand-mark plate; they lift elements without adding shadows.

### Secondary
- **Warm Paper** (`#f7f8f4`): The credential panel and the light material behind all form content.
- **Field White** (`#ffffff`): Input shells and the disabled Google control — the only fully white surface on paper.
- **Stage Ink** (`#edf0f5`): Root and stage foreground on the dark material.
- **Stage Muted** (`#a7aebd`): Stage sub-copy on dark, below the headline.

### Tertiary
- **Rank Gold** (`#f5c542`): Rank-one row, brand mark, and the submit focus ring.
- **Scan Lime** (`#d9f99d`): The slow board scan sweep, the rank-one bar, and text selection on the panel.
- **Signal Red** (`#e5473b`), **Signal Yellow** (`#f5b62e`), **Signal Blue** (`#3e6ff0`), **Signal Green** (`#3ea55c`): Strength-meter steps 1 through 4, in that order; blue, green, and yellow also fill the three rail diamonds.
- **Deep Forest** (`#0e4b3b`): Caret, paper-side brand tag, SOON badge, and the forgot-password link.
- **Board Slate** (`#8b93a7`): Board captions and column heads.
- **Board Value** (`#aeb6c8`): The board's KP value column.
- **Strength Label Inks** (`#c2352c`, `#9a6506`, `#2d55c4`): Weak, fair, and good labels; `#9a6506` also appears on account-switch hover.

### Neutral
- **Panel Ink** (`#0b0b0d`): Form title, focused field icons, and the submit pill fill.
- **Paper Ink** (`#101212`): Panel base text and input text.
- **Paper Muted** (`#5f645f`): Lede, strength caption, account-switch row (5.67:1 on paper), social divider, rail steps, and rail foot.
- **Muted Ink** (`#656a63`): Placeholders, field icons, reveal control, unmet requirements, and the home link — the lightest muted ink allowed on paper (5.19:1).
- **Hairline Dark** (`#272d3b`) / **Hairline Paper** (`#dfe3dc`): The only structural lines, always 1px.
- **Grid Dot** (`rgba(255, 255, 255, 0.13)`): The recurring 26px dot pattern on the dark ground.
- **Board Rule** (`rgba(255, 255, 255, 0.12)`): The board's internal 1px divider.
- **Spinner Track** (`rgba(255, 255, 255, 0.35)`): Pending-state ring on the dark submit pill.
- **Forest Hairlines** (`rgba(14, 75, 59, 0.2)` notice / `rgba(14, 75, 59, 0.18)` success) and **Forest Shadow** (`rgba(10, 61, 48, 0.5)`): The tinted edges and lift of positive status cards.
- **Success Wash** (`#eaf3d6`) / **Success Ink** (`#0a3d30`): Notice, success, and SOON badge surfaces.
- **Failure Line** (`#f3cfca`), **Failure Wash** (`#fdecea`), **Failure Ink** (`#8e1d17`): The error status card.
- **Danger** (`#b3261e`): Error field borders and inline field errors.
- **Satisfied** (`#1f6f38`): Met requirements and the "Strong" strength label (5.81:1).

### Named Rules

**The Two Materials Rule.** The dark instrument field and the warm paper panel are separate materials meeting at one edge; never blend, tint, or merge them into a single surface.

**The Signal-Only Accent Rule.** Gold, lime, red, yellow, blue, and green are instrument signals — rank one, scan sweep, strength steps, and the three rail bullets — and never become buttons or links.

**The Legible Mute Rule.** Muted text on paper never goes lighter than `#656a63` on `#f7f8f4` (5.19:1); satisfied state uses `#1f6f38` (5.81:1). Legibility earns the value, not the other way around.

## Typography

**Display Font:** Lexend (exposed as `--font-lexend`, with ui-sans-serif and system-ui fallbacks)  
**Body Font:** Inter (exposed as `--font-inter`, with the same fallbacks)  
**Label/Mono Font:** None distinct — labels and board numerals also use Inter, with `tabular-nums` for data.

**Character:** A geometric, compact display face for the few headline moments over a neutral workhorse face for everything operational; both stay tight-tracked and never decorative.

### Hierarchy
- **Display** (700, `clamp(30px, 7vw, 38px)`, 1.06, -0.03em): Form heading — "Back in the lobby." / "Start your next scrim."; `text-wrap: balance`.
- **Headline** (700, `clamp(20px, 5vw, 28px)`, 1.1, -0.03em): Stage tagline — "Screenshots in. Standings out."
- **Brand** (700, 18px, -0.02em): "ScrimlyPro" lockup; paper-side lockup switches to `--ink`. Board brand repeats at 15px with 0.14em tracking.
- **Body** (400, 14px, 1.6): Lede, capped at 36ch; stage sub is 13px / 1.55, capped at 34ch.
- **Label** (600, 13px): Field labels; the account-switch row is 13.5px.
- **Input** (inherited weight, 15px): Field text, Google option, and rail intro (Lexend 700 at 15px / 1.25); caret is `#0e4b3b`.
- **Detail** (400–600, 12.5px, 1.45): Field errors and the three rail steps.
- **Small** (400–600, 12px): Board KP values, strength caption, and home link.
- **Fine** (400–600, 11.5px, 1.5): Requirements, the "or continue with email" divider, and the rail foot.
- **Caption** (600–700, 10px, 0.14–0.16em): Board captions and column heads; the SOON badge is 10px / 700 at 0.08em.
- **Micro** (700, 9.5px, 0.16em uppercase): Brand tag; on paper it switches to `#0e4b3b`.

### Named Rules

**The Two-Face Rule.** Lexend owns every headline, including the rail intro; Inter owns every body string, label, and data value. Never introduce a third face or fall back to a system display face.

## Layout

The root is a single-column grid on small screens: the credential panel takes `order: 1` and the dark stage `order: 2`, so a phone sees the brand lockup, heading, Google option, both fields, and the submit pill before any board. The panel carries 22px 20px 36px padding with 24px bottom corners and a downward `0 18px 50px -38px rgba(0, 0, 0, 0.65)` shadow; the stage sits below with a 1px top rule, 28px 20px 36px padding, an 18px stack gap, and its own brand hidden. The paper-side `.panelBrand` shows instead, with a 26px gap below, ink name, and a forest tag divided by `--paper-line`. At 390px the whole credential sequence fits inside the first 844px viewport; the board follows as proof.

The board is capped at 340px wide on mobile and 520px on desktop, with one slow scan line crossing it. Form content lives in a column capped at 420px: fields stack with a 16px gap, the form starts 22px below the divider, and labels sit 8px above 52px shells. The social block sits 26px above the form, with a 1px hairline divider 18px below the Google control. No horizontal scroll is introduced (`overflow-x: clip`).

At `min-width: 1000px` both halves reset to `order: 0` and become an exact 46% / 54% split, each `min-height: 100svh`. The stage shows its brand again with `clamp(32px, 3.6vw, 56px)` padding; the panel hides `.panelBrand`, becomes a centred flex row with `clamp(32px, 4vw, 56px)` gap and `48px clamp(32px, 3.5vw, 64px)` padding, with 28px left corners, and the form column flexes `0 1 420px`. At `min-width: 1280px` a 180px flow rail joins the row, separated by a 1px left hairline and 24px of padding.

### Named Rules

**The Split Control-Room Rule.** On phones the credential panel leads and the board follows as proof; at 1000px the field and panel take 46% / 54% with a 420px form cap, and at 1280px a hairline-separated rail joins the panel.

## Elevation & Depth

The system is flat at rest. Depth is conveyed only by soft, blurred, offset shadows under the submit pill, the panel edge, status cards, and notice, plus a 1px inset highlight on the brand mark; the dot grid and hairlines carry structure instead of stacked surfaces. The scan sweep is motion, not elevation. On mobile the panel's shadow flips to point downward because the panel now sits first.

### Shadow Vocabulary
- **Submit rest** (`box-shadow: 0 12px 26px -10px rgba(11, 11, 13, 0.45), 0 2px 6px rgba(11, 11, 13, 0.14)`): Primary pill at rest.
- **Submit hover** (`box-shadow: 0 16px 30px -10px rgba(11, 11, 13, 0.5), 0 3px 8px rgba(11, 11, 13, 0.16)`): Pairs with `translateY(-2px)`.
- **Panel lift** (`box-shadow: 0 -18px 50px -38px rgba(0, 0, 0, 0.65)`): Paper panel edge over the dark field at desktop.
- **Panel lift, mobile** (`box-shadow: 0 18px 50px -38px rgba(0, 0, 0, 0.65)`): Same blur, inverted direction, over the stage below.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(217, 249, 157, 0.6)`): Focused input shell; error state uses `0 0 0 3px rgba(179, 38, 30, 0.16)`.
- **Notice lift** (`box-shadow: 0 8px 18px -14px rgba(10, 61, 48, 0.5)`): The disabled-account notice.
- **Status lift** (`box-shadow: 0 10px 22px -16px rgba(10, 61, 48, 0.55)` success / `rgba(145, 29, 23, 0.5)` failure): Tinted message cards.
- **Brand inset** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07)`): Top-edge light on the brand mark.

### Named Rules

**The Soft-Depth Rule.** Depth is diffuse and blurred with generous negative spread; hard offset shadows are not part of this world.

## Shapes

The primary submit is a fully rounded pill (999px). Structure is quiet: 1px hairlines, 13px input shells, 12px status cards and Google control, 10px reveal buttons, 11px brand-mark plate, and a 6px radius on focus outlines; the paper panel has 24px bottom corners on mobile and a 28px left edge on desktop. The three rail steps are 9px squares with a 3px radius turned 45°. The board repeats a 22px frame, 10px row plates, 4px bar caps, and a 1px scan line. The recurring ground motif is a 26px dot grid drawn as a 1px `rgba(255, 255, 255, 0.13)` radial dot, layered under a 158° surface-to-ground gradient.

### Named Rules

**The Pill and Hairline Rule.** The primary submit is a 999px pill; secondary controls and status cards use 12px and structure is drawn with 1px hairlines — never heavy borders.

**The Rotated-Diamond Rule.** The three rail steps are marked by 9px squares with a 3px radius turned 45°, not circles or glyphs.

## Components

### Buttons
- **Shape:** Full pill (999px); 52px minimum height; 15px / 600 label with a 10px gap and an 18px inline arrow.
- **Primary:** `--ink` (#0b0b0d) fill, white text, no border; soft two-layer shadow.
- **Hover / Active / Focus:** Hover lifts `translateY(-2px)` with a larger blur; active settles to `translateY(0) scale(0.99)`; `:focus-visible` switches the outline to `--gold` on top of the panel's 2px ink outline; disabled drops to 0.5 opacity.
- **Reveal:** 44×44px, 10px radius, transparent, `#656a63` inline eye icon; hover fills `#f0f2ec` and turns the icon to ink.
- **Google / soon:** 48px minimum height, 12px radius, 1px `--paper-line` border, white fill, `--ink` text at 14px / 600, 10px gap, 18px four-colour brand mark. It is `disabled` but stays at full opacity with a SOON badge and a title/aria-label saying it is not enabled.

### Social Entry
- **Badge:** SOON pill (999px), 4px 8px padding, `#eaf3d6` wash, `#0e4b3b` text at 10px / 700 with 0.08em tracking, pushed right by `margin-left: auto`.
- **Divider:** "or continue with email" in 11.5px `--paper-muted` with 0.04em tracking, flanked by 1px `--paper-line` rules and a 12px gap.

### Inputs / Fields
- **Style:** 52px white shell, 1px `#dfe3dc` border, 13px radius; icon at 15px from the left; text padded `0 52px 0 46px`.
- **Focus:** Border shifts to `#0b0b0d` with a `0 0 0 3px rgba(217, 249, 157, 0.6)` lime halo; the icon darkens with it; focus outline radius is 6px.
- **Error / Disabled:** Error border `--danger` with a red-tinted halo; `#b3261e` 12.5px / 600 message below; disabled fields drop to 0.6 opacity with a not-allowed cursor.

### Password Strength
Four 5px-tall meter segments (999px, 6px gap) on a `#e4e7df` track, filling red → yellow → blue → green as the score rises; labels take the darker counterparts (`#c2352c`, `#9a6506`, `#2d55c4`, `#1f6f38`). Two-column requirement list in 11.5px muted ink, with met items in `#1f6f38`. Purely advisory: a weak-but-valid password still submits.

### Cards / Containers
- **Corner Style:** Panel 24px/28px; notice and status cards and the Google control 12px.
- **Background:** Paper `#f7f8f4` panel; notices and success use `#eaf3d6` with `#0a3d30` text, failures use `#fdecea` with `#8e1d17` text.
- **Shadow Strategy:** See Elevation & Depth — panel lift and status lift only.
- **Border:** 1px tinted hairline on status cards and the Google control; none on the panel.

### Flow Rail (signature)
At 1280px and up, a 180px `aria-hidden` aside sits across a 1px `--paper-line` hairline from the form. Its intro is Lexend 700 at 15px / 1.25 / -0.02em in `--ink`. Three steps — upload the result screens, confirm every mapping, download the standings — stack with a 16px gap in 12.5px / 1.45 `--paper-muted`, each preceded by a blue, green, or yellow 9px rotated square. A final "~90 seconds per match, on a phone." line is separated by a 1px top rule, with 16px above it and 24px above the block.

**The Honest-Disabled Rule.** A control without a backend stays fully opaque and is marked SOON; never dim it into invisibility or fake a sign-in.

### Standings Board (signature)
A 520×560 schematic SVG, hidden from assistive tech, drawn in the same tokens: gold frame at 22% alpha, Lexend brand at 15px / 0.14em, Inter column heads at 10px / 0.16em, five demo rows with tabular numerals, a gold rank-one plate with a lime bar, and one lime scan line over a 7s loop. It follows the credentials on a phone and sits beside them at desktop. It is product proof, not a claim about customers.

## Do's and Don'ts

### Do:
- **Do** keep the 46% / 54% split at ≥1000px and cap the form at 420px.
- **Do** hold muted text on paper at `#656a63` or darker and satisfied text at `#1f6f38`.
- **Do** reserve gold, lime, red, yellow, blue, and green for board, meter, and rail signals.
- **Do** keep password strength advisory so a valid weak password can still submit.
- **Do** stop the scan sweep and drop transitions under `prefers-reduced-motion: reduce`.
- **Do** lead with credentials on phones and place the board below as proof.
- **Do** mark the disabled Google control with a SOON badge instead of dimming or faking a sign-in.
- **Do** show the three-step rail with blue/green/yellow rotated-square bullets at ≥1280px.

### Don't:
- **Don't** use hard offset shadows; this world's depth is soft and blurred.
- **Don't** centre the form in a floating card; the panel is a full-height material half of the split.
- **Don't** swap the Lexend/Inter pairing or substitute a system display face.
- **Don't** use icon fonts or glyphs; icons are inline 20px SVG strokes at 1.75px.
- **Don't** blend the dark field and paper panel into one tinted surface.
- **Don't** put the board above the form on a phone.
- **Don't** remove the SOON badge from the Google control or treat it as a live OAuth path.
