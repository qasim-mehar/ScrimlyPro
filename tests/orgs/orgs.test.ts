import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import { testDb } from "@/tests/helpers/pg";
import { ensureOrg } from "@/tests/helpers/orgs";
import { withUserDbForTest } from "@/lib/db/user";
import {
  createOrg,
  ensurePersonalOrg,
  fetchOrgRole,
  getActiveOrgs,
  roleAtLeast,
} from "@/lib/orgs/orgs";
import {
  LastOwnerError,
  listMembers,
  removeMember,
  setMemberRole,
} from "@/lib/orgs/roles";
import {
  assertOcrQuota,
  assertSessionQuota,
  getOrgQuota,
  monthlyOcrCount,
  recordUsage,
} from "@/lib/orgs/quotas";
import {
  acceptInvite,
  createInvite,
  listInvites,
  previewInvite,
  revokeInvite,
} from "@/lib/orgs/invites";
import { hashToken } from "@/lib/orgs/tokens";

/**
 * lib/orgs unit coverage on throwaway DBs. RLS adversarials live in
 * tests/rls/org-isolation.test.ts; this file proves the application-layer
 * contracts (helpers are belt, RLS is suspenders).
 */
const OWNER = "11111111-1111-1111-1111-111111111111";
const ADMIN = "22222222-2222-2222-2222-222222222222";
const MEMBER = "33333333-3333-3333-3333-333333333333";
const OUTSIDER = "44444444-4444-4444-4444-444444444444";

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
  // Auth stand-ins for every actor (org FKs point at auth.users).
  for (const u of [OWNER, ADMIN, MEMBER, OUTSIDER]) {
    await db.execute(
      sql`insert into auth.users (id, email) values (${u}, ${u + "@test.dev"}) on conflict (id) do nothing`,
    );
  }
  await ensureOrg(db, OWNER, "Acme");
  await db
    .insert(schema.orgMembers)
    .values({ orgId: await orgIdOf(OWNER), userId: ADMIN, role: "admin" });
  await db
    .insert(schema.orgMembers)
    .values({ orgId: await orgIdOf(OWNER), userId: MEMBER, role: "member" });
});

afterAll(async () => {
  await cleanup?.();
});

async function orgIdOf(user: string): Promise<string> {
  const rows = await db
    .select({ orgId: schema.orgMembers.orgId })
    .from(schema.orgMembers)
    .where(eq(schema.orgMembers.userId, user))
    .limit(1);
  return rows[0]!.orgId;
}

function asUser<T>(user: string, fn: (userDb: Db) => Promise<T>): Promise<T> {
  return withUserDbForTest({ sub: user }, fn, db);
}

describe("orgs: create + membership", () => {
  it("createOrg mints org + owner membership + default quota (100/300)", async () => {
    const orgId = await asUser(OUTSIDER, (userDb) =>
      createOrg(userDb, "  New Org  ", OUTSIDER),
    );
    const org = (
      await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId))
    )[0]!;
    expect(org.name).toBe("New Org");
    expect(org.slug).toMatch(/^u-[0-9a-f]{8}$/);
    expect(org.createdBy).toBe(OUTSIDER);

    const membership = (
      await db.select().from(schema.orgMembers).where(eq(schema.orgMembers.orgId, orgId))
    )[0]!;
    expect(membership.userId).toBe(OUTSIDER);
    expect(membership.role).toBe("owner");

    const quota = await getOrgQuota(db, orgId);
    expect(quota).toEqual({ maxSessions: 100, monthlyOcrCalls: 300 });
  });

  it("getActiveOrgs lists memberships oldest-first; ensurePersonalOrg reuses", async () => {
    const orgs = await asUser(OWNER, (userDb) => getActiveOrgs(userDb, OWNER));
    expect(orgs).toHaveLength(1);
    expect(orgs[0]!.role).toBe("owner");

    const again = await asUser(OWNER, (userDb) =>
      ensurePersonalOrg(userDb, OWNER),
    );
    expect(again).toBe(orgs[0]!.id);
  });

  it("ensurePersonalOrg creates a Personal org when the user has none", async () => {
    const orgId = await asUser(OUTSIDER, (userDb) =>
      ensurePersonalOrg(userDb, OUTSIDER),
    );
    const org = (
      await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId))
    )[0]!;
    expect(org.name).toBe("Personal");
  });

  it("fetchOrgRole: role for members, null for outsiders (existence never confirmed)", async () => {
    const orgId = await orgIdOf(OWNER);
    expect(await asUser(ADMIN, (userDb) => fetchOrgRole(userDb, orgId, ADMIN))).toBe("admin");
    expect(await asUser(MEMBER, (userDb) => fetchOrgRole(userDb, orgId, MEMBER))).toBe("member");
    expect(await asUser(OUTSIDER, (userDb) => fetchOrgRole(userDb, orgId, OUTSIDER))).toBeNull();
  });

  it("roleAtLeast: owner > admin > member", () => {
    expect(roleAtLeast("owner", "admin")).toBe(true);
    expect(roleAtLeast("admin", "admin")).toBe(true);
    expect(roleAtLeast("member", "admin")).toBe(false);
    expect(roleAtLeast("admin", "owner")).toBe(false);
  });
});

