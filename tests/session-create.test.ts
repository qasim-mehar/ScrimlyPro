import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { SUPER_RULES } from "@/lib/scoring";
import { createSessionWithTeams } from "@/lib/sessions/create";
import type { SessionDraft } from "@/lib/sessions/input";
import { SAMPLE_TEAM_NAMES } from "@/lib/sessions/samples";
import { assignDefaultTeamSlots } from "@/lib/sessions/slots";

import { testDb } from "./helpers/pg";
import { ensureOrg } from "./helpers/orgs";

const { sessions, teams } = schema;

// Verified-owner uuid (WP6): every created session must carry user_id.
const OWNER = "11111111-1111-1111-1111-111111111111";

type PgDb = Awaited<ReturnType<typeof testDb>>["db"];

function validDraft(): SessionDraft {
  return {
    name: "Wassup Open Scrims",
    orgId: "aaaaaaaa-0000-4000-8000-0000000000m1".replace("m1", "01"),
    plannedMatches: 4,
    teamCount: 16,
    templateId: "pmpl-light",
    teams: SAMPLE_TEAM_NAMES.map((name, i) => ({
      // index 0 carries surrounding whitespace to prove trimming;
      // index 3 carries the one logo.
      name: i === 0 ? `  ${name}  ` : name,
      logoUrl: i === 3 ? "data:image/png;base64,iVBOR" : null,
      // 1..16: assigned in-game room slots, unique within the session.
      slotNumber: i + 1,
    })),
  };
}

