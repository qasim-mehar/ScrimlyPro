import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/lib/db/schema";
import { POST } from "@/app/api/orgs/[id]/invites/route";

import { testDb } from "../helpers/pg";
import { ensureOrg } from "../helpers/orgs";
import { hashToken } from "@/lib/orgs/tokens";

/**
 * Two-fixture adversarial suite for POST /api/orgs/[id]/invites (M2 §6).
 * Identity is mocked at its ONLY seam (getAuthedUser); the DB is a real
 * throwaway Postgres wired in at withUserDb's pooled-client seam (getDb).
 * The RLS backstop for the same table lives in tests/rls/org-isolation.
 *
 * Matrix: owner 201 (raw link exactly once) · plain member 404 · outsider
 * 404 · foreign org 404 · unauthenticated 401 · bad body 400.
 */

const OWNER = "11111111-1111-1111-1111-111111111111";
const MEMBER = "44444444-4444-4444-4444-444444444444";
const OUTSIDER = "55555555-5555-5555-5555-555555555555";

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: undefined as unknown as (() => Promise<void>) | undefined,
  currentUser: undefined as string | null | undefined,
  orgId: undefined as string | undefined,
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
  const { db, cleanup } = await testDb();
  state.db = db;
  state.cleanup = cleanup;
  for (const u of [OWNER, MEMBER, OUTSIDER]) {
    await db.execute(
      sql`insert into auth.users (id, email) values (${u}, ${u + "@test.dev"}) on conflict (id) do nothing`,
    );
  }
  await ensureOrg(db, OWNER, "Invites Org");
  const orgId = (
    await db
      .select({ orgId: schema.orgMembers.orgId })
      .from(schema.orgMembers)
      .where(eq(schema.orgMembers.userId, OWNER))
      .limit(1)
  )[0]!.orgId;
  state.orgId = orgId;
  await db
    .insert(schema.orgMembers)
    .values({ orgId, userId: MEMBER, role: "member" });
});

afterEach(async () => {
  await state.cleanup?.();
  state.db = undefined;
  state.cleanup = undefined;
  state.currentUser = undefined;
  state.orgId = undefined;
});

function inviteRequest(orgId: string, body: unknown) {
  return POST(
    new Request(`http://localhost:3054/api/orgs/${orgId}/invites`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Test opt-in for missing Origin (non-production only).
        "x-scrimly-no-origin-test": "1",
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: orgId }) },
  );
}

describe("POST /api/orgs/[id]/invites — two-fixture matrix", () => {
  it("owner mints an invite: 201, raw /invite/<token> link returned once", async () => {
    state.currentUser = OWNER;
    const res = await inviteRequest(state.orgId!, { role: "member" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { url: string; expiresAt: string };
    expect(body.url).toMatch(
      /^http:\/\/localhost:3054\/invite\/[A-Za-z0-9_-]{43}$/,
    );
    // Only the hash is in the DB — the raw token never lands there.
    const raw = body.url.split("/invite/")[1]!;
    const invites = await state.db!.select().from(schema.orgInvites);
    expect(invites).toHaveLength(1);
    expect(invites[0]!.tokenHash).toBe(hashToken(raw));
    expect(JSON.stringify(invites)).not.toContain(raw);
  });

  it("plain member → 404 (admin+ required)", async () => {
    state.currentUser = MEMBER;
    const res = await inviteRequest(state.orgId!, { role: "member" });
    expect(res.status).toBe(404);
    expect(await state.db!.select().from(schema.orgInvites)).toHaveLength(0);
  });

  it("outsider → 404, indistinguishable from a missing org", async () => {
    state.currentUser = OUTSIDER;
    const res = await inviteRequest(state.orgId!, { role: "member" });
    expect(res.status).toBe(404);
  });

  it("foreign/missing org id → 404 even for a valid member elsewhere", async () => {
    state.currentUser = MEMBER;
    const foreign = "aaaaaaaa-0000-4000-8000-0000000000ff";
    const res = await inviteRequest(foreign, { role: "member" });
    expect(res.status).toBe(404);
  });

  it("unauthenticated → 401 unauthorized", async () => {
    state.currentUser = null;
    const res = await inviteRequest(state.orgId!, { role: "member" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("bad body → 400 (invalid role / bad email), nothing stored", async () => {
    state.currentUser = OWNER;
    for (const body of [
      { role: "owner" },
      { role: "member", email: "not-an-email" },
      {},
    ]) {
      const res = await inviteRequest(state.orgId!, body);
      expect(res.status).toBe(400);
    }
    expect(await state.db!.select().from(schema.orgInvites)).toHaveLength(0);
  });
});
