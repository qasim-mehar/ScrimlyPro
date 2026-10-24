// Deterministic, idempotent, self-verifying seed. Run: npm run db:seed
// Plain postgres.js (no TS runner) against SUPABASE_DB_URL. Fixed literal ids
// make re-runs safe: the seed session is deleted (cascade) then re-inserted,
// all inside one transaction.
if (process.env.NODE_ENV === "production") {
  console.error("REFUSING: this script wipes/reseeds data and must never run against a hosted/production database (M1 review B6).");
  process.exit(1);
}
import { readFileSync } from "node:fs";
import postgres from "postgres";

export function dbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^SUPABASE_DB_URL=(.*)$/m);
  if (m) return m[1].trim();
  throw new Error("SUPABASE_DB_URL is not set (env or .env.local)");
}

const SESSION_ID = "seed-00000000-0000-4000-8000-000000000001";
const SEED_OWNER_ID = "00000000-0000-4000-8000-0000000000aa";

// duplicated from PRD §6 — the app's source is C2.1 lib/scoring; seed is an offline script
const PLACEMENT_POINTS = { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 };

const TEAMS = [
  "Straight Forward",
  "TF Squad",
  "TRB Gaming",
  "4NM Esports",
  "FMA Esports",
  "Zero Degree Esports",
  "Team Invaders",
  "ROX Gaming",
  "Bawa Squad",
  "CRUSH Gaming",
  "AKM Esports",
  "Shadow Syndicate",
  "Karachi Snipers",
  "Lahore Lions",
  "Voltage Esports",
  "Nova Legends",
];

const M1_ORDER = [
  "Straight Forward",
  "TF Squad",
  "4NM Esports",
  "TRB Gaming",
  "Team Invaders",
  "FMA Esports",
  "ROX Gaming",
  "Bawa Squad",
  "Zero Degree Esports",
  "CRUSH Gaming",
  "AKM Esports",
  "Shadow Syndicate",
  "Karachi Snipers",
  "Lahore Lions",
  "Voltage Esports",
  "Nova Legends",
];

const M2_ORDER = [
  "TF Squad",
  "Straight Forward",
  "TRB Gaming",
  "FMA Esports",
  "Zero Degree Esports",
  "Team Invaders",
  "Karachi Snipers",
  "4NM Esports",
  "Bawa Squad",
  "ROX Gaming",
  "CRUSH Gaming",
  "AKM Esports",
  "Shadow Syndicate",
  "Voltage Esports",
  "Nova Legends",
  "Lahore Lions",
];

// [name, kills] per team per match. Mandatory special cases:
// - TRB Gaming 4th player: TF×MAₛOOR (m1) vs TFxMA_SODOR (m2) — heavy OCR
//   drift, must stay two separate people everywhere (MVP editor resolves).
// - Bawa Squad 1st player: Bawa·Qadra (m1) vs Bawa Qadra (m2) — punctuation drift.
// - Straight Forward: tag-less, KALEEM → FAHEEM substitute in match 2.
// - 4NM Esports: every player prefixed "4NM | ".
const M1_PLAYERS = {
  "Straight Forward": [
    ["SHADOW", 4],
    ["JAZZ", 3],
    ["BULL", 4],
    ["KALEEM", 3],
  ],
  "TF Squad": [
    ["TF VORTX", 3],
    ["TF BLAZE", 3],
    ["TF NOVA", 3],
    ["TF PHANTOM", 3],
  ],
  "4NM Esports": [
    ["4NM | BROKEN", 3],
    ["4NM | VENOM", 3],
    ["4NM | SAVAGE", 2],
    ["4NM | NINJA", 3],
  ],
  "TRB Gaming": [
    ["TRB HANAN", 3],
    ["TRB ZAYN", 3],
    ["TRB AYAAN", 2],
    ["TF×MAₛOOR", 2],
  ],
  "Team Invaders": [
    ["INVADER UMAR", 2],
    ["INVADER TALHA", 2],
    ["VIPERX", 2],
    ["STORM", 2],
  ],
  "FMA Esports": [
    ["FMA RAYYAN", 2],
    ["FMA ARHAM", 2],
    ["FMA REEZA", 2],
    ["FLASH", 1],
  ],
  "ROX Gaming": [
    ["ROX FALCON", 2],
    ["ROX TITAN", 2],
    ["ROX RAPTOR", 1],
    ["SNIPER9", 1],
  ],
  "Bawa Squad": [
    ["Bawa·Qadra", 2],
    ["BAWA RIZWAN", 1],
    ["BAWA SHARJEEL", 1],
    ["KHAN", 1],
  ],
  "Zero Degree Esports": [
    ["ZERO ALI", 1],
    ["ZERO SAAD", 1],
    ["ZERO REHAN", 1],
    ["GHOST", 1],
  ],
  "CRUSH Gaming": [
    ["CRUSH AHMED", 2],
    ["CRUSH BILAL", 1],
    ["CRUSH DANISH", 1],
    ["RAIDEN", 0],
  ],
  "AKM Esports": [
    ["AKM HASSAN", 1],
    ["AKM SHAZIL", 1],
    ["AKM MOOSA", 1],
    ["ABDUL", 0],
  ],
  "Shadow Syndicate": [
    ["SHDW KAIF", 1],
    ["SHDW ARSLAN", 1],
    ["SHDW REHAN", 1],
    ["NEBULA", 0],
  ],
  "Karachi Snipers": [
    ["KHI OSAKA", 1],
    ["KHI RANA", 1],
    ["KHI ZAIN", 0],
    ["DAGGER", 0],
  ],
  "Lahore Lions": [
    ["LHR SHER", 1],
    ["LHR MUGHAL", 0],
    ["LHR BABAR", 0],
    ["TIGER", 0],
  ],
  "Voltage Esports": [
    ["VOLT ASAD", 1],
    ["VOLT MURAD", 0],
    ["VOLT SAFWAN", 0],
    ["THUNDER", 0],
  ],
  "Nova Legends": [
    ["NOVA SHAHZEB", 1],
    ["NOVA HAROON", 1],
    ["NOVA FARAZ", 0],
    ["COMET", 0],
  ],
};

