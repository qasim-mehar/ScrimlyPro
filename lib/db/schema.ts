import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ============================================================
   ScrimlyPro schema — EXACTLY per ERD.md §1–2 (Postgres port per ERD §6).
   Iron rule: do not change without updating ERD.md first.

   - ids: TEXT uuid v4, generated in app code (crypto.randomUUID)
   - timestamps: timestamptz (app passes ISO-8601 strings, read back as
     PG-rendered strings via mode "string")
   - JSON columns: jsonb, typed via $type<>
   - range constraints (planned_matches 1–6 etc.) are app-layer
     per ERD §2 — deliberately NOT SQL CHECKs.
   ============================================================ */

export type ScoringRules = {
  kill_points: number;
  placement_points: Record<string, number>;
  default_placement_points: number;
};

export type PlayerKill = { name: string; kills: number };

export type RawSquad = {
  placement: number;
  squadTag: string;
  confidence: "high" | "low";
  players: Array<PlayerKill & { confidence?: "high" | "low" }>;
};

export type MvpEntry = {
  rank: number;
  name: string;
  teamId: string;
  kills: number;
};

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  plannedMatches: integer("planned_matches").notNull(),
  teamCount: integer("team_count").notNull(),
  templateId: text("template_id").notNull().default("dev-dark-gold"),
  scoringRules: jsonb("scoring_rules").$type<ScoringRules>().notNull(),
  status: text("status")
    .$type<"active" | "completed">()
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
  },
  (t) => [
    uniqueIndex("teams_session_name_uq").on(t.sessionId, t.name),
    index("teams_session_idx").on(t.sessionId),
  ],
);

// ERD's rosters(team_id) index is covered by the composite PK prefix.
export const rosters = pgTable(
  "rosters",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerNorm: text("player_norm").notNull(),
    displayName: text("display_name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.playerNorm] })],
);

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    matchNo: integer("match_no").notNull(),
    status: text("status")
      .$type<"draft" | "confirmed">()
      .notNull()
      .default("draft"),
    rawSquadData: jsonb("raw_squad_data").$type<RawSquad[]>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    uniqueIndex("matches_session_no_uq").on(t.sessionId, t.matchNo),
    index("matches_session_idx").on(t.sessionId),
  ],
);

export const matchResults = pgTable(
  "match_results",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    placement: integer("placement").notNull(),
    kills: integer("kills").notNull(),
    placementPoints: integer("placement_points").notNull(),
    players: jsonb("players").$type<PlayerKill[]>().notNull(),
  },
  (t) => [
    index("match_results_match_idx").on(t.matchId),
    index("match_results_team_idx").on(t.teamId),
  ],
);

export const mvpLists = pgTable("mvp_lists", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  entries: jsonb("entries").$type<MvpEntry[]>().notNull(),
  locked: boolean("locked").notNull().default(false),
  lockedAt: timestamp("locked_at", { withTimezone: true, mode: "string" }),
});
