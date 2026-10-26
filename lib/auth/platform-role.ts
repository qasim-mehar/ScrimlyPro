import { sql } from "drizzle-orm";

import { withUserDb } from "@/lib/db/user";

/**
 * Platform-admin role predicate — the ONE implementation (M6 WP2).
 *
 * The role is read from `profiles` inside the caller's own RLS context
 * (withUserDb) — never from a cookie, header, claim, or client state, and
 * never cached. `requireAdmin`/`requireAdminApi` (lib/admin/require-admin.ts)
 * consume this same function for the admin 404 gate, and the "/" role
 * landing (app/page.tsx) consumes it for NAVIGATION only — authorization
 * always remains requireAdmin's; even if this predicate mis-routed someone,
 * no security boundary moves because the /admin guard re-checks
 * independently on every request.
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
