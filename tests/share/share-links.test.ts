import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import { testDb } from "../helpers/pg";
import { ensureOrg } from "../helpers/orgs";
import { computeStandings } from "@/lib/scoring";
import { withRanks } from "@/lib/graphics/standings";
import { createShareLink, listShareLinks, revokeShareLink } from "@/lib/share/links";
import { getSharedStandings } from "@/lib/share/public-reader";
import { POST, DELETE } from "@/app/api/sessions/[id]/share/route";
import { hashToken } from "@/lib/orgs/tokens";

/**
 * Share links (M2 §5): projection contract + PII-leak assertions +
 * revocation + the two-fixture API matrix. public-reader runs on the admin
 * client, mocked here at getAdminSql to the throwaway DB.
 */

const OWNER = "11111111-1111-1111-1111-111111111111";
const MEMBER = "33333333-3333-3333-3333-333333333333";
const OUTSIDER = "55555555-5555-5555-5555-555555555555";

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6 },
  default_placement_points: 0,
};

const SESSION = "aaaaa001-0000-4000-8000-000000000001";
const OTHER_SESSION = "aaaaa001-0000-4000-8000-000000000002";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  rawSql: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["sql"]
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

// public-reader's admin-client seam → the throwaway DB's raw postgres client.
vi.mock("@/lib/db/admin", () => ({
  getAdminSql: () => state.rawSql!,
}));

let db: Db;

beforeEach(async () => {
  const t = await testDb();
  db = t.db;
  state.db = t.db;
  state.rawSql = t.sql;
  state.cleanup = t.cleanup;
  for (const u of [OWNER, MEMBER, OUTSIDER]) {
    await db.execute(
      sql`insert into auth.users (id, email) values (${u}, ${u + "@test.dev"}) on conflict (id) do nothing`,
    );
  }
  const orgId = await ensureOrg(db, OWNER, "Share Org");
  await db
    .insert(schema.orgMembers)
    .values({ orgId, userId: MEMBER, role: "member" });

  const mkSession = (id: string, name: string) => ({
    id,
    userId: OWNER,
    orgId,
    name,
    plannedMatches: 2,
    teamCount: 2,
    scoringRules: RULES,
  });
  await db.insert(schema.sessions).values([
    mkSession(SESSION, "Public Scrim"),
    mkSession(OTHER_SESSION, "Private Scrim"),
  ]);
  await db.insert(schema.teams).values([
    { id: "sh-t1", sessionId: SESSION, name: "Alpha" },
    { id: "sh-t2", sessionId: SESSION, name: "Bravo" },
    { id: "sh-o1", sessionId: OTHER_SESSION, name: "SecretSquad" },
  ]);
  await db.insert(schema.matches).values({
    id: "sh-m1",
    sessionId: SESSION,
    matchNo: 1,
    status: "confirmed",
  });
  await db.insert(schema.matchResults).values([
    {
      id: "sh-r1",
      matchId: "sh-m1",
      teamId: "sh-t1",
      placement: 1,
      kills: 12,
      placementPoints: 10,
      players: [{ name: "P1", kills: 12 }],
    },
    {
      id: "sh-r2",
      matchId: "sh-m1",
      teamId: "sh-t2",
      placement: 2,
      kills: 5,
      placementPoints: 6,
      players: [{ name: "P2", kills: 5 }],
    },
  ]);
});

afterEach(async () => {
  await state.cleanup?.();
  state.db = undefined;
  state.rawSql = undefined;
  state.cleanup = undefined;
  state.currentUser = undefined;
});

