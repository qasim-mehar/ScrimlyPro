import { and, asc, eq, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  orgMembers,
  orgQuotas,
  organizations,
  type OrgRole,
} from "@/lib/db/schema";

/**
 * M2 org helpers (Lane B). Every function here takes an explicit verified
 * userId (never request input) and runs INSIDE a withUserDb transaction at
 * the call site — RLS is the backstop, the explicit predicates are the belt.
 */

/**
 * Explicit org-membership predicate on `sessions` (the belt to RLS's
 * suspenders). Use in WHERE clauses whose FROM/JOIN exposes
 * sessions.org_id — replaces the M1 eq(sessions.userId, user.id) predicate
 * now that tenancy is the org.
 */
export function orgMemberPredicate(userId: string) {
  return sql`exists (
    select 1 from org_members m
    where m.org_id = sessions.org_id and m.user_id = ${userId}
  )`;
}

/** owner > admin > member. */
export const ROLE_ORDER: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function roleAtLeast(role: OrgRole, min: OrgRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[min];
}

/**
 * The caller's role in an org, checked in-DB inside the caller's
 * withUserDb transaction. Foreign and missing orgs are indistinguishable
 * (both null) — existence is never confirmed to non-members.
 */
export async function fetchOrgRole(
  db: Db,
  orgId: string,
  userId: string,
): Promise<OrgRole | null> {
  const row = (
    await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1)
  )[0];
  return row?.role ?? null;
}

export type ActiveOrg = {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
};

/** The user's orgs (any role), oldest membership first — the selector's source. */
export async function getActiveOrgs(
  db: Db,
  userId: string,
): Promise<ActiveOrg[]> {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(orgMembers.userId, userId))
    .orderBy(asc(orgMembers.joinedAt));
}

/**
 * Create an org + the creator's owner membership + default quota row in ONE
 * transaction scope (caller's withUserDb tx). The membership insert relies on
 * the org_member_insert bootstrap branch (is_org_creator) in the RLS policy.
 */
export async function createOrg(
  db: Db,
  name: string,
  userId: string,
): Promise<string> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new Error("org name must be 1–80 characters");
  }
  const orgId = crypto.randomUUID();
  await db.insert(organizations).values({
    id: orgId,
    name: trimmed,
    // `u-<8 hex>` collision handle; randomUUID is hex so the slice is valid.
    slug: `u-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    createdBy: userId,
  });
  await db
    .insert(orgMembers)
    .values({ orgId, userId, role: "owner" });
  await db.insert(orgQuotas).values({ orgId });
  return orgId;
}

/**
 * Pilot convenience: a user's first org, creating a "Personal" one when they
 * have none (fresh/legacy users). Runs inside the caller's tx so a session
 * create and its org bootstrap are atomic.
 */
export async function ensurePersonalOrg(
  db: Db,
  userId: string,
): Promise<string> {
  const orgs = await getActiveOrgs(db, userId);
  if (orgs[0]) return orgs[0].id;
  return createOrg(db, "Personal", userId);
}
