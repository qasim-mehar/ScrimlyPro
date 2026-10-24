import { sql } from "drizzle-orm";

import { withUserDb } from "@/lib/db/user";

/**
 * Kill-switch probe for the request path (M3 brief rule 8).
 *
 * The reserved `disabled` marker lives in feature_flags, which is admin-only
 * at the RLS policy level — the tenant request path cannot (and must not)
 * read it directly. `is_user_disabled()` (migration 0020, SECURITY DEFINER,
 * whitelisted EXECUTE for `authenticated`) evaluates the marker inside the
 * caller's own RLS context instead: fail-closed by construction (missing
 * table/function → the query errors → callers deny), and missing flag row =
 * allowed, `disabled` marker = locked out of every authed surface.
 *
 * This is the ONLY lib/admin module the shared guards import, and it imports
 * no RLS-bypassing client.
 */
export async function isUserDisabled(userId: string): Promise<boolean> {
  return withUserDb({ sub: userId }, async (db) => {
    const res = (await db.execute(
      sql`select is_user_disabled(${userId}::uuid) as d`,
    )) as unknown as { rows?: Array<{ d: boolean }> };
    const rows = Array.isArray(res)
      ? (res as unknown as Array<{ d: boolean }>)
      : res.rows ?? [];
    return rows[0]?.d === true;
  });
}
