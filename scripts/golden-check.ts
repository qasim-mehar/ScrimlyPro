// WP8 golden check — recompute cumulative standings for every migrated
// session with the REAL production pure function (lib/scoring/standings.ts,
// imported via Node 25 native type-stripping: its only import is type-only)
// and assert equality between the legacy SQLite source and the migrated
// Postgres target.
//
//   node scripts/golden-check.ts
//
// Env: SUPABASE_DB_URL, LEGACY_SQLITE_PATH (default ./data/legacy-scrimly.db)
import { readFileSync, existsSync } from "node:fs";
import Database from "better-sqlite3";
import postgres from "postgres";
import { computeStandings } from "../lib/scoring/standings.ts";

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
const sql = postgres(pgUrl, { prepare: false, max: 1 });
const legacy = new Database(sqlitePath, { readonly: true });

function standingsFromRows(rules, teamRows, resultRows) {
  return computeStandings(resultRows, teamRows, rules);
}

const sessionIds = legacy.prepare("select id from sessions order by id").all();
let failures = 0;

for (const { id: sessionId } of sessionIds) {
  const s = legacy.prepare("select * from sessions where id = ?").get(sessionId);
  const rules = JSON.parse(s.scoring_rules);
  const legacyTeams = legacy
    .prepare("select id, name, logo_url from teams where session_id = ?")
    .all(sessionId)
    .map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url }));
  const legacyResults = legacy
    .prepare(
      `select r.team_id, r.placement, r.kills, r.placement_points
       from match_results r join matches m on m.id = r.match_id
       where m.session_id = ?`,
    )
    .all(sessionId)
    .map((r) => ({
      teamId: (r as { team_id: string }).team_id,
      placement: (r as { placement: number }).placement,
      kills: (r as { kills: number }).kills,
      placementPoints: (r as { placement_points: number }).placement_points,
    }));

  const pgSession = await sql`select scoring_rules from sessions where id = ${sessionId}`;
  const pgTeams = (
    await sql`select id, name, logo_url from teams where session_id = ${sessionId}`
  ).map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url }));
  const pgResults = (
    await sql`
      select r.team_id, r.placement, r.kills, r.placement_points
      from match_results r join matches m on m.id = r.match_id
      where m.session_id = ${sessionId}`
  ).map((r) => ({
    teamId: r.team_id,
    placement: r.placement,
    kills: r.kills,
    placementPoints: r.placement_points,
  }));

  const pre = standingsFromRows(rules, legacyTeams, legacyResults);
  const post = standingsFromRows(pgSession[0].scoring_rules, pgTeams, pgResults);

  const a = JSON.stringify(pre);
  const b = JSON.stringify(post);
  if (a === b) {
    console.log(`✔ ${sessionId}: standings identical (${pre.length} teams)`);
  } else {
    failures++;
    console.error(`✗ ${sessionId}: standings DIFFER\n  pre : ${a}\n  post: ${b}`);
  }
}

await sql.end();
if (failures > 0) {
  console.error(`golden check FAILED for ${failures} session(s)`);
  process.exit(1);
}
console.log("✔ golden check passed: all migrated sessions reproduce identical standings");
