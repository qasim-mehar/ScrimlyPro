import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";

const { matchResults, matches, sessions, teams } = schema;

function testDb(): {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
} {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "db", "migrations"),
  });
  return { sqlite, db };
}

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6 },
  default_placement_points: 0,
};

describe("data layer", () => {
  let sqlite: Database.Database;
  let db: BetterSQLite3Database<typeof schema>;

  beforeEach(() => {
    ({ sqlite, db } = testDb());
    db.insert(sessions)
      .values({
        id: "s1",
        name: "T",
        plannedMatches: 6,
        teamCount: 16,
        scoringRules: RULES,
        createdAt: "2025-01-01T00:00:00.000Z",
      })
      .run();
  });

  afterEach(() => sqlite.close());

  it("round-trips a session graph with typed JSON columns", () => {
    db.insert(teams).values({ id: "t1", sessionId: "s1", name: "A" }).run();
    db.insert(matches)
      .values({
        id: "m1",
        sessionId: "s1",
        matchNo: 1,
        status: "confirmed",
        rawSquadData: [
          {
            placement: 1,
            squadTag: "",
            confidence: "high",
            players: [{ name: "X", kills: 3 }],
          },
        ],
        createdAt: "2025-01-01T00:00:00.000Z",
        confirmedAt: "2025-01-01T00:05:00.000Z",
      })
      .run();
    db.insert(matchResults)
      .values({
        id: "r1",
        matchId: "m1",
        teamId: "t1",
        placement: 1,
        kills: 3,
        placementPoints: 10,
        players: [{ name: "X", kills: 3 }],
      })
      .run();

    const s = db.select().from(sessions).where(eq(sessions.id, "s1")).all()[0]!;
    expect(s.scoringRules).toEqual(RULES);
    expect(s.status).toBe("active");

    const m = db.select().from(matches).all()[0]!;
    expect(m.rawSquadData?.[0]?.players[0]).toEqual({ name: "X", kills: 3 });

    const r = db.select().from(matchResults).all()[0]!;
    expect(r.players).toEqual([{ name: "X", kills: 3 }]);
  });

  it("enforces unique(session_id, name) on teams", () => {
    db.insert(teams).values({ id: "t1", sessionId: "s1", name: "A" }).run();
    expect(() =>
      db.insert(teams).values({ id: "t2", sessionId: "s1", name: "A" }).run(),
    ).toThrow();
  });

  it("enforces unique(session_id, match_no) on matches", () => {
    db.insert(matches)
      .values({ id: "m1", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" })
      .run();
    expect(() =>
      db.insert(matches)
        .values({ id: "m2", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" })
        .run(),
    ).toThrow();
  });

  it("enforces FKs on match_results.team_id", () => {
    db.insert(matches)
      .values({ id: "m1", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" })
      .run();
    expect(() =>
      db.insert(matchResults)
        .values({
          id: "r1",
          matchId: "m1",
          teamId: "ghost",
          placement: 1,
          kills: 0,
          placementPoints: 10,
          players: [],
        })
        .run(),
    ).toThrow();
  });

  it("cascades: deleting a session removes teams, matches, results", () => {
    db.insert(teams).values({ id: "t1", sessionId: "s1", name: "A" }).run();
    db.insert(matches)
      .values({ id: "m1", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" })
      .run();
    db.insert(matchResults)
      .values({
        id: "r1",
        matchId: "m1",
        teamId: "t1",
        placement: 1,
        kills: 0,
        placementPoints: 10,
        players: [],
      })
      .run();

    db.delete(sessions).where(eq(sessions.id, "s1")).run();
    expect(db.select().from(teams).all()).toHaveLength(0);
    expect(db.select().from(matches).all()).toHaveLength(0);
    expect(db.select().from(matchResults).all()).toHaveLength(0);
  });
});
