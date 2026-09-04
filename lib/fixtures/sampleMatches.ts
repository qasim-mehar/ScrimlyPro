import type { RawSquad } from "@/lib/db/schema";

/**
 * SAMPLE_MATCHES — offline fixtures for matches 1–3 over the 16 seed teams.
 * Team name list is identical to scripts/seed.mjs ON PURPOSE: C5.2's fixture
 * mode replays these squads against a seeded session.
 *
 * Intended squad→team mapping (THE contract C5.3's tests lean on).
 * Squads are listed in placement order (index 0 = placement 1), so the
 * placement→team map per match is:
 *
 *   Match 1                          Match 2                          Match 3
 *    1 TRB Gaming                     1 TF Squad                       1 4NM Esports
 *    2 TF Squad                       2 4NM Esports                    2 TRB Gaming
 *    3 4NM Esports                    3 TRB Gaming                     3 ROX Gaming
 *    4 ROX Gaming                     4 CRUSH Gaming                   4 TF Squad
 *    5 FMA Esports                    5 ROX Gaming                     5 CRUSH Gaming
 *    6 Zero Degree Esports            6 FMA Esports                    6 AKM Esports
 *    7 CRUSH Gaming                   7 AKM Esports                    7 FMA Esports
 *    8 AKM Esports                    8 Zero Degree Esports            8 Bawa Squad
 *    9 Bawa Squad                     9 Team Invaders                  9 Zero Degree Esports
 *   10 Team Invaders                 10 Bawa Squad                    10 Karachi Snipers
 *   11 Karachi Snipers               11 Voltage Esports               11 Team Invaders
 *   12 Straight Forward              12 Straight Forward              12 Straight Forward
 *   13 Lahore Lions                  13 Nova Legends                  13 Voltage Esports
 *   14 Voltage Esports               14 Karachi Snipers               14 Lahore Lions
 *   15 Shadow Syndicate              15 Lahore Lions                  15 Nova Legends
 *   16 Nova Legends                  16 Shadow Syndicate              16 Shadow Syndicate
 *
 * Special cases baked in (real-world messiness for downstream chunks):
 * - TRB Gaming's 4th player is the heavy-drift pair: TF×MAₛOOR (match 1),
 *   TFxMA_SODOR (match 2), TF×MAₛOOR (match 3).
 * - Bawa Squad: Bawa·Qadra (match 1) vs Bawa Qadra (matches 2–3); the other
 *   three players are identical across all matches.
 * - Straight Forward is tag-less; 4th player KALEEM (matches 1–2) is
 *   substituted by FAHEEM in match 3.
 * - 4NM Esports: every player prefixed "4NM | ". TF Squad: TF VORTX / BLAZE /
 *   NOVA / PHANTOM.
 * - squadTag is only set for TRB, TF, 4NM, ROX, CRUSH, AKM; all other squads
 *   have "" (including Bawa Squad and Straight Forward).
 * - Confidence is "high" for every squad; 2–3 players per match carry "low".
 *
 * Kill profile per match: winner totals 12–18, declining to 0–2 for
 * placements 13–16, lobby total 60–99.
 */
