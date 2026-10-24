import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";

import { testDb } from "../helpers/pg";
import { ensureOrg } from "../helpers/orgs";

/**
 * WP6 guard suite for server actions: assertSessionOwner proves ownership
 * for the owner and renders the 404 page (notFound throws) for missing and
 * foreign sessions — indistinguishable. requireUser redirects to /login.
 *
 * getAuthedUser is mocked at its only seam; next/navigation's redirect/
 * notFound are mocked to throw marker errors (their real runtime behavior
 * is Next's job — here we assert the guard CALLS them, identically for
 * missing and foreign).
 */

const OWNER = "11111111-1111-1111-1111-111111111111";
const ATTACKER = "22222222-2222-2222-2222-222222222222";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: (undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["cleanup"]
    | undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => state.db,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));

import { assertSessionOwner, requireUser } from "@/lib/auth/action-guard";
import { getAuthedUser } from "@/lib/supabase/server";

const mockedGetAuthedUser = vi.mocked(getAuthedUser);

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10 },
  default_placement_points: 0,
};

const SESSION_ID = "guard-session-1";

async function seedSession(owner: string) {
  await state.db!.insert(schema.sessions).values({
    id: SESSION_ID,
    userId: owner,
    orgId: await ensureOrg(state.db!, owner),
    name: "Guard Fixture",
    plannedMatches: 2,
    teamCount: 4,
    scoringRules: RULES,
    createdAt: new Date().toISOString(),
  });
}

beforeEach(async () => {
  const { db, cleanup: c } = await testDb();
  state.cleanup = c;
  state.db = db;
  mockedGetAuthedUser.mockReset();
});


afterEach(async () => {
  await state.cleanup?.();
  state.cleanup = undefined;
  state.db = undefined;
});

describe("assertSessionOwner", () => {
  it("returns the verified user + sessionId for the owner", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    await seedSession(OWNER);

    const ctx = await assertSessionOwner(SESSION_ID, state.db);
    expect(ctx.sessionId).toBe(SESSION_ID);
    expect(ctx.user.id).toBe(OWNER);
  });

  it("calls notFound() for a FOREIGN session (existence never revealed)", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: ATTACKER, email: null });
    await seedSession(OWNER);

    await expect(assertSessionOwner(SESSION_ID, state.db)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("calls notFound() for a MISSING session — identical to foreign", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });

    await expect(assertSessionOwner("nope", state.db)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("unauthenticated caller is redirected to /login before any DB access", async () => {
    mockedGetAuthedUser.mockResolvedValue(null);

    await expect(assertSessionOwner(SESSION_ID, state.db)).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    // No DB touch even happened for the lookup.
    expect(await state.db!.select().from(schema.sessions)).toHaveLength(0);
  });
});

describe("requireUser", () => {
  it("returns the verified user", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: null });
    const user = await requireUser();
    expect(user.id).toBe(OWNER);
  });

  it("redirects to /login when unauthenticated", async () => {
    mockedGetAuthedUser.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
