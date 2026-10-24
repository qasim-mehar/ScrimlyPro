import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { SAMPLE_MATCHES } from "@/lib/fixtures/sampleMatches";
import { confirmMatch } from "@/lib/matches/confirm";
import type { SquadRowDraft } from "@/lib/matches/mapping";
import { normalizeName } from "@/lib/matching";
import { pointsForMatch, SUPER_RULES } from "@/lib/scoring";

const { matchResults, matches, rosters, sessions, teams } = schema;

// In-memory DB pattern copied from tests/db.test.ts.
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

/** 16 teams t1..t16 (+ names), one active session, one draft match m1. */
function seedSixteen(
  db: BetterSQLite3Database<typeof schema>,
): { teamIds: string[] } {
  db.insert(sessions)
    .values({
      id: "s1",
      name: "Confirm Session",
      plannedMatches: 6,
      teamCount: 16,
      scoringRules: SUPER_RULES,
      createdAt: "2025-01-01T00:00:00.000Z",
    })
    .run();
  const teamIds: string[] = [];
  for (let i = 1; i <= 16; i++) {
    const id = `t${i}`;
    teamIds.push(id);
    db.insert(teams).values({ id, sessionId: "s1", name: `Team ${i}` }).run();
  }
  db.insert(matches)
    .values({
      id: "m1",
      sessionId: "s1",
      matchNo: 1,
      status: "draft",
      rawSquadData: SAMPLE_MATCHES[0],
      createdAt: "2025-01-01T00:00:00.000Z",
    })
    .run();
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
  let sqlite: Database.Database;
  let db: BetterSQLite3Database<typeof schema>;

  beforeEach(() => {
    ({ sqlite, db } = testDb());
  });

  afterEach(() => sqlite.close());

  it("happy path → 16 result rows, kills = player sums, PP via pointsForMatch, confirmed + confirmedAt", () => {
    const { teamIds } = seedSixteen(db);
    // Squad 1 gets a 23-kill total: SUPER placement 1 → pp 10.
    const rows = mappedRows(teamIds);
    rows[0]!.players = [
      { name: "A", kills: 10 },
      { name: "B", kills: 8 },
      { name: "C", kills: 5 },
    ];

    const result = confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result).toEqual({ ok: true });

    const results = db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, "m1"))
      .all();
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

    const match = db
      .select()
      .from(matches)
      .where(eq(matches.id, "m1"))
      .get();
    expect(match?.status).toBe("confirmed");
    expect(typeof match?.confirmedAt).toBe("string");
  });

  it("rosters learned: team's names present, normalized", () => {
    const { teamIds } = seedSixteen(db);

    expect(
      confirmMatch(db, { sessionId: "s1", matchId: "m1", rows: mappedRows(teamIds) }),
    ).toEqual({ ok: true });

    const learned = db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, "t1"))
      .all();
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

  it("re-confirm replaces: stale draft rows → single set, updated values (idempotent)", () => {
    const { teamIds } = seedSixteen(db);
    const rows = mappedRows(teamIds);

    expect(confirmMatch(db, { sessionId: "s1", matchId: "m1", rows })).toEqual({
      ok: true,
    });
    // A draft carrying stale rows (e.g. retried submit) is replaced, not doubled.
    db.update(matches).set({ status: "draft", confirmedAt: null }).where(eq(matches.id, "m1")).run();
    rows[0]!.players[0]!.kills = 9;
    expect(confirmMatch(db, { sessionId: "s1", matchId: "m1", rows })).toEqual({
      ok: true,
    });

    const results = db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, "m1"))
      .all();
    expect(results).toHaveLength(16);
    const first = results.find((r) => r.placement === 1);
    const sum = rows[0]!.players.reduce((s, p) => s + p.kills, 0);
    expect(first?.kills).toBe(sum);
    expect(first?.players[0]?.kills).toBe(9);

    const match = db
      .select()
      .from(matches)
      .where(eq(matches.id, "m1"))
      .get();
    expect(match?.status).toBe("confirmed");
  });

  it("confirmed match → {ok:false}, DB untouched", () => {
    const { teamIds } = seedSixteen(db);
    db.update(matches)
      .set({ status: "confirmed", confirmedAt: "2025-01-01T00:05:00.000Z" })
      .where(eq(matches.id, "m1"))
      .run();

    const result = confirmMatch(db, {
      sessionId: "s1",
      matchId: "m1",
      rows: mappedRows(teamIds),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/Unlock the match first/);
    expect(
      db.select().from(matchResults).where(eq(matchResults.matchId, "m1")).all(),
    ).toHaveLength(0);
  });

  it("unmapped rows → {ok:false}, no write", () => {
    const { teamIds } = seedSixteen(db);
    const rows = mappedRows(teamIds);
    rows[4]!.teamId = null;

    const result = confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result.ok).toBe(false);
    expect(
      db.select().from(matchResults).where(eq(matchResults.matchId, "m1")).all(),
    ).toHaveLength(0);
    expect(db.select().from(rosters).all()).toHaveLength(0);
    expect(
      db.select().from(matches).where(eq(matches.id, "m1")).get()?.status,
    ).toBe("draft");
  });

  it("duplicate teams → {ok:false}, no write", () => {
    const { teamIds } = seedSixteen(db);
    const rows = mappedRows(teamIds);
    rows[1]!.teamId = teamIds[0]!;

    const result = confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Team 1");
    expect(
      db.select().from(matchResults).where(eq(matchResults.matchId, "m1")).all(),
    ).toHaveLength(0);
  });

  it("wrong session → {ok:false}", () => {
    const { teamIds } = seedSixteen(db);

    const result = confirmMatch(db, {
      sessionId: "other",
      matchId: "m1",
      rows: mappedRows(teamIds),
    });

    expect(result.ok).toBe(false);
  });

  it("15-mapped confirm (one team has no row) → rejected, no write (C7.1)", () => {
    const { teamIds } = seedSixteen(db);
    // 15 squads, each mapped to a distinct team — still not confirmable.
    const rows = mappedRows(teamIds).slice(0, 15);

    const result = confirmMatch(db, { sessionId: "s1", matchId: "m1", rows });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/15 of 16/);
    expect(
      db.select().from(matchResults).where(eq(matchResults.matchId, "m1")).all(),
    ).toHaveLength(0);
    expect(db.select().from(rosters).all()).toHaveLength(0);
    expect(
      db.select().from(matches).where(eq(matches.id, "m1")).get()?.status,
    ).toBe("draft");
  });
});
