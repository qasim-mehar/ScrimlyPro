import { sql } from "drizzle-orm";

import { withUserDb } from "@/lib/db/user";

/**
 * Platform-admin probe for the `/` role redirect (M5 §6). Mirrors
 * lib/admin/require-admin's isAdminRole semantics — role read from
 * `profiles` INSIDE the caller's RLS context, never from a cookie/claim —
 * but lives here so lib/admin/** stays untouched (M5 rule 9).
 *
 * Called with the EFFECTIVE identity (impersonation-aware): an admin
 * impersonating a member lands on the member's /dashboard, matching the
 * M5 §6 redirect contract (the /admin console itself still guards on the
 * REAL identity via requireAdmin).
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  return withUserDb({ sub: userId }, async (db) => {
    const res = (await db.execute(
      sql`select role from profiles where id = ${userId}::uuid`,
    )) as unknown as { rows?: Array<{ role: string }> };
    const rows = Array.isArray(res)
      ? (res as unknown as Array<{ role: string }>)
      : res.rows ?? [];
    return rows[0]?.role === "admin";
  });
}
