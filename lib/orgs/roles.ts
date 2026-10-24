import { and, asc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";
import type { Db } from "@/lib/db/client";
import { withUserDb } from "@/lib/db/user";
import {
  orgMembers,
  sessions,
  type OrgRole,
} from "@/lib/db/schema";
import type { AuthedUser } from "@/lib/supabase/server";
import { fetchOrgRole, roleAtLeast } from "./orgs";

export { roleAtLeast, fetchOrgRole };

/**
 * Action/component-layer org guards (mirror lib/auth/action-guard.ts, but
 * org-scoped). notFound()/redirect() only ever run here — lib functions
 * stay redirect-free. Missing and foreign resources are INDISTINGUISHABLE:
 * both render the 404 page (existence never confirmed to non-members).
 *
 * `client` was Lane B's test dependency-injection param — wave-1 integration
 * drops it: no caller ever passed it, and Lane A's C3 split confines test
 * injection to withUserDbForTest so production code cannot grow a hidden knob.
 */

export type OrgRoleContext = {
  user: AuthedUser;
  orgId: string;
  role: OrgRole;
};

/**
 * Verified user + proof of membership at >= minRole in the org.
 */
export async function requireOrgRole(
  orgId: string,
  minRole: OrgRole,
): Promise<OrgRoleContext> {
  const user = await requireUser();
  const role = await withUserDb({ sub: user.id }, (userDb) =>
    fetchOrgRole(userDb, orgId, user.id),
  );
  if (!role || !roleAtLeast(role, minRole)) notFound();
  return { user, orgId, role };
}

export type SessionAccessContext = {
  user: AuthedUser;
  sessionId: string;
  orgId: string;
  role: OrgRole;
};

/**
 * Verified user + proof of membership (>= minRole) in the org that owns the
 * session. This is the M2 successor of assertSessionOwner: tenancy is the
 * org, the explicit membership predicate is the belt, RLS the suspenders.
 */
export async function requireSessionAccess(
  sessionId: string,
  minRole: OrgRole = "member",
): Promise<SessionAccessContext> {
  const user = await requireUser();
  const found = await withUserDb({ sub: user.id }, async (userDb) => {
    return (
      (
        await userDb
          .select({ orgId: sessions.orgId, role: orgMembers.role })
          .from(sessions)
          .innerJoin(
            orgMembers,
            and(
              eq(orgMembers.orgId, sessions.orgId),
              eq(orgMembers.userId, user.id),
            ),
          )
          .where(eq(sessions.id, sessionId))
          .limit(1)
      )[0] ?? null
    );
  });
  if (!found || !roleAtLeast(found.role, minRole)) notFound();
  return {
    user,
    sessionId,
    orgId: found.orgId,
    role: found.role,
  };
}

/**
 * Every org member (any role) — the members page. RLS scopes the read;
 * the explicit org predicate is the belt.
 */
export async function listMembers(
  db: Db,
  orgId: string,
): Promise<Array<{ userId: string; role: OrgRole; joinedAt: string }>> {
  return db
    .select({
      userId: orgMembers.userId,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
    })
    .from(orgMembers)
    .where(eq(orgMembers.orgId, orgId))
    .orderBy(asc(orgMembers.joinedAt));
}

export class LastOwnerError extends Error {
  constructor() {
    super("cannot remove or demote the last owner of an org");
  }
}

async function ownerCount(db: Db, orgId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "owner")));
  return rows[0]?.n ?? 0;
}

/**
 * Remove a member. Last-owner protection: the final owner cannot be removed
 * (pilot has no ownership transfer — documented in the M2 report).
 */
export async function removeMember(
  db: Db,
  orgId: string,
  targetUserId: string,
): Promise<void> {
  const target = (
    await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(
        and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)),
      )
      .limit(1)
  )[0];
  if (!target) return; // nothing to do — idempotent
  if (target.role === "owner" && (await ownerCount(db, orgId)) <= 1) {
    throw new LastOwnerError();
  }
  await db
    .delete(orgMembers)
    .where(
      and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)),
    );
}

/**
 * Change a member's role. Last-owner protection applies when demoting the
 * final owner; self-demotion of the final owner is blocked by the same rule.
 */
export async function setMemberRole(
  db: Db,
  orgId: string,
  targetUserId: string,
  role: OrgRole,
): Promise<void> {
  const target = (
    await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(
        and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)),
      )
      .limit(1)
  )[0];
  if (!target) return;
  if (
    target.role === "owner" &&
    role !== "owner" &&
    (await ownerCount(db, orgId)) <= 1
  ) {
    throw new LastOwnerError();
  }
  await db
    .update(orgMembers)
    .set({ role })
    .where(
      and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)),
    );
}