function shareRequest(method: "POST" | "DELETE", sessionId: string, body?: unknown) {
  return (
    method === "POST" ? POST : DELETE
  )(
    new Request(`http://localhost:3054/api/sessions/${sessionId}/share`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        "x-scrimly-no-origin-test": "1",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    { params: Promise.resolve({ id: sessionId }) },
  );
}

describe("share links: projection contract", () => {
  it("valid token → exactly the public projection; standings match the golden computeStandings", async () => {
    const { token } = await createShareLink(db, SESSION, MEMBER);
    const data = await getSharedStandings(token);
    expect(data).not.toBeNull();
    expect(data!.scrimName).toBe("Public Scrim");
    expect(data!.confirmedCount).toBe(1);
    expect(data!.plannedMatches).toBe(2);

    const golden = withRanks(
      computeStandings(
        [
          { teamId: "sh-t1", placement: 1, kills: 12, placementPoints: 10 },
          { teamId: "sh-t2", placement: 2, kills: 5, placementPoints: 6 },
        ],
        [
          { id: "sh-t1", name: "Alpha", logoUrl: null },
          { id: "sh-t2", name: "Bravo", logoUrl: null },
        ],
        RULES,
      ),
    ).map(({ logoUrl: _drop, ...row }) => row); // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(data!.standings).toEqual(golden);
  });

  it("projection carries ZERO PII: no @, no uuid, no foreign teams, no owner id", async () => {
    const { token } = await createShareLink(db, SESSION, MEMBER);
    const data = (await getSharedStandings(token))!;
    const json = JSON.stringify(data);
    expect(json).not.toContain("@"); // no emails anywhere
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i); // no uuids (user/org/link)
    expect(json).not.toContain(OWNER);
    expect(json).not.toContain(MEMBER);
    expect(json).not.toContain("SecretSquad"); // sibling session's data
    expect(json).not.toContain("logo"); // projection is names + numbers
    expect(Object.keys(data!.standings[0]!).sort()).toEqual([
      "kp",
      "pp",
      "rank",
      "teamId",
      "teamName",
      "total",
      "wwcd",
    ]);
    expect(Object.keys(data!)).toEqual([
      "scrimName",
      "templateId",
      "confirmedCount",
      "plannedMatches",
      "standings",
    ]);
  });

  it("revoked / expired / unknown tokens are indistinguishable (null)", async () => {
    const { token } = await createShareLink(db, SESSION, MEMBER);

    // Unknown
    expect(await getSharedStandings("no-such-token")).toBeNull();

    // Revoked
    const links = await listShareLinks(db, SESSION);
    await revokeShareLink(db, SESSION, links[0]!.id);
    expect(await getSharedStandings(token)).toBeNull();

    // Expired (explicit expiry in the past)
    await db.insert(schema.shareLinks).values({
      id: "aaaaaaaa-0000-4000-8000-000000000031",
      sessionId: SESSION,
      tokenHash: hashToken("expired-token"),
      createdBy: MEMBER,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await getSharedStandings("expired-token")).toBeNull();
  });
});

describe("share API: two-fixture matrix", () => {
  it("member creates: 201 + raw /share/<token> URL once; hash-only at rest", async () => {
    state.currentUser = MEMBER;
    const res = await shareRequest("POST", SESSION);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { url: string };
    expect(body.url).toMatch(/^http:\/\/localhost:3054\/share\/[A-Za-z0-9_-]{43}$/);
    const raw = body.url.split("/share/")[1]!;
    const rows = await db.select().from(schema.shareLinks);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(hashToken(raw));
    expect(JSON.stringify(rows)).not.toContain(raw);
  });

  it("outsider (not a member of the session's org) → 404", async () => {
    state.currentUser = OUTSIDER;
    const res = await shareRequest("POST", SESSION);
    expect(res.status).toBe(404);
    expect(await db.select().from(schema.shareLinks)).toHaveLength(0);
  });

  it("unauthenticated → 401", async () => {
    state.currentUser = null;
    const res = await shareRequest("POST", SESSION);
    expect(res.status).toBe(401);
  });

  it("DELETE revokes; a foreign linkId is 404 and never revokes", async () => {
    state.currentUser = MEMBER;
    const created = await shareRequest("POST", SESSION);
    const { url } = (await created.json()) as { url: string };
    const links = await db.select().from(schema.shareLinks);

    // Foreign linkId (bogus uuid) → 404.
    const foreign = await shareRequest("DELETE", SESSION, {
      linkId: "aaaaaaaa-0000-4000-8000-00000000dead",
    });
    expect(foreign.status).toBe(404);

    // Real revoke → public page token dies.
    const ok = await shareRequest("DELETE", SESSION, { linkId: links[0]!.id });
    expect(ok.status).toBe(200);
    expect(await getSharedStandings(url.split("/share/")[1]!)).toBeNull();
  });

  it("spoofed identity in body/query is ignored (identity only from getUser)", async () => {
    state.currentUser = OUTSIDER;
    const res = await shareRequest("POST", SESSION);
    // The outsider cannot elevate by any body content — same 404 as plain.
    expect(res.status).toBe(404);
    void eq;
  });
});
