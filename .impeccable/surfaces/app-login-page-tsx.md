---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["app/signup/page.tsx"]
---

Scope: `/login` and `/signup` (two surfaces, one replacement world). Mode: Operate — the visitor came to enter or register, not to read a pitch.

Audience/job: solo PUBG Mobile scrim organizer on a phone immediately after a match; get in or get started in one thumb reach. Action: email + password (signup also confirms). Constraints: keep `/api/auth/*`, `sanitizeNextOr`, existing error copy, `?disabled=1` notice and secondary auth screens untouched; backend accepts email and password only. Google stays a visible "SOON" control because no OAuth endpoint exists.

Unresolved: none. Remember-me is absent — the flow has no session-duration control.

## Direction contract

THESIS: Authentication is an issued organizer pass, not an instrument panel or a centered card. A single tactile credential dominates a quiet graphite field and the form is printed on the pass itself. It refuses the split console, the standings board, and the generic auth template.

OWN-WORLD: graphite `#101217` with a woven lanyard texture and an oversized, low-contrast wordmark behind the pass; warm pass stock `#f2f0e9`, hairline `#cfcbc1`, ink `#141414`; one soft offset laminate shadow; gold `#f5c542` reserved for the stamp; Lexend display, Inter body, tabular serial numerals. Recognizable with all copy removed by the punched holes, lanyard clip, perforated stub, and embossed emblem.

STORY: the organizer sees their own pass, knows instantly where to sign in, and completes the form in one reach. Errors read like a clerk's marginal note, never a system alarm.

FIRST VIEWPORT: a pass no wider than 440px centered on the graphite field; lanyard strip with brand and ORGANIZER ACCESS stamp, embossed emblem slot, heading, Google SOON row and divider, email, password with eye control, and an "Activate pass" pill. A perforated stub carries the account switch and the way back. On a phone the pass goes full width with every field and the primary action inside 844px; on desktop the faint wordmark fills the ground so there is no empty second panel.

FORM: organizer ID badge — user-chosen from the re-roll hand (assigned index 5 of the grounded list). seed:d2c7f365c1717ed3. Raised by Terminal Wayfinding: one saturated panel, one message per line. Raised by Dark-first Console: hairline seams instead of stacked shadows, deliberate empty space around the primary action.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
