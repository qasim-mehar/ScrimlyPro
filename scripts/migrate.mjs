// Applies committed migrations to data/scrimly.db. Run: npm run db:migrate
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dir = path.join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const sqlite = new Database(path.join(dir, "scrimly.db"));
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);
migrate(db, {
  migrationsFolder: path.join(process.cwd(), "db", "migrations"),
});
sqlite.close();
console.log("✔ migrations applied to data/scrimly.db");
