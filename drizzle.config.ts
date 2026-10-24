import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// SUPABASE_DB_URL comes from the environment or .env.local (drizzle-kit does
// not load dotenv files itself).
function dbUrl(): string {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^SUPABASE_DB_URL=(.*)$/m);
  if (m) return m[1].trim();
  throw new Error("SUPABASE_DB_URL is not set (env or .env.local)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: dbUrl() },
});
