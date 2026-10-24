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
): Promise<T> {
  return withUserDbOn(getDb(), claims, fn);
}

/**
 * Test-only variant operating on an injected client (the throwaway per-test
 * database). NOT exported from the production surface conventions — call it
 * as withUserDbForTest so production code paths can never grow a hidden knob.
 */
export async function withUserDbForTest<T>(
  claims: AuthClaims,
  fn: (db: Db) => Promise<T>,
  client: Db,
): Promise<T> {
  return withUserDbOn(client, claims, fn);
}

async function withUserDbOn<T>(
  base: Db,
  claims: AuthClaims,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  return base.transaction(async (tx) => {
    await tx.execute(sql`select set_config('role', 'authenticated', true)`);
    const jwt = JSON.stringify({ sub: claims.sub, role: "authenticated" });
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${jwt}::text, true)`,
    );
    return fn(tx as unknown as Db);
  });
}
