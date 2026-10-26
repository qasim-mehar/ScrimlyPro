// Sweep leftover throwaway test databases (m*test_*) off the shared local
// cluster. Run: npm run db:sweep-test
//
// Every DB-backed test creates m1test_<pid>_<ts>_<rand> and drops it in its
// own afterEach cleanup; this script is the on-demand net for leftovers
// from killed runs (CI cancel, crashed worker, dev Ctrl-C). Cluster-scoped:
// it never touches anything that does not match the m*test_ prefix.
import postgres from "postgres";
import { readFileSync } from "node:fs";

function dbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  // vitest does not load dotenv files — read .env.local directly (same
  // convention as drizzle.config.ts).
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^SUPABASE_DB_URL=(.*)$/m);
  if (m) return m[1].trim();
  throw new Error("SUPABASE_DB_URL is not set (env or .env.local)");
}

const KEEP_PREFIX = /^m\d+test_/;

async function main() {
  const base = new URL(dbUrl());
  base.pathname = "/postgres";
  const admin = postgres(base.toString(), { prepare: false, max: 1 });

  try {
    const rows = await admin.unsafe(
      `SELECT datname FROM pg_database WHERE datname !~ '^template' AND datname <> 'postgres'`,
    );
    const stale = rows
      .map((r) => r.datname)
      .filter((n) => KEEP_PREFIX.test(n));
    console.log(`[db:sweep-test] ${stale.length} throwaway DB(s) found`);
    if (stale.length === 0) return;

    // WITH (FORCE) terminates lingering backends; retry a few times because
    // a drop can race a dying worker's last connection.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const failed = [];
      for (const name of stale) {
        try {
          await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
        } catch (err) {
          if (!/does not exist/i.test(String(err))) failed.push(name);
        }
      }
      if (failed.length === 0) {
        console.log(`[db:sweep-test] dropped ${stale.length} DB(s) (attempt ${attempt})`);
        return;
      }
      if (attempt < 3) {
        console.log(`[db:sweep-test] ${failed.length} left, retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error(`[db:sweep-test] FAILED to drop: ${failed.join(", ")}`);
        process.exitCode = 1;
      }
    }
  } finally {
    await admin.end();
  }
}

await main();
