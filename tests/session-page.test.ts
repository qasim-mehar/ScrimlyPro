import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { and, asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { computeStandings } from "@/lib/scoring";
import {
  markComplete,
  reopenSession,
  unlockMatch,
} from "@/lib/sessions/lifecycle";
import { getSessionPageData, nextMatchNumber } from "@/lib/sessions/queries";

const { matchResults, matches, rosters, sessions, teams } = schema;

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6, "3": 5 },
  default_placement_points: 0,
};

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

type Fixture = {
  teamIds: { alpha: string; bravo: string; charlie: string };
  matchIds: { m1: string; m2: string; draft: string };
};

/** Session + 3 teams + 2 confirmed matches with results + draft match. */
function seedTwoConfirmed(db: BetterSQLite3Database<typeof schema>): Fixture {
  db.insert(sessions)
    .values({
      id: "s1",
      name: "Session Page Fixture",
      plannedMatches: 6,
      teamCount: 3,
      templateId: "dark-gold",
      scoringRules: RULES,
      status: "active",
      createdAt: "2025-01-01T00:00:00.000Z",
    })
    .run();

  const teamIds = { alpha: "t1", bravo: "t2", charlie: "t3" };
  db.insert(teams)
    .values([
      { id: teamIds.alpha, sessionId: "s1", name: "Alpha" },
      { id: teamIds.bravo, sessionId: "s1", name: "Bravo" },
      { id: teamIds.charlie, sessionId: "s1", name: "Charlie" },
    ])
    .run();

  const matchIds = { m1: "m1", m2: "m2", draft: "m3" };
  db.insert(matches)
    .values([
      {
        id: matchIds.m1,
        sessionId: "s1",
        matchNo: 1,
        status: "confirmed",
        createdAt: "2025-01-01T00:00:00.000Z",
        confirmedAt: "2025-01-01T00:05:00.000Z",
      },
      {
        id: matchIds.m2,
        sessionId: "s1",
        matchNo: 2,
        status: "confirmed",
        createdAt: "2025-01-01T00:00:00.000Z",
        confirmedAt: "2025-01-01T00:10:00.000Z",
      },
      {
        id: matchIds.draft,
        sessionId: "s1",
        matchNo: 3,
        status: "draft",
        rawSquadData: [
          {
            placement: 1,
            squadTag: "",
            confidence: "high",
            players: [{ name: "Ghost", kills: 1 }],
          },
        ],
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ])
    .run();

  db.insert(matchResults)
    .values([
      {
        id: "r-m1-t1",
        matchId: matchIds.m1,
        teamId: teamIds.alpha,
        placement: 1,
        kills: 5,
        placementPoints: 10,
        players: [
          { name: "A1", kills: 3 },
          { name: "A2", kills: 2 },
        ],
      },
      {
        id: "r-m1-t2",
        matchId: matchIds.m1,
        teamId: teamIds.bravo,
        placement: 2,
        kills: 4,
        placementPoints: 6,
        players: [{ name: "B1", kills: 4 }],
      },
      {
        id: "r-m1-t3",
        matchId: matchIds.m1,
        teamId: teamIds.charlie,
        placement: 3,
        kills: 2,
        placementPoints: 5,
        players: [{ name: "C1", kills: 2 }],
      },
      {
        id: "r-m2-t2",
        matchId: matchIds.m2,
        teamId: teamIds.bravo,
        placement: 1,
        kills: 6,
        placementPoints: 10,
        players: [
          { name: "B1", kills: 4 },
          { name: "B2", kills: 2 },
        ],
      },
      {
        id: "r-m2-t1",
        matchId: matchIds.m2,
        teamId: teamIds.alpha,
        placement: 2,
        kills: 3,
        placementPoints: 6,
        players: [{ name: "A1", kills: 3 }],
      },
      {
        id: "r-m2-t3",
        matchId: matchIds.m2,
        teamId: teamIds.charlie,
        placement: 3,
        kills: 1,
        placementPoints: 5,
        players: [{ name: "C1", kills: 1 }],
      },
    ])
    .run();

  // Rosters as learned from BOTH confirmed matches (B2 only from m2).
  db.insert(rosters)
    .values([
      { teamId: teamIds.alpha, playerNorm: "a1", displayName: "A1" },
      { teamId: teamIds.alpha, playerNorm: "a2", displayName: "A2" },
      { teamId: teamIds.bravo, playerNorm: "b1", displayName: "B1" },
      { teamId: teamIds.bravo, playerNorm: "b2", displayName: "B2" },
      { teamId: teamIds.charlie, playerNorm: "c1", displayName: "C1" },
    ])
    .run();

  return { teamIds, matchIds };
}

describe("session page", () => {
  let sqlite: Database.Database;
  let db: BetterSQLite3Database<typeof schema>;

  beforeEach(() => {
    ({ sqlite, db } = testDb());
  });

  afterEach(() => sqlite.close());

  it("unlock removes m2 results, drafts m2, rebuilds rosters from m1 only", () => {
    const { matchIds } = seedTwoConfirmed(db);

    const result = unlockMatch(db, "s1", matchIds.m2);
    expect(result).toEqual({ ok: true });

    // m2 results gone.
    expect(
      db
        .select()
        .from(matchResults)
        .where(eq(matchResults.matchId, matchIds.m2))
        .all(),
    ).toHaveLength(0);

    // m2 back to draft with null confirmedAt.
    const m2 = db
      .select()
      .from(matches)
      .where(eq(matches.id, matchIds.m2))
      .all()[0]!;
    expect(m2.status).toBe("draft");
    expect(m2.confirmedAt).toBeNull();

    // Rosters == rebuild from m1 only: B2 (m2-only) is gone.
    const rosterRows = db
      .select()
      .from(rosters)
      .orderBy(asc(rosters.teamId), asc(rosters.playerNorm))
      .all();
    expect(rosterRows).toEqual([
      { teamId: "t1", playerNorm: "a1", displayName: "A1" },
      { teamId: "t1", playerNorm: "a2", displayName: "A2" },
      { teamId: "t2", playerNorm: "b1", displayName: "B1" },
      { teamId: "t3", playerNorm: "c1", displayName: "C1" },
    ]);

    // Standings via computeStandings reflect m1 only.
    const page = getSessionPageData(db, "s1")!;
    expect(page.confirmedCount).toBe(1);
    const standings = computeStandings(
      page.results,
      page.teams,
      page.session.scoringRules,
    );
    expect(
      standings.map((s) => ({
        name: s.teamName,
        total: s.total,
        wwcd: s.wwcd,
      })),
    ).toEqual([
      { name: "Alpha", total: 15, wwcd: 1 },
      { name: "Bravo", total: 10, wwcd: 0 },
      { name: "Charlie", total: 7, wwcd: 0 },
    ]);
  });

  it("unlock rejects a draft match", () => {
    const { matchIds } = seedTwoConfirmed(db);
    expect(unlockMatch(db, "s1", matchIds.draft)).toEqual({
      ok: false,
      message: expect.any(String),
    });
    // Nothing changed: both confirmed matches still have results.
    expect(db.select().from(matchResults).all()).toHaveLength(6);
  });

  it("unlock rejects a match from another session", () => {
    seedTwoConfirmed(db);
    db.insert(sessions)
      .values({
        id: "s2",
        name: "Other",
        plannedMatches: 6,
        teamCount: 4,
        templateId: "dark-gold",
        scoringRules: RULES,
        status: "active",
        createdAt: "2025-01-01T00:00:00.000Z",
      })
      .run();
    db.insert(matches)
      .values({
        id: "mx",
        sessionId: "s2",
        matchNo: 1,
        status: "confirmed",
        createdAt: "2025-01-01T00:00:00.000Z",
        confirmedAt: "2025-01-01T00:05:00.000Z",
      })
      .run();
    expect(unlockMatch(db, "s1", "mx")).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it("unlocking the only confirmed match empties rosters", () => {
    db.insert(sessions)
      .values({
        id: "solo",
        name: "Solo",
        plannedMatches: 6,
        teamCount: 4,
        templateId: "dark-gold",
        scoringRules: RULES,
        status: "active",
        createdAt: "2025-01-01T00:00:00.000Z",
      })
      .run();
    db.insert(teams)
      .values({ id: "solo-t", sessionId: "solo", name: "Solo Team" })
      .run();
    db.insert(matches)
      .values({
        id: "solo-m",
        sessionId: "solo",
        matchNo: 1,
        status: "confirmed",
        createdAt: "2025-01-01T00:00:00.000Z",
        confirmedAt: "2025-01-01T00:05:00.000Z",
      })
      .run();
    db.insert(matchResults)
      .values({
        id: "solo-r",
        matchId: "solo-m",
        teamId: "solo-t",
        placement: 1,
        kills: 2,
        placementPoints: 10,
        players: [{ name: "Solo1", kills: 2 }],
      })
      .run();
    db.insert(rosters)
      .values({ teamId: "solo-t", playerNorm: "solo1", displayName: "Solo1" })
      .run();

    expect(unlockMatch(db, "solo", "solo-m")).toEqual({ ok: true });
    expect(db.select().from(rosters).all()).toHaveLength(0);
    expect(
      db
        .select()
        .from(matchResults)
        .where(eq(matchResults.matchId, "solo-m"))
        .all(),
    ).toHaveLength(0);
  });

  it("markComplete / reopen transitions, double-complete safe", () => {
    seedTwoConfirmed(db);

    expect(markComplete(db, "s1")).toEqual({ ok: true });
    expect(
      db.select().from(sessions).where(eq(sessions.id, "s1")).all()[0]!.status,
    ).toBe("completed");

    // Idempotent-safe second complete.
    expect(markComplete(db, "s1")).toEqual({ ok: true });
    expect(
      db.select().from(sessions).where(eq(sessions.id, "s1")).all()[0]!.status,
    ).toBe("completed");

    expect(reopenSession(db, "s1")).toEqual({ ok: true });
    expect(
      db.select().from(sessions).where(eq(sessions.id, "s1")).all()[0]!.status,
    ).toBe("active");

    // Reopening an active session is also safe.
    expect(reopenSession(db, "s1")).toEqual({ ok: true });

    expect(markComplete(db, "missing")).toEqual({
      ok: false,
      message: expect.any(String),
    });
    expect(reopenSession(db, "missing")).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it("nextMatchNumber follows the sequential rule", () => {
    expect(nextMatchNumber(0, 6)).toBe(1);
    expect(nextMatchNumber(2, 6)).toBe(3);
    expect(nextMatchNumber(6, 6)).toBeNull();
  });

  it("getSessionPageData projects winners and never leaks rawSquadData", () => {
    seedTwoConfirmed(db);
    const page = getSessionPageData(db, "s1")!;
    expect(page.session.name).toBe("Session Page Fixture");
    expect(page.confirmedCount).toBe(2);
    expect(page.matches.map((m) => m.matchNo)).toEqual([1, 2, 3]);
    expect(page.matches.map((m) => m.status)).toEqual([
      "confirmed",
      "confirmed",
      "draft",
    ]);
    // Winner = placement-1 team; drafts carry null.
    expect(page.matches.map((m) => m.winnerTeamName)).toEqual([
      "Alpha",
      "Bravo",
      null,
    ]);
    // Only confirmed results feed standings.
    expect(page.results).toHaveLength(6);
    // No rawSquadData anywhere in the projected payload.
    expect(JSON.stringify(page)).not.toContain("rawSquadData");
    for (const m of page.matches) {
      expect(m).not.toHaveProperty("rawSquadData");
    }
    expect(getSessionPageData(db, "nope")).toBeNull();
  });

  it("standings from page results order by total then tie-breaks", () => {
    seedTwoConfirmed(db);
    const page = getSessionPageData(db, "s1")!;
    const standings = computeStandings(
      page.results,
      page.teams,
      page.session.scoringRules,
    );
    // m1+m2: Bravo 10+16=26, Alpha 15+9=24, Charlie 7+6=13.
    expect(standings.map((s) => s.teamName)).toEqual([
      "Bravo",
      "Alpha",
      "Charlie",
    ]);
    expect(standings[0]!.total).toBe(26);
  });

  it("unlock keeps other sessions untouched", () => {
    const { matchIds } = seedTwoConfirmed(db);
    db.insert(sessions)
      .values({
        id: "s2",
        name: "Other",
        plannedMatches: 6,
        teamCount: 4,
        templateId: "dark-gold",
        scoringRules: RULES,
        status: "active",
        createdAt: "2025-01-01T00:00:00.000Z",
      })
      .run();
    db.insert(teams)
      .values({ id: "s2-t", sessionId: "s2", name: "Other Team" })
      .run();
    db.insert(rosters)
      .values({ teamId: "s2-t", playerNorm: "o1", displayName: "O1" })
      .run();

    expect(unlockMatch(db, "s1", matchIds.m2)).toEqual({ ok: true });
    expect(
      db
        .select()
        .from(rosters)
        .where(
          and(eq(rosters.teamId, "s2-t"), eq(rosters.playerNorm, "o1")),
        )
        .all(),
    ).toHaveLength(1);
  });
});