const M2_PLAYERS = {
  "TF Squad": [
    ["TF VORTX", 4],
    ["TF BLAZE", 4],
    ["TF NOVA", 4],
    ["TF PHANTOM", 3],
  ],
  "Straight Forward": [
    ["SHADOW", 3],
    ["JAZZ", 4],
    ["BULL", 3],
    ["FAHEEM", 2],
  ],
  "TRB Gaming": [
    ["TRB HANAN", 3],
    ["TRB ZAYN", 3],
    ["TRB AYAAN", 3],
    ["TFxMA_SODOR", 2],
  ],
  "FMA Esports": [
    ["FMA RAYYAN", 3],
    ["FMA ARHAM", 3],
    ["FMA REEZA", 2],
    ["FLASH", 1],
  ],
  "Zero Degree Esports": [
    ["ZERO ALI", 2],
    ["ZERO SAAD", 3],
    ["ZERO REHAN", 2],
    ["GHOST", 1],
  ],
  "Team Invaders": [
    ["INVADER UMAR", 2],
    ["INVADER TALHA", 2],
    ["VIPERX", 2],
    ["STORM", 1],
  ],
  "Karachi Snipers": [
    ["KHI OSAKA", 2],
    ["KHI RANA", 2],
    ["KHI ZAIN", 1],
    ["DAGGER", 1],
  ],
  "4NM Esports": [
    ["4NM | BROKEN", 2],
    ["4NM | VENOM", 2],
    ["4NM | SAVAGE", 1],
    ["4NM | NINJA", 1],
  ],
  "Bawa Squad": [
    ["Bawa Qadra", 2],
    ["BAWA RIZWAN", 2],
    ["BAWA SHARJEEL", 1],
    ["KHAN", 0],
  ],
  "ROX Gaming": [
    ["ROX FALCON", 2],
    ["ROX TITAN", 1],
    ["ROX RAPTOR", 1],
    ["SNIPER9", 0],
  ],
  "CRUSH Gaming": [
    ["CRUSH AHMED", 2],
    ["CRUSH BILAL", 1],
    ["CRUSH DANISH", 1],
    ["RAIDEN", 0],
  ],
  "AKM Esports": [
    ["AKM HASSAN", 1],
    ["AKM SHAZIL", 1],
    ["AKM MOOSA", 1],
    ["ABDUL", 0],
  ],
  "Shadow Syndicate": [
    ["SHDW KAIF", 1],
    ["SHDW ARSLAN", 1],
    ["SHDW REHAN", 0],
    ["NEBULA", 0],
  ],
  "Voltage Esports": [
    ["VOLT ASAD", 1],
    ["VOLT MURAD", 0],
    ["VOLT SAFWAN", 0],
    ["THUNDER", 0],
  ],
  "Nova Legends": [
    ["NOVA SHAHZEB", 1],
    ["NOVA HAROON", 0],
    ["NOVA FARAZ", 0],
    ["COMET", 0],
  ],
  "Lahore Lions": [
    ["LHR SHER", 1],
    ["LHR MUGHAL", 1],
    ["LHR BABAR", 0],
    ["TIGER", 0],
  ],
};

