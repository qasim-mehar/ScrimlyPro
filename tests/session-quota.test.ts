import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import type { SessionDraft } from "@/lib/sessions/input";
import { createSessionAction } from "@/app/sessions/new/actions";

import { testDb } from "./helpers/pg";
import { ensureOrg } from "./helpers/orgs";

/**
 * Session-create quota enforcement (M2 §7), server-action level:
 * create sessions up to the org limit → limit+1 is rejected with the
 * friendly upgrade copy (the wizard renders it as the banner).
 */

const OWNER = "11111111-1111-1111-1111-111111111111";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: undefined as unknown as (() => Promise<void>) | undefined,
  currentUser: undefined as string | null | undefined,
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () =>
    state.currentUser
      ? { id: state.currentUser, email: `${state.currentUser}@test.dev` }
      : null,
  ),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => state.db,
}));

beforeEach(async () => {
  const t = await testDb();
  state.db = t.db;
  state.cleanup = t.cleanup;
  state.currentUser = OWNER;
  await ensureOrg(t.db, OWNER, "Quota Org");
});

afterAll(async () => {
  await state.cleanup?.();
});

function draft(orgId: string, name: string): SessionDraft {
  return {
    name,
    orgId,
    plannedMatches: 2,
    teamCount: 4,
    templateId: "dark-gold",
    teams: [
      { name: "Alpha", logoUrl: null, slotNumber: null },
      { name: "Bravo", logoUrl: null, slotNumber: null },
      { name: "Charlie", logoUrl: null, slotNumber: null },
      { name: "Delta", logoUrl: null, slotNumber: null },
    ],
  };
}

async function orgIdOf(): Promise<string> {
  const rows = await state.db!
    .select({ orgId: schema.orgMembers.orgId })
    .from(schema.orgMembers)
    .where(eq(schema.orgMembers.userId, OWNER))
    .limit(1);
  return rows[0]!.orgId;
}

describe("createSessionAction — max_sessions quota", () => {
  it("creates under the limit; at limit+1 returns the upgrade copy and writes nothing", async () => {
    const orgId = await orgIdOf();

    await db_update_quota(2);
    const r1 = await createSessionAction(draft(orgId, "Scrim One"));
    expect(r1).toEqual({ ok: true, sessionId: expect.any(String) });
    const r2 = await createSessionAction(draft(orgId, "Scrim Two"));
    expect(r2).toEqual({ ok: true, sessionId: expect.any(String) });

    const blocked = await createSessionAction(draft(orgId, "Scrim Three"));
    expect(blocked).toEqual({ ok: false, message: expect.stringMatching(/Contact support/) });
    expect(await state.db!.select().from(schema.sessions)).toHaveLength(2);
  });

  it("a foreign orgId is rejected with zero existence leakage", async () => {
    await db_update_quota(100);
    const foreign = "aaaaaaaa-0000-4000-8000-0000000000ff";
    const res = await createSessionAction(draft(foreign, "Evil"));
    expect(res).toEqual({
      ok: false,
      issues: [{ field: "orgId", message: "Pick one of your organizations." }],
    });
    expect(await state.db!.select().from(schema.sessions)).toHaveLength(0);
  });
});

async function db_update_quota(n: number) {
  await state.db!.execute(
    sql`update org_quotas set max_sessions = ${n}`,
  );
}
