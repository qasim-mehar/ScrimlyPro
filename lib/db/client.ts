import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __scrimlyPgSql?: postgres.Sql };

function getSql(): postgres.Sql {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL is not set");
  // prepare: false is safe (and required) behind transaction-mode poolers.
  globalForDb.__scrimlyPgSql ??= postgres(url, { prepare: false, max: 10 });
  return globalForDb.__scrimlyPgSql;
}

/** HMR-safe singleton connection. Server-side use only. */
export function getDb(): Db {
  return drizzle(getSql(), { schema });
}
