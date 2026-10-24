import { and, asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { computeStandings } from "@/lib/scoring";
import {
  markComplete,
  reopenSession,
  unlockMatch,
} from "@/lib/sessions/lifecycle";
import { getSessionPageData, nextMatchNumber, sessionNudge } from "@/lib/sessions/queries";

import { testDb } from "./helpers/pg";

const { matchResults, matches, mvpLists, rosters, sessions, teams } = schema;

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6, "3": 5 },
  default_placement_points: 0,
};

type PgDb = Awaited<ReturnType<typeof testDb>>["db"];

type Fixture = {
  teamIds: { alpha: string; bravo: string; charlie: string };
  matchIds: { m1: string; m2: string; draft: string };
};

/** Session + 3 teams + 2 confirmed matches with results + draft match. */
async function seedTwoConfirmed(db: PgDb): Promise<Fixture> {
  await db.insert(sessions).values({
    id: "s1",
    name: "Session Page Fixture",
    plannedMatches: 6,
    teamCount: 3,
    templateId: "dark-gold",
    scoringRules: RULES,
    status: "active",
    createdAt: "2025-01-01T00:00:00.000Z",
  });

  const teamIds = { alpha: "t1", bravo: "t2", charlie: "t3" };
  await db.insert(teams).values([
    { id: teamIds.alpha, sessionId: "s1", name: "Alpha" },
    { id: teamIds.bravo, sessionId: "s1", name: "Bravo" },
    { id: teamIds.charlie, sessionId: "s1", name: "Charlie" },
  ]);

  const matchIds = { m1: "m1", m2: "m2", draft: "m3" };
  await db.insert(matches).values([
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
  ]);

  await db.insert(matchResults).values([
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
  ]);

  // Rosters as learned from BOTH confirmed matches (B2 only from m2).
  await db.insert(rosters).values([
    { teamId: teamIds.alpha, playerNorm: "a1", displayName: "A1" },
    { teamId: teamIds.alpha, playerNorm: "a2", displayName: "A2" },
    { teamId: teamIds.bravo, playerNorm: "b1", displayName: "B1" },
    { teamId: teamIds.bravo, playerNorm: "b2", displayName: "B2" },
    { teamId: teamIds.charlie, playerNorm: "c1", displayName: "C1" },
  ]);

  return { teamIds, matchIds };
}

