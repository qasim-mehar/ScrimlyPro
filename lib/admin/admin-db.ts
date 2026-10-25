import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getAdminSql } from "@/lib/db/admin";
import * as schema from "@/lib/db/schema";

/**
 * THE service-role database surface for the admin panel (Lane C).
 *
 * Confinement contract (M3 brief rule 5):
 * - This is the ONLY module allowed to re-export the RLS-bypassing client
 *   to the request path, and it is importable ONLY from `app/admin/**`
 *   server files and `lib/admin/**` internals — the eslint
 *   `no-restricted-imports` rules in eslint.config.mjs make every other
 *   import an error (canary-proven in tests/api/admin-guard.test.ts).
 * - Client components can never use it: SUPABASE_DB_URL is a server-only
 *   env (not NEXT_PUBLIC_*), and importing postgres.js into a browser
 *   bundle fails the build outright.
 * - Everything it touches on behalf of an admin action is audit-logged by
 *   the calling route; this module performs no authorization of its own —
 *   callers MUST have passed requireAdmin()/requireAdminApi() first.
 */
export type AdminDb = PostgresJsDatabase<typeof schema>;

const globalForAdminDb = globalThis as unknown as {
  __scrimlyAdminDb?: AdminDb;
};

export function getAdminDb(): AdminDb {
  // Runtime backstop for the eslint confinement rule: if this module ever
  // ends up in a client bundle (a future "use client" page under app/admin),
  // fail loudly instead of attempting a server-only connection.
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/admin/admin-db.ts must never run in a client bundle (server-only module)",
    );
  }
  globalForAdminDb.__scrimlyAdminDb ??= drizzle(getAdminSql(), { schema });
  return globalForAdminDb.__scrimlyAdminDb;
}

export { schema as adminSchema };
