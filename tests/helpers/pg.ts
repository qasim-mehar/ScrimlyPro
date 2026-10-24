import { readFileSync } from "node:fs";
import path from "node:path";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

function baseUrl(): string {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^SUPABASE_DB_URL=(.*)$/m);
  if (m) return m[1].trim();
  throw new Error("SUPABASE_DB_URL is not set (env or .env.local)");
}

/**
 * Throwaway Postgres database per call (mirrors the old in-memory sqlite
 * pattern). Vitest runs test files in parallel worker threads, so the name
 * includes pid + randomness to be collision-safe.
 */
export async function testDb(): Promise<{
  db: PostgresJsDatabase<typeof schema>;
  cleanup: () => Promise<void>;
  /** Postgres URL of the throwaway database (for tests that need the
   * production service client to point at the same DB). */
  url: string;
}> {
  const base = baseUrl();
  const name = `m1test_${process.pid}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  // Short-lived admin connection to the maintenance DB creates the test DB.
  const admin = postgres(base, { prepare: false, max: 1 });
  try {
    await admin.unsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  // Rewrite the base URL's database to the throwaway one.
  const url = new URL(base);
  url.pathname = `/${name}`;
  const sql = postgres(url.toString(), { prepare: false, max: 1 });
  const db = drizzle(sql, { schema });
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "db", "migrations"),
  });

  return {
    db,
    url: url.toString(),
    cleanup: async () => {
      await sql.end();
      const dropper = postgres(base, { prepare: false, max: 1 });
      try {
        // WITH (FORCE) terminates any lingering backends before dropping.
        await dropper.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
      } finally {
        await dropper.end();
      }
    },
  };
}
