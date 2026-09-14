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
import { aggregatePlayers, draftMvpTop5 } from "@/lib/mvp";
import { validateMvpEntries, type MvpValidationEntry } from "@/lib/mvp/lock";
import { lockMvpList, unlockMvp } from "@/lib/mvp/lifecycle";

const { matchResults, matches, mvpLists, sessions, teams } = schema;

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6 },
  default_placement_points: 0,
};

const TEAMS = [{ id: "t1" }, { id: "t2" }];

function entry(
  name: string,
  teamId = "t1",
  kills = 5,
): MvpValidationEntry {
  return { name, teamId, kills };
}

function fiveValid(): MvpValidationEntry[] {
  return [
    entry("BULL", "t1", 7),
    entry("JAZZ", "t1", 7),
    entry("SHADOW", "t1", 7),
    entry("TF BLAZE", "t2", 7),
    entry("TF NOVA", "t2", 7),
  ];
}

describe("validateMvpEntries", () => {
  it("accepts 5 valid entries", () => {
    expect(validateMvpEntries(fiveValid(), TEAMS)).toEqual([]);
  });

  it("rejects 4 entries with one clear message", () => {
    const issues = validateMvpEntries(fiveValid().slice(0, 4), TEAMS);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/exactly 5/i);
  });

  it("rejects 6 entries with one clear message", () => {
    const issues = validateMvpEntries([...fiveValid(), entry("EXTRA")], TEAMS);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/exactly 5/i);
  });

  it("rejects empty and 61-char names, accepts 1–60", () => {
    const base = fiveValid();
    expect(
      validateMvpEntries([{ ...base[0]!, name: "   " }, ...base.slice(1)], TEAMS).length,
    ).toBeGreaterThan(0);
    expect(
      validateMvpEntries([{ ...base[0]!, name: "x".repeat(61) }, ...base.slice(1)], TEAMS).length,
    ).toBeGreaterThan(0);
    expect(
      validateMvpEntries(
        [{ ...base[0]!, name: "x".repeat(60) }, ...base.slice(1)],
        TEAMS,
      ),
    ).toEqual([]);
  });

  it("rejects kills -1, 201, and non-integers; accepts 0 and 200", () => {
    const base = fiveValid();
    for (const kills of [-1, 201, 2.5]) {
      expect(
        validateMvpEntries([{ ...base[0]!, kills }, ...base.slice(1)], TEAMS).length,
      ).toBeGreaterThan(0);
    }
    expect(
      validateMvpEntries([{ ...base[0]!, kills: 0 }, ...base.slice(1)], TEAMS),
    ).toEqual([]);
    expect(
      validateMvpEntries([{ ...base[0]!, kills: 200 }, ...base.slice(1)], TEAMS),
    ).toEqual([]);
  });

  it("rejects unknown teamId", () => {
    const base = fiveValid();
    const issues = validateMvpEntries(
      [{ ...base[0]!, teamId: "ghost" }, ...base.slice(1)],
      TEAMS,
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(" ")).toMatch(/team/i);
  });

  it("rejects duplicate name+team (after trimming)", () => {
    const base = fiveValid();
    const issues = validateMvpEntries(
      [{ ...base[0]! }, { ...base[1]!, name: "  BULL " }, ...base.slice(2)],
      TEAMS,
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(" ")).toMatch(/duplicate/i);
  });

  it("allows the same team with different names (multiple fraggers are normal)", () => {
    expect(validateMvpEntries(fiveValid(), TEAMS)).toEqual([]);
  });

  it("allows the same name on different teams", () => {
    const entries = [
      entry("HANAN", "t1", 5),
      entry("HANAN", "t2", 4),
      entry("A", "t1", 3),
      entry("B", "t1", 2),
      entry("C", "t2", 1),
    ];
    expect(validateMvpEntries(entries, TEAMS)).toEqual([]);
  });
});

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