const SQUAD_TAGS = {
  "Straight Forward": "",
  "TF Squad": "TF",
  "TRB Gaming": "TRB",
  "4NM Esports": "4NM",
  "Team Invaders": "INVADER",
  "FMA Esports": "FMA",
  "ROX Gaming": "ROX",
  "Bawa Squad": "BAWA",
  "Zero Degree Esports": "ZERO",
  "CRUSH Gaming": "CRUSH",
  "AKM Esports": "AKM",
  "Shadow Syndicate": "SHDW",
  "Karachi Snipers": "KHI",
  "Lahore Lions": "LHR",
  "Voltage Esports": "VOLT",
  "Nova Legends": "NOVA",
};

// must stay in sync with lib/matching/normalize (C2.2); duplication acceptable
// in an offline script. Per the C1.2-review decision: NFKD → strip combining
// marks → remove zero-width chars → lowercase → every run of chars outside
// [\p{L}\p{N}] becomes ONE space → trim. No tag-prefix stripping.
function normalizeName(name) {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const teamId = (name) =>
  `seed-team-${String(TEAMS.indexOf(name) + 1).padStart(2, "0")}`;

/**
 * Delete + reinsert the whole seed session graph in ONE transaction.
 * Exported so reset-db.mjs can reuse it after re-applying migrations.
 */
export async function seedDatabase(sql) {
  const now = new Date().toISOString();
  // jsonb params go through tx.json() — a plain string param (or a bare
  // array, which postgres.js serializes as a PG array literal) lands
  // double-encoded or invalid.
  const scoringRules = {
    kill_points: 1,
    placement_points: PLACEMENT_POINTS,
    default_placement_points: 0,
  };

  await sql.begin(async (tx) => {
    // idempotency: drop the previous seed session; children cascade
    await tx`DELETE FROM sessions WHERE id = ${SESSION_ID}`;

    // sessions.user_id is NOT NULL (migration 0003) — the seed owns a fixed
    // stand-in user (profile row created by the on_auth_user_created trigger).
    // On a hosted project this creates a phantom auth user usable only as the
    // seed's data owner; it cannot authenticate (no credentials).
    await tx`INSERT INTO auth.users (id, email)
      VALUES (${SEED_OWNER_ID}, 'seed-owner@scrimlypro.local')
      ON CONFLICT (id) DO NOTHING`;

    await tx`INSERT INTO sessions (id, user_id, name, planned_matches, team_count, template_id, scoring_rules, status, created_at)
      VALUES (${SESSION_ID}, ${SEED_OWNER_ID}, 'Seed Demo Scrim', 6, 16, 'dev-dark-gold', ${tx.json(scoringRules)}, 'active', ${now})`;

    for (const name of TEAMS) {
      await tx`INSERT INTO teams (id, session_id, name, logo_url) VALUES (${teamId(name)}, ${SESSION_ID}, ${name}, NULL)`;
    }

    const rostersSeen = new Set();
    for (const matchNo of [1, 2]) {
      const order = matchNo === 1 ? M1_ORDER : M2_ORDER;
      const playerData = matchNo === 1 ? M1_PLAYERS : M2_PLAYERS;
      const matchId = `seed-match-${String(matchNo).padStart(2, "0")}`;

      const rawSquads = order.map((teamName, i) => ({
        placement: i + 1,
        squadTag: SQUAD_TAGS[teamName],
        confidence: "high",
        players: playerData[teamName].map(([name, kills]) => ({
          name,
          kills,
          confidence: "high",
        })),
      }));
      await tx`INSERT INTO matches (id, session_id, match_no, status, raw_squad_data, created_at, confirmed_at)
        VALUES (${matchId}, ${SESSION_ID}, ${matchNo}, 'confirmed', ${tx.json(rawSquads)}, ${now}, ${now})`;

      let i = 0;
      for (const teamName of order) {
        const placement = i + 1;
        const players = playerData[teamName];
        const kills = players.reduce((sum, [, k]) => sum + k, 0);
        await tx`INSERT INTO match_results (id, match_id, team_id, placement, kills, placement_points, players)
          VALUES (${`seed-result-${matchNo}-${placement}`}, ${matchId}, ${teamId(teamName)}, ${placement}, ${kills}, ${PLACEMENT_POINTS[placement] ?? 0}, ${tx.json(players.map(([name, k]) => ({ name, kills: k })))})`;

        const tid = teamId(teamName);
        for (const [name] of players) {
          const norm = normalizeName(name);
          const key = `${tid}|${norm}`;
          if (!rostersSeen.has(key)) {
            rostersSeen.add(key);
            await tx`INSERT INTO rosters (team_id, player_norm, display_name) VALUES (${tid}, ${norm}, ${name})`; // display_name = match-1 spelling
          }
        }
        i += 1;
      }
    }
  });
}

import { pathToFileURL } from "node:url";

// Run the seed + self-verification only when invoked directly
// (reset-db.mjs imports seedDatabase instead of re-running this).
const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const sql = postgres(dbUrl(), { prepare: false, max: 1 });
  await seedDatabase(sql);

  // ---------------- self-verification ----------------
  let failures = 0;
  function check(name, ok, detail = "") {
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
    if (!ok) failures++;
  }

  const count = async (query) => (await query)[0].n;

  const counts = {
    sessions: await count(sql`SELECT COUNT(*)::int AS n FROM sessions WHERE id = ${SESSION_ID}`),
    teams: await count(sql`SELECT COUNT(*)::int AS n FROM teams WHERE session_id = ${SESSION_ID}`),
    matches: await count(sql`SELECT COUNT(*)::int AS n FROM matches WHERE session_id = ${SESSION_ID} AND status = 'confirmed'`),
    match_results: await count(sql`SELECT COUNT(*)::int AS n FROM match_results r JOIN matches m ON m.id = r.match_id WHERE m.session_id = ${SESSION_ID}`),
    rosters: await count(sql`SELECT COUNT(*)::int AS n FROM rosters r JOIN teams t ON t.id = r.team_id WHERE t.session_id = ${SESSION_ID}`),
  };

  check("1 session", counts.sessions === 1, `got ${counts.sessions}`);
  check("16 teams", counts.teams === 16, `got ${counts.teams}`);
  check(
    "2 matches, both confirmed",
    counts.matches === 2,
    `got ${counts.matches}`,
  );
  check("32 match_results", counts.match_results === 32, `got ${counts.match_results}`);
  check("rosters >= 64", counts.rosters >= 64, `got ${counts.rosters}`);

  const matches = await sql`
    SELECT id, match_no FROM matches WHERE session_id = ${SESSION_ID} ORDER BY match_no`;
  for (const m of matches) {
    const rows = await sql`
      SELECT placement, kills, players FROM match_results WHERE match_id = ${m.id}`;
    const placements = rows.map((r) => r.placement).sort((a, b) => a - b);
    check(
      `match ${m.match_no}: placements exactly 1..16 unique`,
      placements.length === 16 && placements.every((p, i) => p === i + 1),
      `got [${placements.join(",")}]`,
    );
    const lobbyKills = rows.reduce((s, r) => s + r.kills, 0);
    check(
      `match ${m.match_no}: lobby kills <= 99`,
      lobbyKills <= 99,
      `got ${lobbyKills}`,
    );
    for (const r of rows) {
      const players = r.players; // jsonb → already parsed by postgres.js
      const sum = players.reduce((s, p) => s + p.kills, 0);
      if (players.length < 1 || players.length > 4) {
        check(
          `match ${m.match_no} placement ${r.placement}: 1–4 players`,
          false,
          `got ${players.length}`,
        );
      } else if (sum !== r.kills) {
        check(
          `match ${m.match_no} placement ${r.placement}: kills = sum of players`,
          false,
          `${r.kills} vs ${sum}`,
        );
      }
    }
  }

  const sfRosterCount = (
    await sql`SELECT COUNT(*)::int AS n FROM rosters WHERE team_id = ${teamId("Straight Forward")}`
  )[0].n;
  check(
    "Straight Forward has 5 roster entries (substitute)",
    sfRosterCount === 5,
    `got ${sfRosterCount}`,
  );

  const trbNorms = (
    await sql`SELECT player_norm FROM rosters WHERE team_id = ${teamId("TRB Gaming")}`
  ).map((r) => r.player_norm);
  check(
    "TF×MAₛOOR and TFxMA_SODOR are two distinct roster entries",
    trbNorms.includes("tf masoor") && trbNorms.includes("tfxma sodor"),
    `got [${trbNorms.join(", ")}]`,
  );

  console.log("\nSeed counts");
  console.log("-----------");
  for (const [k, v] of Object.entries(counts)) console.log(`${k.padEnd(15)} ${v}`);

  await sql.end();
  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exitCode = 1;
  } else {
    console.log("\nAll seed checks passed.");
  }
}
