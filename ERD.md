# SCRIMLYPRO — ENTITY RELATIONSHIP DOCUMENT (v1-CORE)

**Status:** ACTIVE · Single source of truth for DATA.
Companions: `PRD.md` (what), `PLAN.md` (build order).

## 1. Diagram

```mermaid
erDiagram
    sessions ||--o{ teams : "has"
    sessions ||--o{ matches : "has"
    teams ||--o{ rosters : "learns (invisible)"
    matches ||--o{ match_results : "yields"
    teams ||--o{ match_results : "scored in"
    sessions ||--|| mvp_lists : "finalizes (0..1)"

    sessions {
        text id PK "uuid v4 (TEXT in SQLite)"
        text name
        int planned_matches "1..6"
        int team_count "4..25"
        text template_id
        text scoring_rules "JSON, see PRD §6"
        text status "active | completed"
        text created_at "ISO-8601 UTC"
    }
    teams {
        text id PK
        text session_id FK
        text name
        text logo_url "data URL, nullable"
    }
    rosters {
        text team_id FK "PK(team_id, player_norm)"
        text player_norm
        text display_name
    }
    matches {
        text id PK
        text session_id FK
        int match_no "UNIQUE(session_id, match_no)"
        text status "draft | confirmed"
        text raw_squad_data "JSON, nullable — OCR draft"
        text created_at
        text confirmed_at "nullable"
    }
    match_results {
        text id PK
        text match_id FK
        text team_id FK
        int placement "1..25"
        int kills "team total this match"
        int placement_points
        text players "JSON [{name,kills}] raw OCR names"
    }
    mvp_lists {
        text session_id PK
        text entries "JSON [{rank,name,teamId,kills}]"
        int locked "0|1"
        text locked_at "nullable"
    }
```

## 2. SQLite implementation mapping

Implemented via Drizzle + better-sqlite3 at `./data/scrimly.db` (gitignored; folder auto-created). Type mapping: `uuid` → `TEXT`, `jsonb` → `TEXT` via Drizzle mode:"json" + $type<> (no separate helpers), `timestamptz` → `TEXT` ISO-8601 UTC, `boolean` → `INTEGER`. IDs are uuid v4 generated in app code.

**Constraints** (enforced in app layer + checked in tests): `planned_matches` 1–6 · `team_count` 4–25 · `match_no` 1..planned · `placement` 1..team_count · squad 1–4 players · `UNIQUE(session_id, name)` on teams · `UNIQUE(session_id, match_no)` on matches.

**Indexes:** `teams(session_id)`, `rosters(team_id)`, `matches(session_id)`, `match_results(match_id)`, `match_results(team_id)`.

## 3. Standings derivation (THE cumulative computation)

Never stored. Single implementation in `lib/scoring` used by both the HTML standings table and the graphic (one source, two consumers).

```sql
-- documentation sketch; the TS function is authoritative
SELECT t.id, t.name,
       COUNT(*) FILTER (WHERE r.placement = 1)            AS wwcd,
       SUM(r.placement_points)                            AS pp,
       SUM(r.kills)                                       AS kp,
       SUM(r.kills) + SUM(r.placement_points)             AS total
FROM match_results r
JOIN matches m ON m.id = r.match_id AND m.status = 'confirmed'
JOIN teams   t ON t.id  = r.team_id
GROUP BY t.id
ORDER BY total DESC, wwcd DESC, kp DESC, pp DESC, t.name ASC;
```

## 4. Roster learning (suggestion data — never rendered)

On confirm of match N: upsert every mapped squad's player names (normalized per `lib/matching/normalize`) under the mapped team; `display_name` = first-seen raw spelling. On unlock of a match: rebuild rosters from remaining confirmed matches only.

## 5. Iron rules

- No aggregate columns anywhere. Standings, MVP totals, WWCD counts are always derived. Fixing/deleting any match is therefore always safe.
- `mvp_lists.entries` is written once on Lock and is the ONLY source for the MVP graphic afterward.
- Unlock = delete that match's `match_results` + `status→draft` + rosters rebuild (order matters; do it in one transaction).
- Re-confirm of a draft replaces its results idempotently.
- `rosters` is invisible plumbing — never shown in any UI.

## 6. Port to Supabase (AS BUILT in M1 — this section is authoritative for the Postgres schema)

M1 (`m1-multitenancy-foundation`, see docs/reports/M1-implementation-report.md) implemented the port:

- **Types:** TEXT uuid PKs stay TEXT (app-generated `crypto.randomUUID`); TEXT ISO timestamps → `timestamptz not null default now()` (drizzle `mode:"string"`); JSON text columns → `jsonb`; `mvp_lists.locked` → `boolean`. Table/column/index names byte-identical to the SQLite original.
- **Tenancy:** `sessions.user_id uuid NOT NULL` (migration 0003; FK to `auth.users` on delete cascade) + new `profiles` table (`id` = `auth.users.id`, `role` default `'user'` for M3, insert trigger on `auth.users`, escalation guard). All other tables stay scoped via the `session_id` FK chain — user_id lives ONLY on sessions.
- **RLS:** enable + FORCE RLS on all 7 tables; 27 policies, all `to authenticated`, insert/update/delete pairing USING + WITH CHECK, child tables via EXISTS walks to `sessions.user_id`; no global reference tables exist; profiles has no delete policy (default deny).
- **Auth:** Supabase Auth (GoTrue) email+password, server-mediated through `/api/auth/*`; identity only via `getUser()`. Next 16 convention: `proxy.ts` (middleware renamed) refreshes tokens + redirects; every route/page re-checks independently.
- **DB access law:** tenant request paths run through `withUserDb` (lib/db/user.ts: transaction-scoped `set_config('role','authenticated')` + verified JWT claims → RLS is the backstop); `getDb()` (owner role) and `lib/db/admin.ts` are eslint-banned from the request path.
- **Deferred deltas (not built):** team logos → Storage bucket paths (data URLs still in `teams.logo_url`); `ocr_usage`/`shared_links` tables (M2/M4); MVP aggregation/standings remain TS pure functions (not moved to SQL).
- **Local dev:** Postgres 14+ works without Docker — migration `0002` conditionally creates the `auth` schema stand-in (`auth.users`, `uid()`, `jwt()`) + `authenticated` role; all blocks no-op on a hosted project.`
