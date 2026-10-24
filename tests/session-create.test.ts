import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { SUPER_RULES } from "@/lib/scoring";
import { createSessionWithTeams } from "@/lib/sessions/create";
import { SAMPLE_TEAM_NAMES } from "@/lib/sessions/samples";

import { testDb } from "./helpers/pg";
import { ensureOrg } from "./helpers/orgs";

const { sessions, teams } = schema;

// Verified-owner uuid (WP6): every created session must carry user_id.
const OWNER = "11111111-1111-1111-1111-111111111111";

type PgDb = Awaited<ReturnType<typeof testDb>>["db"];

function validDraft() {
  return {
    name: "Wassup Open Scrims",
    plannedMatches: 4,
    teamCount: 16,
    templateId: "dark-gold",
    teams: SAMPLE_TEAM_NAMES.map((name, i) => ({
      // index 0 carries surrounding whitespace to prove trimming;
      // index 3 carries the one logo.
      name: i === 0 ? `  ${name}  ` : name,
      logoUrl: i === 3 ? "data:image/png;base64,iVBOR" : null,
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
    expect(session.templateId).toBe("dark-gold");
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
    expect(teamRows.filter((t) => t.logoUrl === null)).toHaveLength(15);
  });

  it("throws (fail-loud) on an invalid draft with duplicate names", async () => {
    const draft = validDraft();
    draft.teams[1] = { name: "straight forward", logoUrl: null };
    await expect(
      createSessionWithTeams(db, draft, OWNER, await ensureOrg(db, OWNER)),
    ).rejects.toThrow();
    expect(await db.select().from(sessions)).toHaveLength(0);
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
