// Reset the Postgres database at SUPABASE_DB_URL: drop + recreate the public
// schema, re-apply migrations, then reseed. Idempotent — safe to run twice.
// Run: npm run db:reset
//
// NOTE: drizzle's migrator and the seed run on SEPARATE postgres.js clients —
// sharing one client makes the migrator's unsafe() type options break
// postgres.js's json parameter serialization afterwards.
if (process.env.NODE_ENV === "production") {
  console.error("REFUSING: this script wipes/reseeds data and must never run against a hosted/production database (M1 review B6).");
  process.exit(1);
}
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { dbUrl, seedDatabase } from "./seed.mjs";

// --- client 1: schema reset + migrations -------------------------------
const sql = postgres(dbUrl(), { prepare: false, max: 1 });

await sql.begin(async (tx) => {
  await tx`DROP SCHEMA public CASCADE`;
  await tx`CREATE SCHEMA public`;
  // drizzle's migrator keeps its bookkeeping in a separate "drizzle" schema —
  // it must go too, or migrate() would consider everything already applied.
  await tx`DROP SCHEMA IF EXISTS drizzle CASCADE`;
});
console.log("✔ schema reset (DROP + CREATE public)");

const db = drizzle(sql);
await migrate(db, { migrationsFolder: "./db/migrations" });
console.log("✔ migrations applied");
await sql.end();

// --- client 2: seed ------------------------------------------------------
const seedSql = postgres(dbUrl(), { prepare: false, max: 1 });
await seedDatabase(seedSql);
console.log("✔ seeded");
await seedSql.end();

console.log("Reset complete.");
