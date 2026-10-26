import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import { GET } from "@/app/api/dashboard/search/route";

import { testDb } from "../helpers/pg";
import { ensureOrg } from "../helpers/orgs";

/**
 * M5 WP10 — guard + isolation suite for GET /api/dashboard/search. The auth
 * layer is mocked at its only seam (getAuthedUser; getEffectiveUser fails
 * closed to the real user when the impersonation ledger is unreachable);
 * the DB is a throwaway Postgres wired in via the getDb seam.
 */

const OWNER = "11111111-1111-4111-8111-111111111111";
const ATTACKER = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: (undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["cleanup"]
    | undefined),
  orgA: "",
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => state.db,
}));

import { getAuthedUser } from "@/lib/supabase/server";

const mockedGetAuthedUser = vi.mocked(getAuthedUser);

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10 },
  default_placement_points: 0,
};

beforeEach(async () => {
  const { db, cleanup } = await testDb();
  state.db = db;
  state.cleanup = cleanup;
  state.orgA = await ensureOrg(db, OWNER, "Search Org");
  await db.insert(schema.sessions).values({
    id: "search-sess-1",
    userId: OWNER,
    orgId: state.orgA,
    name: "Weekly Scrim",
    plannedMatches: 3,
    teamCount: 8,
    scoringRules: RULES,
  });
  await db.insert(schema.matches).values({
    id: "search-match-1",
    sessionId: "search-sess-1",
    matchNo: 1,
    status: "confirmed",
  });
  await ensureOrg(db, ATTACKER, "Attacker Org");
  mockedGetAuthedUser.mockReset();
});

afterEach(async () => {
  await state.cleanup?.();
  state.db = undefined;
});

function req(q: string, org?: string): Request {
  const params = new URLSearchParams({ q });
  if (org) params.set("org", org);
  return new Request(
    `http://localhost/api/dashboard/search?${params.toString()}`,
  );
}

describe("GET /api/dashboard/search", () => {
  it("finds sessions and matches for a member of the org", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: "o@t.dev" });
    const res = await GET(req("weekly"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body.sessions.map((s: { name: string }) => s.name)).toEqual([
      "Weekly Scrim",
    ]);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].matchNo).toBe(1);
  });

  it("foreign org param renders the identical 404 (404 law)", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: ATTACKER, email: "a@t.dev" });
    const res = await GET(req("weekly", state.orgA));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("unauthenticated → 401, no body detail", async () => {
    mockedGetAuthedUser.mockResolvedValue(null);
    const res = await GET(req("weekly"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("empty query returns empty groups (no error)", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: OWNER, email: "o@t.dev" });
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sessions: [], matches: [] });
  });
});
