import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __scrimlyDb?: Db };

function createDb(): Db {
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "scrimly.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

/** HMR-safe singleton connection. Server-side use only. */
export function getDb(): Db {
  globalForDb.__scrimlyDb ??= createDb();
  return globalForDb.__scrimlyDb;
}
