// Deterministic, idempotent, self-verifying seed. Run: npm run db:seed
// Plain better-sqlite3 (no TS runner). Fixed literal ids make re-runs safe:
// the seed session is deleted (cascade) then fully re-inserted.
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const SESSION_ID = "seed-00000000-0000-4000-8000-000000000001";

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
// in an offline script. NFKD → lowercase → strip tag prefix → remove
// zero-width chars → non-alphanumerics → space → collapse → trim.
const TAG_PREFIX = /^[\w×]{2,6}\s*[|·:.\-/]\s*/;
function normalizeName(name) {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(TAG_PREFIX, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });
const sqlite = new Database(path.join(dataDir, "scrimly.db"));
sqlite.pragma("foreign_keys = ON");

const now = new Date().toISOString();
const teamId = (name) =>
  `seed-team-${String(TEAMS.indexOf(name) + 1).padStart(2, "0")}`;

const insertSession = sqlite.prepare(
  `INSERT INTO sessions (id, name, planned_matches, team_count, template_id, scoring_rules, status, created_at)
   VALUES (?, 'Seed Demo Scrim', 6, 16, 'dev-dark-gold', ?, 'active', ?)`,
);
const insertTeam = sqlite.prepare(
  `INSERT INTO teams (id, session_id, name, logo_url) VALUES (?, ?, ?, NULL)`,
);
const insertMatch = sqlite.prepare(
  `INSERT INTO matches (id, session_id, match_no, status, raw_squad_data, created_at, confirmed_at)
   VALUES (?, ?, ?, 'confirmed', ?, ?, ?)`,
);
const insertResult = sqlite.prepare(
  `INSERT INTO match_results (id, match_id, team_id, placement, kills, placement_points, players)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const insertRoster = sqlite.prepare(
  `INSERT INTO rosters (team_id, player_norm, display_name) VALUES (?, ?, ?)`,
);

const seed = sqlite.transaction(() => {
  // idempotency: drop the previous seed session; children cascade
  sqlite.prepare(`DELETE FROM sessions WHERE id = ?`).run(SESSION_ID);

  insertSession.run(
    SESSION_ID,
    JSON.stringify({
      kill_points: 1,
      placement_points: PLACEMENT_POINTS,
      default_placement_points: 0,
    }),
    now,
  );
  for (const name of TEAMS) insertTeam.run(teamId(name), SESSION_ID, name);

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
    insertMatch.run(
      matchId,
      SESSION_ID,
      matchNo,
      JSON.stringify(rawSquads),
      now,
      now,
    );

    order.forEach((teamName, i) => {
      const placement = i + 1;
      const players = playerData[teamName];
      const kills = players.reduce((sum, [, k]) => sum + k, 0);
      insertResult.run(
        `seed-result-${matchNo}-${placement}`,
        matchId,
        teamId(teamName),
        placement,
        kills,
        PLACEMENT_POINTS[placement] ?? 0,
        JSON.stringify(players.map(([name, k]) => ({ name, kills: k }))),
      );

      const tid = teamId(teamName);
      for (const [name] of players) {
        const norm = normalizeName(name);
        const key = `${tid}|${norm}`;
        if (!rostersSeen.has(key)) {
          rostersSeen.add(key);
          insertRoster.run(tid, norm, name); // display_name = match-1 spelling
        }
      }
    });
  }
});
seed();

// ---------------- self-verification ----------------
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
}

const counts = {
  sessions: sqlite
    .prepare(`SELECT COUNT(*) AS n FROM sessions WHERE id = ?`)
    .get(SESSION_ID).n,
  teams: sqlite
    .prepare(`SELECT COUNT(*) AS n FROM teams WHERE session_id = ?`)
    .get(SESSION_ID).n,
  matches: sqlite
    .prepare(
      `SELECT COUNT(*) AS n FROM matches WHERE session_id = ? AND status = 'confirmed'`,
    )
    .get(SESSION_ID).n,
  match_results: sqlite
    .prepare(
      `SELECT COUNT(*) AS n FROM match_results r JOIN matches m ON m.id = r.match_id WHERE m.session_id = ?`,
    )
    .get(SESSION_ID).n,
  rosters: sqlite
    .prepare(
      `SELECT COUNT(*) AS n FROM rosters r JOIN teams t ON t.id = r.team_id WHERE t.session_id = ?`,
    )
    .get(SESSION_ID).n,
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

const matches = sqlite
  .prepare(`SELECT id, match_no FROM matches WHERE session_id = ? ORDER BY match_no`)
  .all(SESSION_ID);
for (const m of matches) {
  const rows = sqlite
    .prepare(`SELECT placement, kills, players FROM match_results WHERE match_id = ?`)
    .all(m.id);
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
    const players = JSON.parse(r.players);
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

const sfRosterCount = sqlite
  .prepare(
    `SELECT COUNT(*) AS n FROM rosters WHERE team_id = ?`,
  )
  .get(teamId("Straight Forward")).n;
check(
  "Straight Forward has 5 roster entries (substitute)",
  sfRosterCount === 5,
  `got ${sfRosterCount}`,
);

const trbNorms = sqlite
  .prepare(`SELECT player_norm FROM rosters WHERE team_id = ?`)
  .all(teamId("TRB Gaming"))
  .map((r) => r.player_norm);
check(
  "TF×MAₛOOR and TFxMA_SODOR are two distinct roster entries",
  trbNorms.includes("tf masoor") && trbNorms.includes("tfxma sodor"),
  `got [${trbNorms.join(", ")}]`,
);

console.log("\nSeed counts");
console.log("-----------");
for (const [k, v] of Object.entries(counts)) console.log(`${k.padEnd(15)} ${v}`);

sqlite.close();
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exitCode = 1;
} else {
  console.log("\nAll seed checks passed.");
}
