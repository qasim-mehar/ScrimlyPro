// M5 dev helper (LOCAL dev DB ONLY — same refusal rule as m5-dev-seed):
// seeds a realistic dashboard demo in the dev org — one active session
// (3 confirmed matches with results, 1 stale draft), one completed-unshared
// session, a pending invite, a share link, OCR usage events. Idempotent:
// wipes the demo session ids first (cascade), then re-inserts.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = (() => {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const m = readFileSync(".env.local", "utf8").match(/^SUPABASE_DB_URL=(.*)$/m);
  if (!m) throw new Error("SUPABASE_DB_URL is not set");
  return m[1].trim();
})();
if (!/127\.0\.0\.1:54329/.test(url)) {
  console.error("REFUSING: this helper only runs against the local cluster");
  process.exit(1);
}

const USER_ID = "a01f707b-8bcd-4165-8119-1e4a10b77e7e";
const ORG_ID = "85b98f27-c3c9-4f8b-84fb-ddd414eae2b5";

const PP = { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 };
const TEAMS = [
  "Straight Forward", "TF Squad", "TRB Gaming", "4NM Esports",
  "FMA Esports", "Bawa Squad", "Karachi Snipers", "Nova Legends",
];
// [matchNo][placement-1] → team index (deterministic rotations).
const ORDERS = [
  [0, 1, 2, 3, 4, 5, 6, 7],
  [3, 0, 4, 1, 5, 2, 6, 7],
  [1, 4, 0, 5, 2, 3, 7, 6],
];
const KILLS = [
  [12, 9, 7, 6, 5, 4, 2, 1],
  [10, 8, 7, 5, 6, 3, 2, 0],
  [11, 9, 6, 7, 4, 5, 1, 2],
];

const sql = postgres(url, { max: 1, prepare: false });
const H = 3600_000, D = 24 * H;
const now = Date.now();
const iso = (ms) => new Date(now - ms).toISOString();
const rid = () => crypto.randomUUID();

try {
  await sql`delete from sessions where id like 'demo-%'`;

  // Featured active session: created 2d ago.
  await sql`insert into sessions (id, user_id, org_id, name, planned_matches, team_count, scoring_rules, status, created_at)
    values ('demo-s1', ${USER_ID}, ${ORG_ID}::uuid, 'Thursday Scrims — Lobby A', 6, 8,
      ${JSON.stringify({ kill_points: 1, placement_points: PP, default_placement_points: 0 })}::jsonb,
      'active', ${iso(2 * D)})`;
  const teamIds = new Map();
  for (let i = 0; i < TEAMS.length; i++) {
    const tid = `demo-t${i}`;
    teamIds.set(i, tid);
    await sql`insert into teams (id, session_id, name) values (${tid}, 'demo-s1', ${TEAMS[i]})`;
  }
  for (let m = 0; m < 3; m++) {
    const mid = `demo-m${m}`;
    await sql`insert into matches (id, session_id, match_no, status, created_at, confirmed_at)
      values (${mid}, 'demo-s1', ${m + 1}, 'confirmed', ${iso((30 - m * 8) * H)}, ${iso((30 - m * 8) * H - 12 * 60000)})`;
    for (let p = 1; p <= 8; p++) {
      const ti = ORDERS[m][p - 1];
      await sql`insert into match_results (id, match_id, team_id, placement, kills, placement_points, players)
        values (${rid()}, ${mid}, ${teamIds.get(ti)}, ${p}, ${KILLS[m][p - 1]}, ${PP[p]}, '[]'::jsonb)`;
    }
  }
  // Stale draft (30h old → attention row) + a fresh draft.
  await sql`insert into matches (id, session_id, match_no, status, created_at)
    values ('demo-m3d', 'demo-s1', 4, 'draft', ${iso(30 * H)})`;
  await sql`insert into matches (id, session_id, match_no, status, created_at)
    values ('demo-m4d', 'demo-s1', 5, 'draft', ${iso(2 * H)})`;

  // Completed-unshared session (3d ago).
  await sql`insert into sessions (id, user_id, org_id, name, planned_matches, team_count, scoring_rules, status, created_at)
    values ('demo-s2', ${USER_ID}, ${ORG_ID}::uuid, 'Sunday Cup — Finals', 4, 8,
      ${JSON.stringify({ kill_points: 1, placement_points: PP, default_placement_points: 0 })}::jsonb,
      'completed', ${iso(10 * D)})`;
  await sql`insert into teams (id, session_id, name) values ('demo-u0', 'demo-s2', ${TEAMS[0]})`;
  await sql`insert into matches (id, session_id, match_no, status, created_at, confirmed_at)
    values ('demo-um1', 'demo-s2', 1, 'confirmed', ${iso(3 * D)}, ${iso(3 * D - 18 * 60000)})`;
  await sql`insert into match_results (id, match_id, team_id, placement, kills, placement_points, players)
    values (${rid()}, 'demo-um1', 'demo-u0', 1, 9, 10, '[]'::jsonb)`;

  // Pending invite (4d old → attention), share link, usage meter.
  await sql`insert into org_invites (id, org_id, email, role, token_hash, expires_at, created_by, created_at)
    values (${rid()}, ${ORG_ID}::uuid, 'straggler@team.dev', 'member', ${"hash-" + rid()}, ${iso(-20 * D)}, ${USER_ID}, ${iso(4 * D)})`;
  await sql`insert into share_links (id, session_id, token_hash, created_by, created_at)
    values (${rid()}, 'demo-s1', ${"hash-" + rid()}, ${USER_ID}, ${iso(6 * H)})`;
  for (let i = 0; i < 23; i++) {
    await sql`insert into usage_events (id, org_id, user_id, kind, created_at)
      values (${rid()}, ${ORG_ID}::uuid, ${USER_ID}, 'ocr', ${iso(i * H)})`;
  }

  console.log("demo data seeded: demo-s1 (active, 3 confirmed + 2 drafts), demo-s2 (completed unshared), invite, share, 23 reads");
} finally {
  await sql.end();
}
