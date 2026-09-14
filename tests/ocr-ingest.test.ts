import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import type { RawSquad } from "@/lib/db/schema";
import { SAMPLE_MATCHES } from "@/lib/fixtures/sampleMatches";
import { ingestMatchOcr } from "@/lib/ocr/ingest";

const { matches, sessions } = schema;

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

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6 },
  default_placement_points: 0,
};

function player(name: string, kills: number) {
  return { name, kills };
}

function makeSquad(placement: number, kills: number[]): RawSquad {
  return {
    placement,
    squadTag: "",
    confidence: "high",
    players: kills.map((k, i) => player(`P${placement}-${i}`, k)),
  };
}

/** 16 valid squads: placements 1..16, lobby kills 38 (≤ 99). */
function makeValidSquads(): RawSquad[] {
  return [
    makeSquad(1, [3, 3, 3, 2]),
    makeSquad(2, [3, 3, 2]),
    makeSquad(3, [2, 2, 1]),
    makeSquad(4, [2, 2]),
    makeSquad(5, [2, 1]),
    makeSquad(6, [2]),
    makeSquad(7, [1, 1]),
    makeSquad(8, [1]),
    makeSquad(9, [1]),
    makeSquad(10, [1]),
    makeSquad(11, [0]),
    makeSquad(12, [0]),
    makeSquad(13, [0]),
    makeSquad(14, [0]),
    makeSquad(15, [0]),
    makeSquad(16, [0]),
  ];
}

const IMAGES = [{ mimeType: "image/jpeg" as const, dataBase64: "ZmFrZQ==" }];

function stubSampleMode() {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("SAMPLE_OCR", "1");
}

function stubNoKeyMode() {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("SAMPLE_OCR", "0");
}

function stubRealMode() {
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
  vi.stubEnv("SAMPLE_OCR", "0");
}

