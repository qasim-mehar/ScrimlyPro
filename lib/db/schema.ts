import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ============================================================
   ScrimlyPro schema — EXACTLY per ERD.md §1–2.
   Iron rule: do not change without updating ERD.md first.

   - ids: TEXT uuid v4, generated in app code (crypto.randomUUID)
   - timestamps: TEXT ISO-8601 UTC, app-generated
   - JSON columns: text mode "json", typed via $type<>
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

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  plannedMatches: integer("planned_matches").notNull(),
  teamCount: integer("team_count").notNull(),
  templateId: text("template_id").notNull().default("dev-dark-gold"),
  scoringRules: text("scoring_rules", { mode: "json" })
    .$type<ScoringRules>()
    .notNull(),
  status: text("status")
    .$type<"active" | "completed">()
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
});

export const teams = sqliteTable(
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
export const rosters = sqliteTable(
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

export const matches = sqliteTable(
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
    rawSquadData: text("raw_squad_data", { mode: "json" }).$type<RawSquad[]>(),
    createdAt: text("created_at").notNull(),
    confirmedAt: text("confirmed_at"),
  },
  (t) => [
    uniqueIndex("matches_session_no_uq").on(t.sessionId, t.matchNo),
    index("matches_session_idx").on(t.sessionId),
  ],
);

export const matchResults = sqliteTable(
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
    players: text("players", { mode: "json" })
      .$type<PlayerKill[]>()
      .notNull(),
  },
  (t) => [
    index("match_results_match_idx").on(t.matchId),
    index("match_results_team_idx").on(t.teamId),
  ],
);

export const mvpLists = sqliteTable("mvp_lists", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  entries: text("entries", { mode: "json" }).$type<MvpEntry[]>().notNull(),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  lockedAt: text("locked_at"),
});
