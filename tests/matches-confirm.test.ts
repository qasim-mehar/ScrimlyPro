import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { SAMPLE_MATCHES } from "@/lib/fixtures/sampleMatches";
import { confirmMatch } from "@/lib/matches/confirm";
import type { SquadRowDraft } from "@/lib/matches/mapping";
import { normalizeName } from "@/lib/matching";
import { pointsForMatch, SUPER_RULES } from "@/lib/scoring";

import { testDb } from "./helpers/pg";
import { ensureOrg } from "./helpers/orgs";

const { matchResults, matches, rosters, sessions, teams } = schema;

type PgDb = Awaited<ReturnType<typeof testDb>>["db"];

/** 16 teams t1..t16 (+ names), one active session, one draft match m1. */
async function seedSixteen(db: PgDb): Promise<{ teamIds: string[] }> {
  await db.insert(sessions).values({
    id: "s1",
    userId: "99999999-9999-9999-9999-999999999991",
    orgId: await ensureOrg(db, "99999999-9999-9999-9999-999999999991"),
    name: "Confirm Session",
    plannedMatches: 6,
    teamCount: 16,
    scoringRules: SUPER_RULES,
    createdAt: "2025-01-01T00:00:00.000Z",
  });
  const teamIds: string[] = [];
  for (let i = 1; i <= 16; i++) {
    const id = `t${i}`;
    teamIds.push(id);
    await db.insert(teams).values({ id, sessionId: "s1", name: `Team ${i}` });
  }
  await db.insert(matches).values({
    id: "m1",
    sessionId: "s1",
    matchNo: 1,
    status: "draft",
    rawSquadData: SAMPLE_MATCHES[0],
    createdAt: "2025-01-01T00:00:00.000Z",
  });
  return { teamIds };
}

/** Fixture squads mapped placement i → teamIds[i], kills intact. */
function mappedRows(teamIds: string[]): SquadRowDraft[] {
  return SAMPLE_MATCHES[0]!.map((squad, i) => ({
    placement: squad.placement,
    squadTag: squad.squadTag,
    teamId: teamIds[i]!,
    players: squad.players.map((p) => ({ name: p.name, kills: p.kills })),
  }));
}