describe("orgs: member management (last-owner protection)", () => {
  it("removeMember: admin removable; the LAST owner is not", async () => {
    const orgId = await orgIdOf(OWNER);
    await removeMember(db, orgId, ADMIN);
    expect(await listMembers(db, orgId)).toHaveLength(2);

    expect(removeMember(db, orgId, OWNER)).rejects.toThrow(LastOwnerError);
    // Nothing changed.
    expect(await listMembers(db, orgId)).toHaveLength(2);
  });

  it("removeMember of a non-last owner works when another owner remains", async () => {
    const orgId = await orgIdOf(OWNER);
    await setMemberRole(db, orgId, ADMIN, "owner");
    await removeMember(db, orgId, ADMIN); // 2 owners → removable
    expect(await listMembers(db, orgId)).toHaveLength(2);
  });

  it("setMemberRole: demoting the last owner is blocked; promotions work", async () => {
    const orgId = await orgIdOf(OWNER);
    expect(setMemberRole(db, orgId, OWNER, "admin")).rejects.toThrow(LastOwnerError);
    await setMemberRole(db, orgId, MEMBER, "admin");
    expect(await fetchOrgRole(db, orgId, MEMBER)).toBe("admin");
  });
});

describe("orgs: quotas", () => {
  it("assertSessionQuota passes under the limit and throws at it", async () => {
    const orgId = await orgIdOf(OWNER);
    await db
      .update(schema.orgQuotas)
      .set({ maxSessions: 2 })
      .where(eq(schema.orgQuotas.orgId, orgId));

    const mk = (id: string) => ({
      id,
      userId: OWNER,
      orgId,
      name: `S ${id}`,
      plannedMatches: 2,
      teamCount: 4,
      scoringRules: { kill_points: 1, placement_points: {}, default_placement_points: 0 },
    });
    await db.insert(schema.sessions).values([mk("q-s1"), mk("q-s2")]);

    await expect(assertSessionQuota(db, orgId)).rejects.toMatchObject({
      quota: "max_sessions",
    });
    // Under the limit (2 sessions, just deleted one) it resolves.
    await db.delete(schema.sessions).where(eq(schema.sessions.id, "q-s2"));
    await expect(assertSessionQuota(db, orgId)).resolves.toBeDefined();
  });

  it("missing quota row falls back to defaults", async () => {
    const orgId = await asUser(OUTSIDER, (userDb) =>
      createOrg(userDb, "NoQuota", OUTSIDER),
    );
    await db.delete(schema.orgQuotas).where(eq(schema.orgQuotas.orgId, orgId));
    expect(await getOrgQuota(db, orgId)).toEqual({
      maxSessions: 100,
      monthlyOcrCalls: 300,
    });
  });

  it("OCR meter is per-USER: month-total across orgs; limit from the owning org", async () => {
    // MEMBER belongs to OWNER's org (quota 2 for this test) AND creates their
    // own second org — the classic multi-org evasion the per-org meter allowed.
    const orgA = await orgIdOf(OWNER);
    const orgB = await asUser(MEMBER, (userDb) =>
      createOrg(userDb, "Member Own", MEMBER),
    );
    await db
      .update(schema.orgQuotas)
      .set({ monthlyOcrCalls: 2 })
      .where(eq(schema.orgQuotas.orgId, orgA));

    expect(await monthlyOcrCount(db, MEMBER)).toBe(0);
    await recordUsage(db, orgA, MEMBER);
    // One call in org A: MEMBER still under the limit, OWNER untouched.
    await expect(assertOcrQuota(db, orgA, MEMBER)).resolves.toBeDefined();
    await expect(assertOcrQuota(db, orgA, OWNER)).resolves.toBeDefined();

    // Second call — but recorded in MEMBER's OWN org: a per-org meter would
    // leave org A's count at 1. The per-user count sees both.
    await recordUsage(db, orgB, MEMBER);
    await expect(assertOcrQuota(db, orgA, MEMBER)).rejects.toMatchObject({
      quota: "monthly_ocr_calls",
    });
    // The limit is the owning org's: MEMBER's own org (default 300) still
    // admits the same month-total against its own budget surface.
    await expect(assertOcrQuota(db, orgB, MEMBER)).resolves.toBeDefined();
    // Other members of org A are not charged for MEMBER's usage.
    await expect(assertOcrQuota(db, orgA, OWNER)).resolves.toBeDefined();
  });
});

