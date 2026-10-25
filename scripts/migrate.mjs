// Applies committed migrations to the Postgres database at SUPABASE_DB_URL.
// Run: npm run db:migrate
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

function dbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^SUPABASE_DB_URL=(.*)$/m);
  if (m) return m[1].trim();
  throw new Error("SUPABASE_DB_URL is not set (env or .env.local)");
}

const sql = postgres(dbUrl(), { prepare: false, max: 1 });
const db = drizzle(sql);
await migrate(db, { migrationsFolder: "./db/migrations" });
await sql.end();
console.log("✔ migrations applied to Postgres (SUPABASE_DB_URL)");