describe("session page", () => {
  let cleanup: () => Promise<void>;
  let db: PgDb;

  beforeEach(async () => {
    ({ db, cleanup } = await testDb());
  });

  afterEach(async () => cleanup());

  it("unlock removes m2 results, drafts m2, rebuilds rosters from m1 only", async () => {
    const { matchIds } = await seedTwoConfirmed(db);

    const result = await unlockMatch(db, "s1", matchIds.m2);
    expect(result).toEqual({ ok: true });

    // m2 results gone.
    expect(
      await db
        .select()
        .from(matchResults)
        .where(eq(matchResults.matchId, matchIds.m2)),
    ).toHaveLength(0);

    // m2 back to draft with null confirmedAt.
    const m2 = (
      await db.select().from(matches).where(eq(matches.id, matchIds.m2))
    )[0]!;
    expect(m2.status).toBe("draft");
    expect(m2.confirmedAt).toBeNull();

    // Rosters == rebuild from m1 only: B2 (m2-only) is gone.
    const rosterRows = await db
      .select()
      .from(rosters)
      .orderBy(asc(rosters.teamId), asc(rosters.playerNorm));
    expect(rosterRows).toEqual([
      { teamId: "t1", playerNorm: "a1", displayName: "A1" },
      { teamId: "t1", playerNorm: "a2", displayName: "A2" },
      { teamId: "t2", playerNorm: "b1", displayName: "B1" },
      { teamId: "t3", playerNorm: "c1", displayName: "C1" },
    ]);

    // Standings via computeStandings reflect m1 only.
    const page = (await getSessionPageData(db, "s1"))!;
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

  it("unlock rejects a draft match", async () => {
    const { matchIds } = await seedTwoConfirmed(db);
    expect(await unlockMatch(db, "s1", matchIds.draft)).toEqual({
      ok: false,
      message: expect.any(String),
    });
    // Nothing changed: both confirmed matches still have results.
    expect(await db.select().from(matchResults)).toHaveLength(6);
  });

  it("unlock rejects a match from another session", async () => {
    await seedTwoConfirmed(db);
    await db.insert(sessions).values({
      id: "s2",
      name: "Other",
      plannedMatches: 6,
      teamCount: 4,
      templateId: "dark-gold",
      scoringRules: RULES,
      status: "active",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    await db.insert(matches).values({
      id: "mx",
      sessionId: "s2",
      matchNo: 1,
      status: "confirmed",
      createdAt: "2025-01-01T00:00:00.000Z",
      confirmedAt: "2025-01-01T00:05:00.000Z",
    });
    expect(await unlockMatch(db, "s1", "mx")).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it("unlocking the only confirmed match empties rosters", async () => {
    await db.insert(sessions).values({
      id: "solo",
      name: "Solo",
      plannedMatches: 6,
      teamCount: 4,
      templateId: "dark-gold",
      scoringRules: RULES,
      status: "active",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    await db
      .insert(teams)
      .values({ id: "solo-t", sessionId: "solo", name: "Solo Team" });
    await db.insert(matches).values({
      id: "solo-m",
      sessionId: "solo",
      matchNo: 1,
      status: "confirmed",
      createdAt: "2025-01-01T00:00:00.000Z",
      confirmedAt: "2025-01-01T00:05:00.000Z",
    });
    await db.insert(matchResults).values({
      id: "solo-r",
      matchId: "solo-m",
      teamId: "solo-t",
      placement: 1,
      kills: 2,
      placementPoints: 10,
      players: [{ name: "Solo1", kills: 2 }],
    });
    await db
      .insert(rosters)
      .values({ teamId: "solo-t", playerNorm: "solo1", displayName: "Solo1" });

    expect(await unlockMatch(db, "solo", "solo-m")).toEqual({ ok: true });
    expect(await db.select().from(rosters)).toHaveLength(0);
    expect(
      await db
        .select()
        .from(matchResults)
        .where(eq(matchResults.matchId, "solo-m")),
    ).toHaveLength(0);
  });

  it("markComplete / reopen transitions, double-complete safe", async () => {
    await seedTwoConfirmed(db);

    expect(await markComplete(db, "s1")).toEqual({ ok: true });
    expect(
      (await db.select().from(sessions).where(eq(sessions.id, "s1")))[0]!.status,
    ).toBe("completed");

    // Idempotent-safe second complete.
    expect(await markComplete(db, "s1")).toEqual({ ok: true });
    expect(
      (await db.select().from(sessions).where(eq(sessions.id, "s1")))[0]!.status,
    ).toBe("completed");

    expect(await reopenSession(db, "s1")).toEqual({ ok: true });
    expect(
      (await db.select().from(sessions).where(eq(sessions.id, "s1")))[0]!.status,
    ).toBe("active");

    // Reopening an active session is also safe.
    expect(await reopenSession(db, "s1")).toEqual({ ok: true });

    expect(await markComplete(db, "missing")).toEqual({
      ok: false,
      message: expect.any(String),
    });
    expect(await reopenSession(db, "missing")).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it("nextMatchNumber follows the sequential rule", () => {
    expect(nextMatchNumber(0, 6)).toBe(1);
    expect(nextMatchNumber(2, 6)).toBe(3);
    expect(nextMatchNumber(6, 6)).toBeNull();
  });

  it("getSessionPageData projects winners and never leaks rawSquadData", async () => {
    await seedTwoConfirmed(db);
    const page = (await getSessionPageData(db, "s1"))!;
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
    expect(await getSessionPageData(db, "nope")).toBeNull();
  });

  it("standings from page results order by total then tie-breaks", async () => {
    await seedTwoConfirmed(db);
    const page = (await getSessionPageData(db, "s1"))!;
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

  it("unlock keeps other sessions untouched", async () => {
    const { matchIds } = await seedTwoConfirmed(db);
    await db.insert(sessions).values({
      id: "s2",
      name: "Other",
      plannedMatches: 6,
      teamCount: 4,
      templateId: "dark-gold",
      scoringRules: RULES,
      status: "active",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    await db
      .insert(teams)
      .values({ id: "s2-t", sessionId: "s2", name: "Other Team" });
    await db
      .insert(rosters)
      .values({ teamId: "s2-t", playerNorm: "o1", displayName: "O1" });

    expect(await unlockMatch(db, "s1", matchIds.m2)).toEqual({ ok: true });
    expect(
      await db
        .select()
        .from(rosters)
        .where(and(eq(rosters.teamId, "s2-t"), eq(rosters.playerNorm, "o1"))),
    ).toHaveLength(1);
  });

  it("sessionNudge truth table (C6.2)", () => {
    // all planned confirmed, still active, MVP unlocked → finalize
    expect(sessionNudge("active", 6, 6, false)).toEqual({ kind: "finalize" });
    // still short of plan → nothing
    expect(sessionNudge("active", 5, 6, false)).toEqual({ kind: "none" });
    // active complete but already locked → nothing
    expect(sessionNudge("active", 6, 6, true)).toEqual({ kind: "none" });
    expect(sessionNudge("active", 5, 6, true)).toEqual({ kind: "none" });
    // completed without a lock → mvp-pending (regardless of confirmed count)
    expect(sessionNudge("completed", 2, 6, false)).toEqual({
      kind: "mvp-pending",
    });
    expect(sessionNudge("completed", 6, 6, false)).toEqual({
      kind: "mvp-pending",
    });
    // completed AND locked → settled
    expect(sessionNudge("completed", 6, 6, true)).toEqual({ kind: "none" });
  });

  it("getSessionPageData reads mvp_lists: null → unlocked row → locked round-trip", async () => {
    await seedTwoConfirmed(db);
    // No row yet.
    expect((await getSessionPageData(db, "s1"))!.mvp).toEqual({
      locked: false,
      entries: null,
    });

    const entries = [
      { rank: 1, name: "B1", teamId: "t2", kills: 8 },
      { rank: 2, name: "A1", teamId: "t1", kills: 6 },
      { rank: 3, name: "C1", teamId: "t3", kills: 3 },
      { rank: 4, name: "A2", teamId: "t1", kills: 2 },
      { rank: 5, name: "B2", teamId: "t2", kills: 2 },
    ];
    await db
      .insert(mvpLists)
      .values({ sessionId: "s1", entries, locked: false });
    // Saved-but-unlocked: entries round-trip, locked false.
    expect((await getSessionPageData(db, "s1"))!.mvp).toEqual({
      locked: false,
      entries,
    });

    await db
      .update(mvpLists)
      .set({ locked: true, lockedAt: "2025-01-02T00:00:00.000Z" })
      .where(eq(mvpLists.sessionId, "s1"));
    const page = (await getSessionPageData(db, "s1"))!;
    expect(page.mvp.locked).toBe(true);
    expect(page.mvp.entries).toEqual(entries);
  });
});