describe("orgs: invites (hash-at-rest, single-use, expiry)", () => {
  it("createInvite stores ONLY the hash; the raw token is returned once", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "member",
      email: "Friend@Example.com ",
      createdBy: OWNER,
    });
    expect(invite.token).not.toMatch(hashToken(invite.token));

    const row = (
      await db.select().from(schema.orgInvites).where(eq(schema.orgInvites.id, invite.id))
    )[0]!;
    expect(row.tokenHash).toBe(hashToken(invite.token));
    const allHashes = await db
      .select({ h: schema.orgInvites.tokenHash })
      .from(schema.orgInvites);
    for (const { h } of allHashes) expect(h).not.toBe(invite.token);
    expect(row.email).toBe("friend@example.com");
    expect(row.acceptedAt).toBeNull();
  });

  it("previewInvite: valid → org info; unknown/expired/used → null", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "member",
      email: null,
      createdBy: OWNER,
    });
    const preview = await asUser(OUTSIDER, (userDb) =>
      previewInvite(userDb, invite.token),
    );
    expect(preview).toEqual({ orgName: "Acme", role: "member" });

    expect(
      await asUser(OUTSIDER, (userDb) => previewInvite(userDb, "bogus-token")),
    ).toBeNull();

    // Expired: rewrite the expiry into the past.
    await db
      .update(schema.orgInvites)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(schema.orgInvites.id, invite.id));
    expect(
      await asUser(OUTSIDER, (userDb) => previewInvite(userDb, invite.token)),
    ).toBeNull();
  });

  it("acceptInvite: single-use — second accept loses with invalid_or_used", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "member",
      email: null,
      createdBy: ADMIN,
    });

    const win = await asUser(OUTSIDER, (userDb) => acceptInvite(userDb, invite.token));
    expect(win).toEqual({ ok: true, orgId });

    // Membership created with the invited role.
    const membership = (
      await db
        .select()
        .from(schema.orgMembers)
        .where(
          sql`org_members.org_id = ${orgId} and org_members.user_id = ${OUTSIDER}`,
        )
    )[0]!;
    expect(membership.role).toBe("member");

    const lose = await asUser(OUTSIDER, (userDb) => acceptInvite(userDb, invite.token));
    expect(lose).toEqual({ ok: false, reason: "invalid_or_used" });

    // A different user cannot reuse it either.
    const other = "55555555-5555-5555-5555-555555555555";
    const lose2 = await asUser(other, (userDb) => acceptInvite(userDb, invite.token));
    expect(lose2).toEqual({ ok: false, reason: "invalid_or_used" });
  });

  it("acceptInvite is idempotent for an existing member (no duplicate row)", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "admin",
      email: null,
      createdBy: OWNER,
    });
    // MEMBER already belongs; accepting upgrades their role... no: on conflict
    // do nothing keeps their current role, and the invite is consumed.
    const res = await asUser(MEMBER, (userDb) => acceptInvite(userDb, invite.token));
    expect(res).toEqual({ ok: true, orgId });
    expect(await fetchOrgRole(db, orgId, MEMBER)).toBe("member");
  });

  it("acceptInvite copies the invite's bounded role (admin); owner invites cannot exist (B-2)", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "admin",
      email: null,
      createdBy: OWNER,
    });
    await asUser(OUTSIDER, (userDb) => acceptInvite(userDb, invite.token));
    expect(await fetchOrgRole(db, orgId, OUTSIDER)).toBe("admin");

    // DB layer: the role CHECK makes an owner invite impossible for ANY
    // principal, so acceptance can never mint an owner membership. (0014
    // also clamps inside accept_org_invite as belt for pre-existing rows.)
    // Raw SQL: the drizzle column type already forbids 'owner'.
    await expect(
      db.execute(
        sql`insert into org_invites (id, org_id, role, token_hash, expires_at, created_by)
            values ('66666666-6666-6666-6666-666666666666', ${orgId}, 'owner',
                    'hash-owner-invite', now() + interval '1 day', ${OWNER})`,
      ),
    ).rejects.toThrow();
  });

  it("revokeInvite deletes the row; afterwards acceptance fails", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "member",
      email: null,
      createdBy: OWNER,
    });
    await revokeInvite(db, orgId, invite.id);
    expect(await listInvites(db, orgId)).toHaveLength(0);
    expect(
      await asUser(OUTSIDER, (userDb) => acceptInvite(userDb, invite.token)),
    ).toEqual({ ok: false, reason: "invalid_or_used" });
  });

  it("concurrent accepts race: exactly one wins", async () => {
    const orgId = await orgIdOf(OWNER);
    const invite = await createInvite(db, {
      orgId,
      role: "member",
      email: null,
      createdBy: OWNER,
    });
    const results = await Promise.all([
      asUser(OUTSIDER, (userDb) => acceptInvite(userDb, invite.token)),
      asUser(OUTSIDER, (userDb) => acceptInvite(userDb, invite.token)),
    ]);
    const wins = results.filter((r) => r.ok);
    expect(wins).toHaveLength(1);
    const memberships = await db
      .select()
      .from(schema.orgMembers)
      .where(
        sql`org_members.org_id = ${orgId} and org_members.user_id = ${OUTSIDER}`,
      );
    expect(memberships).toHaveLength(1);
  });
});