describe("confirmMatch", () => {
  let cleanup: () => Promise<void>;
  let db: PgDb;

  beforeEach(async () => {
    ({ db, cleanup } = await testDb());
  });

  afterEach(async () => cleanup());

  it("happy path → 16 result rows, kills = player sums, PP via pointsForMatch, confirmed + confirmedAt", async () => {
    const { teamIds } = await seedSixteen(db);
    // Squad 1 gets a 23-kill total: SUPER placement 1 → pp 10.
    const rows = mappedRows(teamIds);
    rows[0]!.players = [
      { name: "A", kills: 10 },
      { name: "B", kills: 8 },
      { name: "C", kills: 5 },
    ];

    const result = await confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result).toEqual({ ok: true });

    const results = await db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, "m1"));
    expect(results).toHaveLength(16);

    const winner = results.find((r) => r.placement === 1);
    expect(winner?.teamId).toBe("t1");
    expect(winner?.kills).toBe(23);
    const expected = pointsForMatch(1, 23, SUPER_RULES);
    expect(expected.placementPoints).toBe(10);
    expect(winner?.placementPoints).toBe(10);
    expect(winner?.players).toEqual([
      { name: "A", kills: 10 },
      { name: "B", kills: 8 },
      { name: "C", kills: 5 },
    ]);

    // Every row: kills = its players' sum, pp = pointsForMatch.
    for (const r of results) {
      const sum = r.players.reduce((s, p) => s + p.kills, 0);
      expect(r.kills).toBe(sum);
      expect(r.placementPoints).toBe(
        pointsForMatch(r.placement, r.kills, SUPER_RULES).placementPoints,
      );
    }

    const match = await db.select().from(matches).where(eq(matches.id, "m1"));
    expect(match[0]?.status).toBe("confirmed");
    expect(typeof match[0]?.confirmedAt).toBe("string");
  });

  it("rosters learned: team's names present, normalized", async () => {
    const { teamIds } = await seedSixteen(db);

    expect(
      await confirmMatch(db, { sessionId: "s1", matchId: "m1", rows: mappedRows(teamIds) }),
    ).toEqual({ ok: true });

    const learned = await db.select().from(rosters).where(eq(rosters.teamId, "t1"));
    // TRB Gaming's 4 fixture names (incl. the drifted TF×MAₛOOR spelling).
    expect(learned).toHaveLength(4);
    for (const name of ["TRB HANAN", "TRB ARYAN", "TRB ZORAWAR", "TF×MAₛOOR"]) {
      expect(
        learned.some(
          (r) =>
            r.playerNorm === normalizeName(name) && r.displayName === name,
        ),
      ).toBe(true);
    }
  });

  it("re-confirm replaces: stale draft rows → single set, updated values (idempotent)", async () => {
    const { teamIds } = await seedSixteen(db);
    const rows = mappedRows(teamIds);

    expect(await confirmMatch(db, { sessionId: "s1", matchId: "m1", rows })).toEqual({
      ok: true,
    });
    // A draft carrying stale rows (e.g. retried submit) is replaced, not doubled.
    await db.update(matches).set({ status: "draft", confirmedAt: null }).where(eq(matches.id, "m1"));
    rows[0]!.players[0]!.kills = 9;
    expect(await confirmMatch(db, { sessionId: "s1", matchId: "m1", rows })).toEqual({
      ok: true,
    });

    const results = await db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, "m1"));
    expect(results).toHaveLength(16);
    const first = results.find((r) => r.placement === 1);
    const sum = rows[0]!.players.reduce((s, p) => s + p.kills, 0);
    expect(first?.kills).toBe(sum);
    expect(first?.players[0]?.kills).toBe(9);

    const match = await db.select().from(matches).where(eq(matches.id, "m1"));
    expect(match[0]?.status).toBe("confirmed");
  });

  it("confirmed match → {ok:false}, DB untouched", async () => {
    const { teamIds } = await seedSixteen(db);
    await db
      .update(matches)
      .set({ status: "confirmed", confirmedAt: "2025-01-01T00:05:00.000Z" })
      .where(eq(matches.id, "m1"));

    const result = await confirmMatch(db, {
      sessionId: "s1",
      matchId: "m1",
      rows: mappedRows(teamIds),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/Unlock the match first/);
    expect(
      await db.select().from(matchResults).where(eq(matchResults.matchId, "m1")),
    ).toHaveLength(0);
  });

  it("unmapped rows → {ok:false}, no write", async () => {
    const { teamIds } = await seedSixteen(db);
    const rows = mappedRows(teamIds);
    rows[4]!.teamId = null;

    const result = await confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result.ok).toBe(false);
    expect(
      await db.select().from(matchResults).where(eq(matchResults.matchId, "m1")),
    ).toHaveLength(0);
    expect(await db.select().from(rosters)).toHaveLength(0);
    expect(
      (await db.select().from(matches).where(eq(matches.id, "m1")))[0]?.status,
    ).toBe("draft");
  });

  it("duplicate teams → {ok:false}, no write", async () => {
    const { teamIds } = await seedSixteen(db);
    const rows = mappedRows(teamIds);
    rows[1]!.teamId = teamIds[0]!;

    const result = await confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Team 1");
    expect(
      await db.select().from(matchResults).where(eq(matchResults.matchId, "m1")),
    ).toHaveLength(0);
  });

  it("wrong session → {ok:false}", async () => {
    const { teamIds } = await seedSixteen(db);

    const result = await confirmMatch(db, {
      sessionId: "other",
      matchId: "m1",
      rows: mappedRows(teamIds),
    });

    expect(result.ok).toBe(false);
  });

  it("15-mapped confirm (one team has no row) → rejected, no write (C7.1)", async () => {
    const { teamIds } = await seedSixteen(db);
    // 15 squads, each mapped to a distinct team — still not confirmable.
    const rows = mappedRows(teamIds).slice(0, 15);

    const result = await confirmMatch(db, {
      sessionId: "s1",
      matchId: "m1",
      rows,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/15 of 16/);
    expect(
      await db
        .select()
        .from(matchResults)
        .where(eq(matchResults.matchId, "m1")),
    ).toHaveLength(0);
    expect(await db.select().from(rosters)).toHaveLength(0);
    expect(
      (await db.select().from(matches).where(eq(matches.id, "m1")))[0]?.status,
    ).toBe("draft");
  });
});
