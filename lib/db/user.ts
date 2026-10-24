import { sql } from "drizzle-orm";
import { getDb, type Db } from "./client";

export type AuthClaims = { sub: string };

/**
 * User-scoped DB access: every tenant-scoped route handler and server
 * component MUST run its queries through this wrapper.
 *
 * A transaction is opened and, before any query runs, switched to the
 * `authenticated` role with the server-verified JWT claims attached — so
 * Postgres RLS (enabled + FORCED on every tenant table) is the guaranteed
 * backstop even for a query that forgets its ownership WHERE clause.
 *
 * `claims.sub` must come from supabase.auth.getUser() (lib/supabase/server)
 * — NEVER from request input. set_config(..., true) is transaction-local, so
 * pooled connections are clean afterward.
 */
export async function withUserDb<T>(
  claims: AuthClaims,
  fn: (db: Db) => Promise<T>,
  client?: Db,
): Promise<T> {
  // `client` is dependency-injection for tests (the throwaway per-test DB);
  // production request paths always call without it and use the pooled
  // SUPABASE_DB_URL connection.
  const base = client ?? getDb();
  return base.transaction(async (tx) => {
    await tx.execute(sql`select set_config('role', 'authenticated', true)`);
    const jwt = JSON.stringify({ sub: claims.sub, role: "authenticated" });
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${jwt}::text, true)`,
    );
    return fn(tx as unknown as Db);
  });
}