describe("mvp lifecycle", () => {
  let sqlite: Database.Database;
  let db: BetterSQLite3Database<typeof schema>;

  beforeEach(() => {
    ({ sqlite, db } = testDb());
    db.insert(sessions)
      .values({
        id: "s1",
        name: "S",
        plannedMatches: 6,
        teamCount: 16,
        scoringRules: RULES,
        createdAt: "2025-01-01T00:00:00.000Z",
      })
      .run();
    db.insert(teams).values({ id: "t1", sessionId: "s1", name: "Alpha" }).run();
    db.insert(teams).values({ id: "t2", sessionId: "s1", name: "Beta" }).run();
  });

  afterEach(() => sqlite.close());

  it("lockMvpList writes rank 1..5, trimmed names, locked + lockedAt", () => {
    const padded = fiveValid().map((row, index) =>
      index === 0 ? { ...row, name: "  BULL  " } : row,
    );
    const result = lockMvpList(db, "s1", padded);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected lock to succeed");

    const saved = db.select().from(mvpLists).where(eq(mvpLists.sessionId, "s1")).get()!;
    expect(saved.locked).toBe(true);
    expect(typeof saved.lockedAt).toBe("string");
    expect(saved.entries).toEqual([
      { rank: 1, name: "BULL", teamId: "t1", kills: 7 },
      { rank: 2, name: "JAZZ", teamId: "t1", kills: 7 },
      { rank: 3, name: "SHADOW", teamId: "t1", kills: 7 },
      { rank: 4, name: "TF BLAZE", teamId: "t2", kills: 7 },
      { rank: 5, name: "TF NOVA", teamId: "t2", kills: 7 },
    ]);
  });

  it("re-lock replaces the previous locked list", () => {
    expect(lockMvpList(db, "s1", fiveValid()).ok).toBe(true);
    const other: MvpValidationEntry[] = [
      entry("ONE", "t2", 9),
      entry("TWO", "t2", 8),
      entry("THREE", "t1", 7),
      entry("FOUR", "t1", 6),
      entry("FIVE", "t1", 5),
    ];
    const result = lockMvpList(db, "s1", other);
    expect(result.ok).toBe(true);

    const rows = db.select().from(mvpLists).where(eq(mvpLists.sessionId, "s1")).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entries.map((row) => row.name)).toEqual([
      "ONE",
      "TWO",
      "THREE",
      "FOUR",
      "FIVE",
    ]);
    expect(rows[0]!.locked).toBe(true);
  });

  it("invalid input writes nothing", () => {
    const result = lockMvpList(db, "s1", fiveValid().slice(0, 4));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected lock to fail");
    expect(result.issues).toHaveLength(1);
    expect(db.select().from(mvpLists).all()).toHaveLength(0);
  });

  it("unlockMvp flips locked off and retains entries", () => {
    expect(lockMvpList(db, "s1", fiveValid()).ok).toBe(true);
    const before = db.select().from(mvpLists).where(eq(mvpLists.sessionId, "s1")).get()!;
    unlockMvp(db, "s1");
    const after = db.select().from(mvpLists).where(eq(mvpLists.sessionId, "s1")).get()!;
    expect(after.locked).toBe(false);
    expect(after.entries).toEqual(before.entries);
  });

  it("integration: aggregate confirmed matches → draft top-5 → lock holds the 5", () => {
    const squads: Record<string, Array<{ name: string; kills: number }>> = {
      m1: [
        { name: "BULL", kills: 4 },
        { name: "JAZZ", kills: 3 },
        { name: "SHADOW", kills: 4 },
        { name: "KALEEM", kills: 1 },
      ],
      m2: [
        { name: "BULL", kills: 3 },
        { name: "JAZZ", kills: 4 },
        { name: "SHADOW", kills: 3 },
        { name: "FAHEEM", kills: 2 },
      ],
    };
    let placement = 1;
    for (const [matchId, players] of Object.entries(squads)) {
      const matchNo = matchId === "m1" ? 1 : 2;
      db.insert(matches)
        .values({
          id: matchId,
          sessionId: "s1",
          matchNo,
          status: "confirmed",
          createdAt: "2025-01-01T00:00:00.000Z",
          confirmedAt: "2025-01-01T00:05:00.000Z",
        })
        .run();
      const teamId = matchNo === 1 ? "t1" : "t2";
      db.insert(matchResults)
        .values({
          id: `r-${matchId}`,
          matchId,
          teamId,
          placement,
          kills: players.reduce((sum, player) => sum + player.kills, 0),
          placementPoints: 10,
          players,
        })
        .run();
      placement += 1;
    }

    const sourceRows = db
      .select({
        teamId: matchResults.teamId,
        matchNo: matches.matchNo,
        players: matchResults.players,
      })
      .from(matchResults)
      .innerJoin(matches, eq(matchResults.matchId, matches.id))
      .where(eq(matches.sessionId, "s1"))
      .all();
    const draft = draftMvpTop5(aggregatePlayers(sourceRows));
    expect(draft).toHaveLength(5);

    const result = lockMvpList(
      db,
      "s1",
      draft.map((player) => ({
        name: player.displayName,
        teamId: player.teamId,
        kills: player.kills,
      })),
    );
    expect(result.ok).toBe(true);
    const saved = db.select().from(mvpLists).where(eq(mvpLists.sessionId, "s1")).get()!;
    expect(saved.entries).toHaveLength(5);
    expect(saved.entries.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
