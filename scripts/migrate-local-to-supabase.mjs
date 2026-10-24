// WP8 — migrate the legacy local SQLite DB into the Supabase-era Postgres DB.
//
//   node scripts/migrate-local-to-supabase.mjs            # dry-run (default)
//   node scripts/migrate-local-to-supabase.mjs --apply    # real run
//
// Env: SUPABASE_DB_URL (target; from .env.local), LEGACY_SQLITE_PATH
//      (source; default ./data/legacy-scrimly.db), SUPABASE_PILOT_OWNER_EMAIL
//      (email of an EXISTING confirmed user who receives every migrated row).
//
// Dry-run prints a per-table source→target→delta reconciliation table and
// writes pre-migration standings inputs to .tmp/m1-pre-standings.json.
// --apply runs all inserts in ONE transaction with `on conflict do nothing`
// (idempotent), backfills sessions.user_id, then enforces NOT NULL.
// Sequences: no identity/serial columns exist in this schema (all TEXT uuid
// PKs generated app-side per ERD) — setval is a documented no-op.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import Database from "better-sqlite3";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");

function env(name, fallback = null) {
  if (process.env[name]) return process.env[name];
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(
      new RegExp(`^${name}=(.*)$`, "m"),
    );
    if (m) return m[1].trim();
  }
  return fallback;
}

const pgUrl = env("SUPABASE_DB_URL");
const sqlitePath = env("LEGACY_SQLITE_PATH", "./data/legacy-scrimly.db");
const pilotEmail = env("SUPABASE_PILOT_OWNER_EMAIL");
if (!pgUrl || !pilotEmail) {
  console.error("SUPABASE_DB_URL and SUPABASE_PILOT_OWNER_EMAIL are required");
  process.exit(1);
}
if (!existsSync(sqlitePath)) {
  console.error(`legacy sqlite not found: ${sqlitePath}`);
  process.exit(1);
}

const sql = postgres(pgUrl, { prepare: false, max: 1 });
// postgres.js double-encodes JS strings bound to ::jsonb params — parse the
// legacy JSON text into an object and let sql.json serialize exactly once.
const j = (v) => (v == null ? null : sql.json(JSON.parse(v)));
const legacy = new Database(sqlitePath, { readonly: true });

// --- pilot user must exist (verified via admin SQL, never created here) ---
// An existing auth user with a missing profile row (e.g. after a local
// db:reset, which drops public/ but keeps the auth stand-in) is repaired —
// this script runs with admin trust and the insert is idempotent.
await sql`
  insert into profiles (id, email)
  select u.id, u.email from auth.users u
  where lower(u.email) = lower(${pilotEmail})
  and not exists (select 1 from profiles p where p.id = u.id)`;
const pilot = await sql`
  select u.id, p.email from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.email) = lower(${pilotEmail}) limit 1`;
if (pilot.length !== 1) {
  console.error(
    `ABORT: no user/profile found for SUPABASE_PILOT_OWNER_EMAIL=${pilotEmail} ` +
      "(the pilot account must already exist and be confirmed)",
  );
  process.exit(1);
}
const pilotId = pilot[0].id;
console.log(`pilot owner: ${pilotId}`);

// --- read all legacy rows ---
const tables = {
  sessions: legacy.prepare("select * from sessions").all(),
  teams: legacy.prepare("select * from teams").all(),
  rosters: legacy.prepare("select * from rosters").all(),
  matches: legacy.prepare("select * from matches").all(),
  match_results: legacy.prepare("select * from match_results").all(),
  mvp_lists: legacy.prepare("select * from mvp_lists").all(),
};

const countsBefore = {};
for (const t of Object.keys(tables)) {
  const r = await sql.unsafe(`select count(*)::int as n from ${t}`);
  countsBefore[t] = r[0].n;
}

// --- dry-run reconciliation table + pre-standings snapshot -----------------
console.table(
  Object.keys(tables).map((t) => ({
    table: t,
    source: tables[t].length,
    target: countsBefore[t],
    delta: countsBefore[t] + (APPLY ? tables[t].length : 0) - countsBefore[t],
  })),
);

// Pre-migration standings inputs per session (what the golden check replays
// through lib/scoring/standings.ts computeStandings).
function sessionInputs(sessionId) {
  const teams = tables.teams.filter((t) => t.session_id === sessionId);
  const matchIds = new Set(
    tables.matches.filter((m) => m.session_id === sessionId).map((m) => m.id),
  );
  const results = tables.match_results
    .filter((r) => matchIds.has(r.match_id))
    .map((r) => ({
      teamId: r.team_id,
      placement: r.placement,
      kills: r.kills,
      placementPoints: r.placement_points,
    }));
  const session = tables.sessions.find((s) => s.id === sessionId);
  return {
    sessionId,
    rules: JSON.parse(session.scoring_rules),
    teams: teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url })),
    results,
  };
}

