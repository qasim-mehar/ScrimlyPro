// M4E — restore test: an untested backup is a hope, not a plan.
//
//   npm run db:restore-test
//
// Takes the NEWEST backup under backups/ (db.dump + manifest.json written by
// backup-db.mjs), restores it into a THROWAWAY database named
// ops_restore_test_<yyyymmdd_hhmmss> on the same server, reconciles per-table
// row counts against the manifest, prints a PASS/FAIL table, then drops the
// throwaway database. Exits 1 on any count delta or structural problem.
//
// Safety:
// - NEVER restores into a pre-existing database: the target name is freshly
//   generated and the naming guard refuses anything that does not match
//   /^ops_restore_test_[0-9_]+$/ — a real database can never be addressed.
// - The throwaway is dropped in a finally block, even on failure.
// - Never prints the connection string (same contract as backup-db.mjs).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function dbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(
      /^SUPABASE_DB_URL=(.*)$/m,
    );
    if (m) return m[1].trim();
  }
  console.error("ABORT: SUPABASE_DB_URL is not set (env or .env.local)");
  process.exit(1);
}

function dsnParts(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    console.error("ABORT: SUPABASE_DB_URL is not a valid URL");
    process.exit(1);
  }
  if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") {
    console.error("ABORT: SUPABASE_DB_URL must be a postgres:// URL");
    process.exit(1);
  }
  if (!u.pathname || u.pathname === "/") {
    console.error("ABORT: SUPABASE_DB_URL has no database name");
    process.exit(1);
  }
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)),
  };
}

function pgBinary(name) {
  const binDir = process.env.PG_BIN_DIR || "C:/Users/mianq/Projects/pg-embedded/pgsql/bin";
  const full = path.join(binDir, name);
  if (!existsSync(full)) {
    console.error(
      `ABORT: ${name} not found at ${full} — set PG_BIN_DIR to the folder containing the PostgreSQL binaries`,
    );
    process.exit(1);
  }
  return full;
}

function run(binary, args, extraEnv = {}) {
  const res = spawnSync(binary, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  if (res.error) {
    console.error(`ABORT: failed to run ${path.basename(binary)}: ${res.error.message}`);
    process.exit(1);
  }
  return res;
}

const dsn = dsnParts(dbUrl());
const pgRestore = pgBinary("pg_restore.exe");

// --- locate the newest backup ------------------------------------------------
if (!existsSync("backups")) {
  console.error("ABORT: no backups/ directory — run npm run db:backup first");
  process.exit(1);
}
const stamps = readdirSync("backups").filter((d) =>
  existsSync(path.join("backups", d, "db.dump")) &&
  existsSync(path.join("backups", d, "manifest.json")),
);
if (stamps.length === 0) {
  console.error("ABORT: backups/ has no complete backup (db.dump + manifest.json) — run npm run db:backup first");
  process.exit(1);
}
stamps.sort(); // yyyymmdd-hhmmss sorts lexicographically = chronologically
const newest = stamps[stamps.length - 1];
const dumpFile = path.join("backups", newest, "db.dump");
const manifest = JSON.parse(
  readFileSync(path.join("backups", newest, "manifest.json"), "utf8"),
);

// --- throwaway database, naming-guarded ---------------------------------------
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "_")
  .slice(0, 15);
const restoreDb = `ops_restore_test_${stamp}`;
// NAMING GUARD: this script must never be able to target a real database.
if (!/^ops_restore_test_[0-9_]+$/.test(restoreDb) || restoreDb === dsn.database) {
  console.error(`ABORT: generated throwaway name failed the safety guard: ${restoreDb}`);
  process.exit(1);
}

const { default: postgres } = await import("postgres");
const admin = postgres({
  host: dsn.host, port: Number(dsn.port), username: dsn.user,
  password: dsn.password, database: "postgres", prepare: false, max: 1,
});

let exitCode = 0;
try {
  console.log(`Restore test — newest backup: ${newest} (pg_dump: ${manifest.pgDumpVersion})`);
  console.log(`Throwaway database: ${restoreDb} (dropped at the end, win or lose)`);
  await admin.unsafe(`CREATE DATABASE "${restoreDb}"`);

  const restore = run(pgRestore, [
    "--no-owner",
    "--dbname", `host=${dsn.host} port=${dsn.port} user=${dsn.user} dbname=${restoreDb}`,
    dumpFile,
  ], { PGPASSWORD: dsn.password });
  if (restore.status !== 0) {
    console.error(`ABORT: pg_restore failed (exit ${restore.status}):\n${restore.stderr}`);
    process.exit(1);
  }
  if (restore.stderr.trim()) {
    console.log(`pg_restore notes (stderr):\n${restore.stderr.trim()}`);
  }

  // --- reconcile row counts vs manifest ----------------------------------------
  const target = postgres({
    host: dsn.host, port: Number(dsn.port), username: dsn.user,
    password: dsn.password, database: restoreDb, prepare: false, max: 1,
  });
  const restoredTables = new Set(
    (await target`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
    `).map((r) => r.table_name),
  );

  console.log("\n  table                                  manifest   restored   verdict");
  console.log("  " + "-".repeat(68));
  const manifestTables = Object.entries(manifest.tables).sort(([a], [b]) => a.localeCompare(b));
  let fails = 0;
  for (const [t, expected] of manifestTables) {
    if (!restoredTables.has(t)) {
      console.log(`  ${t.padEnd(38)} ${String(expected).padStart(9)}   MISSING    FAIL`);
      fails++;
      continue;
    }
    const got = (await target.unsafe(`select count(*)::int as n from "${t}"`))[0].n;
    if (got === expected) {
      console.log(`  ${t.padEnd(38)} ${String(expected).padStart(9)} ${String(got).padStart(9)}   PASS`);
    } else {
      console.log(`  ${t.padEnd(38)} ${String(expected).padStart(9)} ${String(got).padStart(9)}   FAIL`);
      fails++;
    }
  }
  await target.end();

  console.log("\n" + `-`.repeat(72));
  if (fails === 0) {
    console.log(`RESTORE TEST PASS — ${manifestTables.length}/${manifestTables.length} tables match the manifest`);
  } else {
    console.log(`RESTORE TEST FAIL — ${fails}/${manifestTables.length} tables differ from the manifest`);
    exitCode = 1;
  }
} finally {
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${restoreDb}" WITH (FORCE)`);
    console.log(`✔ throwaway database ${restoreDb} dropped`);
  } catch (e) {
    console.error(`WARN: could not drop ${restoreDb}: ${e.message}`);
    exitCode = 1;
  }
  await admin.end();
}

process.exit(exitCode);