describe("ingestMatchOcr", () => {
  let sqlite: Database.Database;
  let db: BetterSQLite3Database<typeof schema>;

  beforeEach(() => {
    ({ sqlite, db } = testDb());
    db.insert(sessions)
      .values({
        id: "s1",
        name: "Sample Session",
        plannedMatches: 6,
        teamCount: 16,
        scoringRules: RULES,
        createdAt: "2025-01-01T00:00:00.000Z",
      })
      .run();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    sqlite.close();
  });

  describe("sample mode (no key, SAMPLE_OCR=1)", () => {
    it("matchNo 1 → 16 squads + draft row with rawSquadData", async () => {
      stubSampleMode();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.squads).toHaveLength(16);
      expect(result.squads).toEqual(SAMPLE_MATCHES[0]);
      expect(result.squads).not.toBe(SAMPLE_MATCHES[0]);
      expect(result.model).toBe("sample");
      expect(result.retried).toBe(false);
      expect(result.warnings).toEqual([]);

      const rows = db.select().from(matches).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe(result.matchId);
      expect(rows[0]?.status).toBe("draft");
      expect(rows[0]?.rawSquadData).toEqual(SAMPLE_MATCHES[0]);
    });

    it("matchNo 4 → SAMPLE_UNAVAILABLE (fixtures cover 1–3)", async () => {
      stubSampleMode();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 4, images: IMAGES },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("SAMPLE_UNAVAILABLE");
      expect(db.select().from(matches).all()).toHaveLength(0);
    });

    it("existing draft → rawSquadData replaced, same row", async () => {
      stubSampleMode();
      const first = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
      );
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      // Corrupt the stored snapshot, then re-ingest: the draft is replaced.
      db.update(matches)
        .set({ rawSquadData: [makeSquad(1, [0])] })
        .where(eq(matches.id, first.matchId))
        .run();

      const second = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
      );

      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.matchId).toBe(first.matchId);
      expect(db.select().from(matches).all()).toHaveLength(1);
      const row = db
        .select()
        .from(matches)
        .where(eq(matches.id, first.matchId))
        .all()[0];
      expect(row?.rawSquadData).toEqual(SAMPLE_MATCHES[0]);
    });
  });

  describe("guards (no model call)", () => {
    it("no key + SAMPLE_OCR=0 → GEMINI_NO_KEY", async () => {
      stubNoKeyMode();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("GEMINI_NO_KEY");
      expect(result.error.message).toMatch(/SAMPLE_OCR=1/);
    });

    it("missing session → SESSION_NOT_FOUND", async () => {
      stubSampleMode();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "ghost", matchNo: 1, images: IMAGES },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("SESSION_NOT_FOUND");
    });

    it("completed session → SESSION_COMPLETED", async () => {
      stubSampleMode();
      db.update(sessions)
        .set({ status: "completed" })
        .where(eq(sessions.id, "s1"))
        .run();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("SESSION_COMPLETED");
      expect(result.error.message).toMatch(/Reopen the session first/);
    });

    it.each([0, 7])("matchNo %i (outside 1..6) → MATCH_NO_INVALID", async (matchNo) => {
      stubSampleMode();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo, images: IMAGES },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("MATCH_NO_INVALID");
    });

    it("confirmed match → MATCH_CONFIRMED with matchId", async () => {
      stubSampleMode();
      db.insert(matches)
        .values({
          id: "m-locked",
          sessionId: "s1",
          matchNo: 1,
          status: "confirmed",
          rawSquadData: SAMPLE_MATCHES[0],
          createdAt: "2025-01-01T00:00:00.000Z",
          confirmedAt: "2025-01-01T00:05:00.000Z",
        })
        .run();

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("MATCH_CONFIRMED");
      expect(result.error.message).toMatch(/Unlock the match first/);
      expect(result.error.matchId).toBe("m-locked");
    });
  });

  describe("real mode (stub key + fake callModel)", () => {
    it("valid 16-squad JSON → ok + draft row persisted", async () => {
      stubRealMode();
      const squads = makeValidSquads();
      const callModel = vi.fn(async () => JSON.stringify(squads));

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 2, images: IMAGES },
        { callModel },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.squads).toEqual(squads);
      expect(callModel).toHaveBeenCalledTimes(1);
      const row = db
        .select()
        .from(matches)
        .where(eq(matches.id, result.matchId))
        .all()[0];
      expect(row?.status).toBe("draft");
      expect(row?.matchNo).toBe(2);
      expect(row?.rawSquadData).toEqual(squads);
    });

    it("fake failing V1 twice → VALIDATION_FAILED with failure attached", async () => {
      stubRealMode();
      const invalidText = JSON.stringify(makeValidSquads().slice(0, 15));
      const callModel = vi.fn(async () => invalidText);

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
        { callModel },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(result.error.failure).toEqual({
        code: "MISSING_SQUADS",
        extracted: 15,
        expected: 16,
      });
      expect(callModel).toHaveBeenCalledTimes(2);
      expect(db.select().from(matches).all()).toHaveLength(0);
    });

    it(">99-kill payload → warnings passthrough, retried false, EXACTLY one call (C2.4b no-retry guard)", async () => {
      stubRealMode();
      // Base total 38; squad 1 contributes 11 → 4 × 20 = 80 gives 107 total.
      const squads = makeValidSquads();
      squads[0]!.players = [
        player("a", 20),
        player("b", 20),
        player("c", 20),
        player("d", 20),
      ];
      const callModel = vi.fn(async () => JSON.stringify(squads));

      const result = await ingestMatchOcr(
        db,
        { sessionId: "s1", matchNo: 1, images: IMAGES },
        { callModel },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.retried).toBe(false);
      expect(callModel).toHaveBeenCalledTimes(1);
      expect(result.warnings).toEqual([
        { code: "LOBBY_KILLS_HIGH", total: 107 },
      ]);
    });
  });
});