export const SAMPLE_TEAM_NAMES: string[] = [
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

type FixturePlayer = { name: string; kills: number; confidence?: "high" | "low" };
type FixtureSquad = { team: string; squadTag: string; players: FixturePlayer[] };

function toRawSquads(squads: FixtureSquad[]): RawSquad[] {
  return squads.map((squad, index) => ({
    placement: index + 1,
    squadTag: squad.squadTag,
    confidence: "high",
    players: squad.players,
  }));
}

const MATCH_1: FixtureSquad[] = [
  {
    team: "TRB Gaming",
    squadTag: "TRB",
    players: [
      { name: "TRB HANAN", kills: 4 },
      { name: "TRB ARYAN", kills: 3 },
      { name: "TRB ZORAWAR", kills: 3 },
      { name: "TF×MAₛOOR", kills: 3 },
    ],
  },
  {
    team: "TF Squad",
    squadTag: "TF",
    players: [
      { name: "TF VORTX", kills: 3 },
      { name: "TF BLAZE", kills: 3 },
      { name: "TF NOVA", kills: 3 },
      { name: "TF PHANTOM", kills: 2 },
    ],
  },
  {
    team: "4NM Esports",
    squadTag: "4NM",
    players: [
      { name: "4NM | BROKEN", kills: 4 },
      { name: "4NM | VIPER", kills: 3 },
      { name: "4NM | GHOST", kills: 2 },
      { name: "4NM | STORM", kills: 1 },
    ],
  },
  {
    team: "ROX Gaming",
    squadTag: "ROX",
    players: [
      { name: "ROX AHMED", kills: 3 },
      { name: "ROX TALHA", kills: 3 },
      { name: "ROX FAISAL", kills: 2 },
    ],
  },
  {
    team: "FMA Esports",
    squadTag: "",
    players: [
      { name: "RAYYAN", kills: 3 },
      { name: "SAMEER", kills: 2 },
      { name: "BILAL", kills: 2 },
    ],
  },
  {
    team: "Zero Degree Esports",
    squadTag: "",
    players: [
      { name: "AAHIL", kills: 2 },
      { name: "REHAN", kills: 2 },
      { name: "SAAD", kills: 1 },
      { name: "NABIL", kills: 1 },
    ],
  },
  {
    team: "CRUSH Gaming",
    squadTag: "CRUSH",
    players: [
      { name: "CRUSH UMAR", kills: 2 },
      { name: "CRUSH ZAIN", kills: 2 },
      { name: "CRUSH YASIR", kills: 1 },
    ],
  },
  {
    team: "AKM Esports",
    squadTag: "AKM",
    players: [
      { name: "AKM HAROON", kills: 2 },
      { name: "AKM SAFWAN", kills: 2 },
      { name: "AKM REHMAN", kills: 1 },
    ],
  },
  {
    team: "Bawa Squad",
    squadTag: "",
    players: [
      { name: "Bawa·Qadra", kills: 2 },
      { name: "Bawa Faisal", kills: 1 },
      { name: "Bawa Tariq", kills: 1 },
    ],
  },
  {
    team: "Team Invaders",
    squadTag: "",
    players: [
      { name: "KHALID", kills: 2 },
      { name: "ASAD", kills: 1 },
      { name: "MOHSIN", kills: 0, confidence: "low" },
    ],
  },
  {
    team: "Karachi Snipers",
    squadTag: "",
    players: [
      { name: "IMRAN", kills: 1 },
      { name: "FURQAN", kills: 1 },
      { name: "ZOHAIB", kills: 0 },
    ],
  },
  {
    team: "Straight Forward",
    squadTag: "",
    players: [
      { name: "SHERAZ", kills: 1 },
      { name: "DANISH", kills: 1 },
      { name: "HAMZA", kills: 0 },
      { name: "KALEEM", kills: 0, confidence: "low" },
    ],
  },
  {
    team: "Lahore Lions",
    squadTag: "",
    players: [
      { name: "ARSLAN", kills: 1 },
      { name: "MUDASSIR", kills: 1 },
      { name: "SAQLAIN", kills: 0 },
    ],
  },
  {
    team: "Voltage Esports",
    squadTag: "",
    players: [
      { name: "NAVEED", kills: 1 },
      { name: "SHAHZAIB", kills: 0 },
      { name: "AREEB", kills: 0 },
    ],
  },
  {
    team: "Shadow Syndicate",
    squadTag: "",
    players: [
      { name: "ATIF", kills: 1 },
      { name: "KASHIF", kills: 0 },
      { name: "WAQAR", kills: 0 },
    ],
  },
  {
    team: "Nova Legends",
    squadTag: "",
    players: [
      { name: "HASEEB", kills: 0 },
      { name: "TALAL", kills: 0 },
      { name: "RAZA", kills: 0, confidence: "low" },
    ],
  },
];

const MATCH_2: FixtureSquad[] = [
  {
    team: "TF Squad",
    squadTag: "TF",
    players: [
      { name: "TF VORTX", kills: 4 },
      { name: "TF BLAZE", kills: 3 },
      { name: "TF NOVA", kills: 3 },
      { name: "TF PHANTOM", kills: 3 },
    ],
  },
  {
    team: "4NM Esports",
    squadTag: "4NM",
    players: [
      { name: "4NM | BROKEN", kills: 3 },
      { name: "4NM | VIPER", kills: 3 },
      { name: "4NM | GHOST", kills: 3 },
      { name: "4NM | STORM", kills: 2 },
    ],
  },
  {
    team: "TRB Gaming",
    squadTag: "TRB",
    players: [
      { name: "TRB HANAN", kills: 3 },
      { name: "TRB ARYAN", kills: 3 },
      { name: "TRB ZORAWAR", kills: 2 },
      { name: "TFxMA_SODOR", kills: 2 },
    ],
  },
  {
    team: "CRUSH Gaming",
    squadTag: "CRUSH",
    players: [
      { name: "CRUSH UMAR", kills: 3 },
      { name: "CRUSH ZAIN", kills: 3 },
      { name: "CRUSH YASIR", kills: 2 },
    ],
  },
  {
    team: "ROX Gaming",
    squadTag: "ROX",
    players: [
      { name: "ROX AHMED", kills: 3 },
      { name: "ROX TALHA", kills: 2 },
      { name: "ROX FAISAL", kills: 2 },
    ],
  },
  {
    team: "FMA Esports",
    squadTag: "",
    players: [
      { name: "RAYYAN", kills: 2 },
      { name: "SAMEER", kills: 2 },
      { name: "BILAL", kills: 2 },
    ],
  },
  {
    team: "AKM Esports",
    squadTag: "AKM",
    players: [
      { name: "AKM HAROON", kills: 2 },
      { name: "AKM SAFWAN", kills: 2 },
      { name: "AKM REHMAN", kills: 1 },
    ],
  },
  {
    team: "Zero Degree Esports",
    squadTag: "",
    players: [
      { name: "AAHIL", kills: 2 },
      { name: "REHAN", kills: 1 },
      { name: "SAAD", kills: 1 },
      { name: "NABIL", kills: 1 },
    ],
  },
  {
    team: "Team Invaders",
    squadTag: "",
    players: [
      { name: "KHALID", kills: 2 },
      { name: "ASAD", kills: 1 },
      { name: "MOHSIN", kills: 1 },
    ],
  },
  {
    team: "Bawa Squad",
    squadTag: "",
    players: [
      { name: "Bawa Qadra", kills: 1 },
      { name: "Bawa Faisal", kills: 1 },
      { name: "Bawa Tariq", kills: 1 },
    ],
  },
  {
    team: "Voltage Esports",
    squadTag: "",
    players: [
      { name: "NAVEED", kills: 1 },
      { name: "SHAHZAIB", kills: 1, confidence: "low" },
      { name: "AREEB", kills: 0 },
    ],
  },
  {
    team: "Straight Forward",
    squadTag: "",
    players: [
      { name: "SHERAZ", kills: 1 },
      { name: "DANISH", kills: 1 },
      { name: "HAMZA", kills: 0 },
      { name: "KALEEM", kills: 0, confidence: "low" },
    ],
  },
  {
    team: "Nova Legends",
    squadTag: "",
    players: [
      { name: "HASEEB", kills: 1 },
      { name: "TALAL", kills: 0 },
      { name: "RAZA", kills: 0 },
    ],
  },
  {
    team: "Karachi Snipers",
    squadTag: "",
    players: [
      { name: "IMRAN", kills: 1 },
      { name: "FURQAN", kills: 0 },
      { name: "ZOHAIB", kills: 0 },
    ],
  },
  {
    team: "Lahore Lions",
    squadTag: "",
    players: [
      { name: "ARSLAN", kills: 0 },
      { name: "MUDASSIR", kills: 0 },
      { name: "SAQLAIN", kills: 0 },
    ],
  },
  {
    team: "Shadow Syndicate",
    squadTag: "",
    players: [
      { name: "ATIF", kills: 0, confidence: "low" },
      { name: "KASHIF", kills: 0 },
      { name: "WAQAR", kills: 0 },
    ],
  },
];

const MATCH_3: FixtureSquad[] = [
  {
    team: "4NM Esports",
    squadTag: "4NM",
    players: [
      { name: "4NM | BROKEN", kills: 4 },
      { name: "4NM | VIPER", kills: 4 },
      { name: "4NM | GHOST", kills: 3 },
      { name: "4NM | STORM", kills: 2 },
    ],
  },
  {
    team: "TRB Gaming",
    squadTag: "TRB",
    players: [
      { name: "TRB HANAN", kills: 3 },
      { name: "TRB ARYAN", kills: 3 },
      { name: "TRB ZORAWAR", kills: 3 },
      { name: "TF×MAₛOOR", kills: 2 },
    ],
  },
  {
    team: "ROX Gaming",
    squadTag: "ROX",
    players: [
      { name: "ROX AHMED", kills: 4 },
      { name: "ROX TALHA", kills: 3 },
      { name: "ROX FAISAL", kills: 3 },
    ],
  },
  {
    team: "TF Squad",
    squadTag: "TF",
    players: [
      { name: "TF VORTX", kills: 3 },
      { name: "TF BLAZE", kills: 2 },
      { name: "TF NOVA", kills: 2 },
      { name: "TF PHANTOM", kills: 1 },
    ],
  },
  {
    team: "CRUSH Gaming",
    squadTag: "CRUSH",
    players: [
      { name: "CRUSH UMAR", kills: 3 },
      { name: "CRUSH ZAIN", kills: 2 },
      { name: "CRUSH YASIR", kills: 2 },
    ],
  },
  {
    team: "AKM Esports",
    squadTag: "AKM",
    players: [
      { name: "AKM HAROON", kills: 2 },
      { name: "AKM SAFWAN", kills: 2 },
      { name: "AKM REHMAN", kills: 2 },
    ],
  },
  {
    team: "FMA Esports",
    squadTag: "",
    players: [
      { name: "RAYYAN", kills: 2 },
      { name: "SAMEER", kills: 2 },
      { name: "BILAL", kills: 1 },
    ],
  },
  {
    team: "Bawa Squad",
    squadTag: "",
    players: [
      { name: "Bawa Qadra", kills: 2 },
      { name: "Bawa Faisal", kills: 2 },
      { name: "Bawa Tariq", kills: 1 },
    ],
  },
  {
    team: "Zero Degree Esports",
    squadTag: "",
    players: [
      { name: "AAHIL", kills: 2 },
      { name: "REHAN", kills: 1 },
      { name: "SAAD", kills: 1 },
      { name: "NABIL", kills: 0, confidence: "low" },
    ],
  },
  {
    team: "Karachi Snipers",
    squadTag: "",
    players: [
      { name: "IMRAN", kills: 1 },
      { name: "FURQAN", kills: 1 },
      { name: "ZOHAIB", kills: 1 },
    ],
  },
  {
    team: "Team Invaders",
    squadTag: "",
    players: [
      { name: "KHALID", kills: 1 },
      { name: "ASAD", kills: 1 },
      { name: "MOHSIN", kills: 0, confidence: "low" },
    ],
  },
  {
    team: "Straight Forward",
    squadTag: "",
    players: [
      { name: "SHERAZ", kills: 1 },
      { name: "DANISH", kills: 0 },
      { name: "HAMZA", kills: 0 },
      { name: "FAHEEM", kills: 1 },
    ],
  },
  {
    team: "Voltage Esports",
    squadTag: "",
    players: [
      { name: "NAVEED", kills: 1 },
      { name: "SHAHZAIB", kills: 0 },
      { name: "AREEB", kills: 0 },
    ],
  },
  {
    team: "Lahore Lions",
    squadTag: "",
    players: [
      { name: "ARSLAN", kills: 1 },
      { name: "MUDASSIR", kills: 0 },
      { name: "SAQLAIN", kills: 0 },
    ],
  },
  {
    team: "Nova Legends",
    squadTag: "",
    players: [
      { name: "HASEEB", kills: 0 },
      { name: "TALAL", kills: 0 },
      { name: "RAZA", kills: 0, confidence: "low" },
    ],
  },
  {
    team: "Shadow Syndicate",
    squadTag: "",
    players: [
      { name: "ATIF", kills: 0 },
      { name: "KASHIF", kills: 0 },
      { name: "WAQAR", kills: 0 },
    ],
  },
];

export const SAMPLE_MATCHES: RawSquad[][] = [
  toRawSquads(MATCH_1),
  toRawSquads(MATCH_2),
  toRawSquads(MATCH_3),
];