mkdirSync(".tmp", { recursive: true });
writeFileSync(
  ".tmp/m1-pre-standings.json",
  JSON.stringify(
    tables.sessions.map((s) => sessionInputs(s.id)),
    null,
    2,
  ),
);
console.log(
  `pre-migration standings inputs for ${tables.sessions.length} sessions → .tmp/m1-pre-standings.json`,
);

if (!APPLY) {
  console.log("dry-run complete (re-run with --apply to migrate)");
  process.exit(0);
}

// --- apply: ONE transaction, idempotent (on conflict do nothing) -----------
try {
  await sql.begin(async (tx) => {
    for (const s of tables.sessions) {
      await tx`
        insert into sessions (id, user_id, name, planned_matches, team_count,
                              template_id, scoring_rules, status, created_at)
        values (${s.id}, ${pilotId}, ${s.name}, ${s.planned_matches},
                ${s.team_count}, ${s.template_id ?? "dev-dark-gold"},
                ${j(s.scoring_rules)}, ${s.status}, ${s.created_at})
        on conflict (id) do nothing`;
    }
    for (const t of tables.teams) {
      await tx`
        insert into teams (id, session_id, name, logo_url)
        values (${t.id}, ${t.session_id}, ${t.name}, ${t.logo_url})
        on conflict (id) do nothing`;
    }
    for (const r of tables.rosters) {
      await tx`
        insert into rosters (team_id, player_norm, display_name)
        values (${r.team_id}, ${r.player_norm}, ${r.display_name})
        on conflict (team_id, player_norm) do nothing`;
    }
    for (const m of tables.matches) {
      await tx`
        insert into matches (id, session_id, match_no, status, raw_squad_data,
                             created_at, confirmed_at)
        values (${m.id}, ${m.session_id}, ${m.match_no}, ${m.status},
                ${j(m.raw_squad_data)}, ${m.created_at}, ${m.confirmed_at})
        on conflict (id) do nothing`;
    }
    for (const r of tables.match_results) {
      await tx`
        insert into match_results (id, match_id, team_id, placement, kills,
                                   placement_points, players)
        values (${r.id}, ${r.match_id}, ${r.team_id}, ${r.placement},
                ${r.kills}, ${r.placement_points}, ${j(r.players)})
        on conflict (id) do nothing`;
    }
    for (const m of tables.mvp_lists) {
      await tx`
        insert into mvp_lists (session_id, entries, locked, locked_at)
        values (${m.session_id}, ${j(m.entries)},
                ${!!m.locked}, ${m.locked_at})
        on conflict (session_id) do nothing`;
    }
  });
} catch (e) {
  console.error("ABORT: transaction rolled back:", e.message);
  process.exit(1);
}

// --- backfill + enforce NOT NULL -------------------------------------------
await sql`update sessions set user_id = ${pilotId} where user_id is null`;
await sql`alter table sessions alter column user_id set not null`;
console.log("sessions.user_id backfilled; NOT NULL enforced (setval: n/a — no identity columns)");

const countsAfter = {};
const keyCols = {
  sessions: "id",
  teams: "id",
  rosters: null, // composite (team_id, player_norm)
  matches: "id",
  match_results: "id",
  mvp_lists: "session_id",
};
let presenceOk = true;
for (const t of Object.keys(tables)) {
  const r = await sql.unsafe(`select count(*)::int as n from ${t}`);
  countsAfter[t] = r[0].n;
  // Presence check: EVERY source row must exist in the target (the real
  // idempotency guarantee — `on conflict do nothing` skips are legitimate).
  const ids = tables[t].map((row) => (keyCols[t] ? row[keyCols[t]] : row));
  let present;
  if (t === "rosters") {
    const pairs = tables[t].map((row) => [row.team_id, row.player_norm]);
    const ph = pairs.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(",");
    present = (
      await sql.unsafe(
        `select count(*)::int as n from rosters where (team_id, player_norm) in (${ph})`,
        pairs.flat(),
      )
    )[0].n;
  } else {
    const ph = ids.map((_, i) => `$${i + 1}`).join(",");
    present = (
      await sql.unsafe(
        `select count(*)::int as n from ${t} where ${keyCols[t]} in (${ph})`,
        ids,
      )
    )[0].n;
  }
  if (present !== ids.length) {
    presenceOk = false;
    console.error(`✗ ${t}: ${ids.length - present} source row(s) missing from target`);
  }
}
console.table(
  Object.keys(tables).map((t) => {
    const inserted = countsAfter[t] - countsBefore[t];
    return {
      table: t,
      source: tables[t].length,
      targetBefore: countsBefore[t],
      targetAfter: countsAfter[t],
      inserted,
      conflictSkipped: tables[t].length - inserted,
    };
  }),
);
console.log(
  presenceOk
    ? "✔ presence check: every source row exists in target"
    : "✗ PRESENCE CHECK FAILED",
);
process.exit(presenceOk ? 0 : 1);
