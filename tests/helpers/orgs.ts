import { eq, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  orgMembers,
  organizations,
} from "@/lib/db/schema";

/**
 * Test fixture: give a user their own org (Personal by default) with an
 * owner membership and the default quota row — the minimal state a real
 * user gets from createOrg / the 0011 backfill. Throwaway test DBs connect
 * as superuser (RLS bypassed), matching the seed/reset scripts.
 *
 * Also inserts the auth.users stand-in row (real users always have one —
 * organizations.created_by FKs to it) and is idempotent per user.
 */
export async function ensureOrg(
  db: Db,
  userId: string,
  name = "Personal",
): Promise<string> {
  await db.execute(
    sql`insert into auth.users (id, email) values (${userId}, ${userId + "@test.dev"}) on conflict (id) do nothing`,
  );

  const existing = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0].orgId;

  const orgId = crypto.randomUUID();
  await db.insert(organizations).values({
    id: orgId,
    name,
    // `u-<8 hex>` — randomUUID is hex, so the slice is always valid.
    slug: `u-${crypto.randomUUID().replace("-", "").slice(0, 8)}`,
    createdBy: userId,
  });
  await db.insert(orgMembers).values({ orgId, userId, role: "owner" });
  // The 0014 bootstrap trigger mints the default quota row on organizations
  // INSERT — an explicit org_quotas insert here would collide with it.
  return orgId;
}
