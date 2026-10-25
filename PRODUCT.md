# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo PUBG Mobile scrim organizers in Pakistan. They run scrim sessions for communities, work from a phone (or emulator) immediately after each match ends, and re-upload the 6–14 end-of-match screenshots the game already produces. Mobile-first: the core loop is done on a phone. Auth, orgs, and admin exist for account isolation, not for collaboration — the organizer works alone. Share links let community members view standings, but the organizer is the user whose flow the product serves.

## Product Purpose

Turns end-of-match screenshots into a cumulative standings graphic after every match and a Top-5 MVP graphic at session end — in about 90 seconds per match, instead of the 30–60 minutes an organizer spends retyping results into Canva/Photoshop by hand. Success means a pilot of 5–15 Pakistani scrim organizers adopting it for their weekly scrims.

## Positioning

The screenshot-to-graphic loop itself: one Gemini OCR call turns all match screenshots into a validated squads JSON, a review form lets the organizer confirm every team mapping, and a finished 1080×1620 standings/MVP graphic is downloadable on the spot. A neighboring product could copy "OCR for PUBG screenshots" but not the whole loop: validation rules tuned to real PUBG quirks (Rondo recalls, squad sizes), learned team-name suggestions that a human still confirms every match, cumulative scoring with an authoritative tie-break order, and locked MVP aggregation.

## Operating Context

- Pakistan PUBG Mobile scrim scene; English UI copy is the current norm.
- Uploads happen right after a match ends, from phone or emulator screenshots.
- Rondo map recalls are real: players can die again after returning, so 16–19 kills per player and lobby kill totals above 99 are legitimate, not OCR errors — a human judges these in the review form.
- Organizers' current alternative is manual retyping into Canva/Photoshop plus mental/sheet scorekeeping.

## Capabilities and Constraints

- Session: 1–6 planned matches, 4–25 teams, bulk-pasted team names, optional per-team logos, aesthetic choice.
- Ingest: 1–14 screenshots per match downscaled client-side; ONE Gemini request; validation V1–V3 (squad count, placements, per-field bounds) fail with one automatic corrective retry; V4 (lobby kills > 99) is a never-blocking, never-retried soft warning.
- The engine only SUGGESTS team mappings; the organizer confirms every mapping, every match. Confirm stays disabled until all squads map to distinct teams.
- Standings are always computed from confirmed match results, never stored; tie-break order is authoritative (total → WWCD → KP → PP → name).
- MVP list merges name variants within a team only (never across teams) and renders only from the organizer-locked list; unlock is allowed.
- Graphics: 1080×1620 PNG, client-side export, watermark rendered bottom-right. Per-match graphics and custom template upload are deferred; three dev-gradient aesthetics ship now.
- Wave 1 added auth, multi-tenant isolation (orgs), admin, and share links on top of the v1 single-operator core.
- Dev fixture mode (env-gated, off by default) exists so the flow is testable without a Gemini key.

## Brand Commitments

None binding. Incumbent identity (may be replaced by future visual work): fonts Exo 2 / Rajdhani / Noto Sans Symbols 2, dark gaming aesthetic, watermark "scrimlypro.com" rendered on all graphics. The watermark is currently always rendered (PRD scope decision for brand growth), but whether it stays binding is an open decision.

## Evidence on Hand

- `PRD.md` (what), `ERD.md` (data), `PLAN.md` (build order) are the project's truth files.
- A working implementation exists (Next.js app with landing, auth, orgs, sessions, share, admin) but nothing is deployed and no real organizer usage data, testimonials, or case studies exist yet. Future work must not fabricate customers, benchmarks, or pilot results.

## Product Principles

1. Speed is the product: every added step must keep the 90-second-per-match loop intact.
2. The machine suggests, the human confirms: never auto-confirm data that goes on a public graphic.
3. Mobile-first, always: the core flow must work on a phone, right after the match ends.
4. Correct numbers build trust: validation, authoritative tie-breaks, and editable review exist so the graphic can be posted without double-checking.
5. Output is the deliverable: a finished, postable graphic every time — not a dashboard the organizer still has to turn into one.
