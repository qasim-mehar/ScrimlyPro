// Reset the Postgres database at SUPABASE_DB_URL: drop + recreate the public
// schema, re-apply migrations, then reseed. Idempotent — safe to run twice.
// Run: npm run db:reset
//
// NOTE: drizzle's migrator and the seed run on SEPARATE postgres.js clients —
// sharing one client makes the migrator's unsafe() type options break
// postgres.js's json parameter serialization afterwards.
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
  // Dev-hygiene (M2 review B-4): drop the LOCAL auth SHIM too. If auth.users
  // survives a reset, the 0011 backfill re-bootstraps a Personal org for
  // every surviving user (e.g. the seed owner) before the seed creates its
  // own — one ghost Personal org per reset. 0002's conditional shim block
  // recreates the schema on the next migrate. GUARD: real Supabase
  // auth.users has `encrypted_password`; the shim (3 columns) does not —
  // this script must never drop a hosted project's real auth schema.
  const realAuth = await tx`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users'
        and column_name = 'encrypted_password'
    ) as real`;
  if (!realAuth[0].real) {
    await tx`DROP SCHEMA IF EXISTS auth CASCADE`;
  }
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
