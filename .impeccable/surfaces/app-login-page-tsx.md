---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["app/signup/page.tsx"]
---

Scope: `/login` and `/signup` (two related surfaces, one shared world). Mode: Operate — the visitor came to sign in or register, not to read a pitch.

Audience/job: solo PUBG Mobile scrim organizer on a phone or laptop, often right after a match; they need to get in or get started in seconds. Action: submit email + password (signup also confirms it). Proof/content: the product's own standings output, not invented claims. Constraints: keep `/api/auth/*`, `sanitizeNextOr`, existing error copy, `?disabled=1` notice, and all secondary auth screens untouched; backend accepts email + password only.

Unresolved: none. Remember-me is intentionally absent — the existing flow has no session-duration control. Google is restored as a visible "SOON" control because the user asked for it; it stays disabled because no OAuth endpoint exists — it must never fake a sign-in.

## Direction contract

THESIS: Authentication is a calm control room, not a marketing page or a centered card. A dark instrument field shows what the product produces while a precise credential panel does the job. It refuses both the generic auth card and the Hero's controller composition.

OWN-WORLD: ground `#0b0d12` with a subtle 26px dot grid; surfaces `#12151c`/`#1a1e28`, hairlines `#272d3b`; warm off-white form panel with `--ink #0b0b0d`; accents gold `#f5c542`, lime `#d9f99d`, Hero SNES blue `#3e6ff0`, red `#e5473b`, yellow `#f5b62e`, green `#3ea55c`; Lexend headlines, Inter/Exo 2 body; 999px pills, 1px rules, soft offset shadows with blur. Identifiable with all copy removed by its board motif and split field.

STORY: a returning organizer sees the standings board, knows they are in the right place, and signs in without reading; a new organizer sees the same proof before creating an account. Errors name the problem and the recovery in the product's own language.

FIRST VIEWPORT: at 1440×900, the left 46% is a dark grid field with a brand lockup and a schematic SVG standings board (rank/team/kill bars, gold rank-1 row), with one slow scan sweep as the authored moment; the right 54% holds a warm off-white column capped near 420px — heading, a Google "SOON" option and email divider, email, password with visibility control, submit pill, and a quiet account-switch row, with a hairline-separated three-step flow rail at ≥1280px so the right half carries real product information. At 390px the credential panel leads with a compact brand lockup — heading and every field plus the submit button inside the first viewport — and the standings board follows as proof below.

FORM: split control room — position 1 of the ordered compositions; user-confirmed. seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
