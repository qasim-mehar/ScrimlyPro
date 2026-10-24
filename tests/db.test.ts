import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { eq } from "drizzle-orm";

import * as schema from "@/lib/db/schema";
import { testDb } from "./helpers/pg";

const { matchResults, matches, sessions, teams } = schema;

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6 },
  default_placement_points: 0,
};

type PgDb = Awaited<ReturnType<typeof testDb>>["db"];

describe("data layer", () => {
  let cleanup: () => Promise<void>;
  let db: PgDb;

  beforeEach(async () => {
    ({ db, cleanup } = await testDb());
    await db.insert(sessions).values({
      id: "s1",
      userId: "11111111-1111-1111-1111-111111111111",
      name: "T",
      plannedMatches: 6,
      teamCount: 16,
      scoringRules: RULES,
      createdAt: "2025-01-01T00:00:00.000Z",
    });
  });

  afterEach(async () => cleanup());

  it("round-trips a session graph with typed JSON columns", async () => {
    await db.insert(teams).values({ id: "t1", sessionId: "s1", name: "A" });
    await db.insert(matches).values({
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
    });
    await db.insert(matchResults).values({
      id: "r1",
      matchId: "m1",
      teamId: "t1",
      placement: 1,
      kills: 3,
      placementPoints: 10,
      players: [{ name: "X", kills: 3 }],
    });

    const s = (await db.select().from(sessions).where(eq(sessions.id, "s1")))[0]!;
    expect(s.scoringRules).toEqual(RULES);
    expect(s.status).toBe("active");

    const m = (await db.select().from(matches))[0]!;
    expect(m.rawSquadData?.[0]?.players[0]).toEqual({ name: "X", kills: 3 });

    const r = (await db.select().from(matchResults))[0]!;
    expect(r.players).toEqual([{ name: "X", kills: 3 }]);
  });

  it("enforces unique(session_id, name) on teams", async () => {
    await db.insert(teams).values({ id: "t1", sessionId: "s1", name: "A" });
    await expect(
      db.insert(teams).values({ id: "t2", sessionId: "s1", name: "A" }),
    ).rejects.toThrow();
  });

  it("enforces unique(session_id, match_no) on matches", async () => {
    await db
      .insert(matches)
      .values({ id: "m1", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" });
    await expect(
      db
        .insert(matches)
        .values({ id: "m2", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" }),
    ).rejects.toThrow();
  });

  it("enforces FKs on match_results.team_id", async () => {
    await db
      .insert(matches)
      .values({ id: "m1", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" });
    await expect(
      db.insert(matchResults).values({
        id: "r1",
        matchId: "m1",
        teamId: "ghost",
        placement: 1,
        kills: 0,
        placementPoints: 10,
        players: [],
      }),
    ).rejects.toThrow();
  });

  it("cascades: deleting a session removes teams, matches, results", async () => {
    await db.insert(teams).values({ id: "t1", sessionId: "s1", name: "A" });
    await db
      .insert(matches)
      .values({ id: "m1", sessionId: "s1", matchNo: 1, createdAt: "2025-01-01T00:00:00.000Z" });
    await db.insert(matchResults).values({
      id: "r1",
      matchId: "m1",
      teamId: "t1",
      placement: 1,
      kills: 0,
      placementPoints: 10,
      players: [],
    });

    await db.delete(sessions).where(eq(sessions.id, "s1"));
    expect(await db.select().from(teams)).toHaveLength(0);
    expect(await db.select().from(matches)).toHaveLength(0);
    expect(await db.select().from(matchResults)).toHaveLength(0);
  });
});