describe("createSessionWithTeams", () => {
  let cleanup: () => Promise<void>;
  let db: PgDb;

  beforeEach(async () => {
    ({ db, cleanup } = await testDb());
  });

  afterEach(async () => cleanup());

  it("happy path: 16-team draft inserts a session graph in one go", async () => {
    const sessionId = await createSessionWithTeams(
      db, validDraft(), OWNER, await ensureOrg(db, OWNER));

    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const session = (
      await db.select().from(sessions).where(eq(sessions.id, sessionId))
    )[0]!;
    expect(session.name).toBe("Wassup Open Scrims");
    expect(session.status).toBe("active");
    // The verified owner becomes the tenant owner (WP6).
    expect(session.userId).toBe(OWNER);
    expect(session.templateId).toBe("pmpl-light");
    expect(session.plannedMatches).toBe(4);
    expect(session.teamCount).toBe(16);
    expect(session.scoringRules).toEqual(SUPER_RULES);
    // Deep copy: NOT the same object reference as the module-level rules.
    expect(session.scoringRules).not.toBe(SUPER_RULES);
    session.scoringRules.placement_points["1"] = 99;
    expect(SUPER_RULES.placement_points["1"]).toBe(10);

    const teamRows = await db
      .select()
      .from(teams)
      .where(eq(teams.sessionId, sessionId));
    expect(teamRows).toHaveLength(16);
    expect(teamRows.find((t) => t.name === "Straight Forward")).toBeDefined();
    const withLogo = teamRows.find((t) => t.name === "4NM Esports");
    expect(withLogo?.logoUrl).toBe("data:image/png;base64,iVBOR");
    expect(withLogo?.slotNumber).toBe(4);
    expect(teamRows.filter((t) => t.logoUrl === null)).toHaveLength(15);
    // Every assigned slot persisted exactly once.
    expect(new Set(teamRows.map((t) => t.slotNumber))).toEqual(
      new Set(Array.from({ length: 16 }, (_, i) => i + 1)),
    );
  });

  it("persists the wizard's default 5, 6, 7 … slot sequence", async () => {
    const assigned = assignDefaultTeamSlots(SAMPLE_TEAM_NAMES);
    const draft = validDraft();
    draft.teams = assigned.map((row) => ({
      name: row.name,
      logoUrl: null,
      slotNumber: row.slotNumber,
    }));

    const sessionId = await createSessionWithTeams(
      db, draft, OWNER, await ensureOrg(db, OWNER));
    const teamRows = await db
      .select()
      .from(teams)
      .where(eq(teams.sessionId, sessionId));

    expect(teamRows).toHaveLength(16);
    expect(new Set(teamRows.map((t) => t.slotNumber))).toEqual(
      new Set(Array.from({ length: 16 }, (_, i) => 5 + i)),
    );
    expect(teamRows.find((t) => t.name === "Straight Forward")?.slotNumber).toBe(5);
    expect(teamRows.find((t) => t.name === "Nova Legends")?.slotNumber).toBe(20);
  });

  it("throws (fail-loud) on an invalid draft with duplicate names", async () => {
    const draft = validDraft();
    draft.teams[1] = { name: "straight forward", logoUrl: null, slotNumber: 2 };
    await expect(
      createSessionWithTeams(db, draft, OWNER, await ensureOrg(db, OWNER)),
    ).rejects.toThrow();
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("rejects duplicate slot numbers and rolls the transaction back", async () => {
    const draft = validDraft();
    draft.teams[1] = { ...draft.teams[1]!, slotNumber: draft.teams[0]!.slotNumber };
    await expect(
      createSessionWithTeams(db, draft, OWNER, await ensureOrg(db, OWNER)),
    ).rejects.toThrow(/Duplicate slot numbers/);
    expect(await db.select().from(sessions)).toHaveLength(0);
    expect(await db.select().from(teams)).toHaveLength(0);
  });

  it("persists NULL slot numbers for legacy/unassigned teams", async () => {
    const draft = validDraft();
    draft.teams = draft.teams.map((team) => ({ ...team, slotNumber: null }));
    const sessionId = await createSessionWithTeams(
      db, draft, OWNER, await ensureOrg(db, OWNER));

    const teamRows = await db
      .select()
      .from(teams)
      .where(eq(teams.sessionId, sessionId));
    expect(teamRows).toHaveLength(16);
    expect(teamRows.every((t) => t.slotNumber === null)).toBe(true);
  });

  it("DB partial unique index rejects duplicate non-NULL slots, allows NULLs and cross-session reuse", async () => {
    const orgId = await ensureOrg(db, OWNER);
    const sessionValues = {
      userId: OWNER,
      orgId,
      plannedMatches: 1,
      teamCount: 4,
      templateId: "pmpl-light",
      scoringRules: SUPER_RULES,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    await db.insert(sessions).values([
      { id: "slot-uq-s1", name: "Slot UQ 1", ...sessionValues },
      { id: "slot-uq-s2", name: "Slot UQ 2", ...sessionValues },
    ]);

    await expect(
      db.insert(teams).values([
        { id: "uq-a", sessionId: "slot-uq-s1", name: "Alpha", slotNumber: 7 },
        { id: "uq-b", sessionId: "slot-uq-s1", name: "Bravo", slotNumber: 7 },
      ]),
    ).rejects.toThrow();

    // NULL slots are exempt from the partial index.
    await db.insert(teams).values([
      { id: "uq-c", sessionId: "slot-uq-s1", name: "Charlie", slotNumber: null },
      { id: "uq-d", sessionId: "slot-uq-s1", name: "Delta", slotNumber: null },
    ]);
    expect(
      await db.select().from(teams).where(eq(teams.sessionId, "slot-uq-s1")),
    ).toHaveLength(2);

    // The same slot number is fine in a different session.
    await db.insert(teams).values({
      id: "uq-e",
      sessionId: "slot-uq-s2",
      name: "Echo",
      slotNumber: 7,
    });
    expect(
      await db.select().from(teams).where(eq(teams.sessionId, "slot-uq-s2")),
    ).toHaveLength(1);
  });

  it("two sequential creates: distinct ids, 32 team rows (same names across sessions)", async () => {
    const orgId = await ensureOrg(db, OWNER);
    const id1 = await createSessionWithTeams(db, validDraft(), OWNER, orgId);
    const id2 = await createSessionWithTeams(db, validDraft(), OWNER, orgId);

    expect(id1).not.toBe(id2);
    expect(await db.select().from(sessions)).toHaveLength(2);
    expect(await db.select().from(teams)).toHaveLength(32);
  });
});
