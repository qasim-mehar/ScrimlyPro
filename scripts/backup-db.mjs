// M4E — production backup tooling (cut-over runbook step: first backup).
//
//   npm run db:backup
//
// Dumps the Postgres database at SUPABASE_DB_URL (env or .env.local) with
// pg_dump --format=custom into backups/<yyyymmdd-hhmmss>/db.dump, next to a
// manifest.json (timestamp, table row counts, pg_dump version) that
// restore-test.mjs reconciles against.
//
// Safety:
// - ABORTS (exit 1) if SUPABASE_DB_URL is missing.
// - NEVER prints the connection string: the password is passed via the
//   PGPASSWORD environment variable, and host/port/user/dbname via separate
//   argv fields — no DSN ever appears in output, logs, or errors.
// - pg_dump/pg_restore/psql binaries resolve from PG_BIN_DIR
//   (default: C:/Users/mianq/Projects/pg-embedded/pgsql/bin) — zero new npm
//   dependencies.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// Parse without ever stringifying the URL back into output.
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
const pgDump = pgBinary("pg_dump.exe");
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15); // yyyymmdd-hhmmss
const outDir = path.join("backups", stamp);
if (existsSync(outDir)) {
  // Same-second re-run would silently overwrite a good dump — abort instead.
  console.error(`ABORT: ${outDir} already exists — not overwriting an existing backup`);
  process.exit(1);
}
const dumpFile = path.join(outDir, "db.dump");
mkdirSync(outDir, { recursive: true });

const dump = run(pgDump, [
  "--format=custom",
  "--no-owner",
  `--file=${dumpFile}`,
  "--host", dsn.host,
  "--port", dsn.port,
  "--username", dsn.user,
  dsn.database,
], { PGPASSWORD: dsn.password });
if (dump.status !== 0) {
  console.error(`ABORT: pg_dump failed (exit ${dump.status}):\n${dump.stderr}`);
  process.exit(1);
}
if (!existsSync(dumpFile)) {
  console.error("ABORT: pg_dump reported success but no dump file exists");
  process.exit(1);
}
const version = run(pgDump, ["--version"]);
const pgDumpVersion = (version.stdout || "unknown").trim();

// Row counts via the postgres npm client (already a dependency) — the same
// counts restore-test.mjs reconciles against after the restore.
const { default: postgres } = await import("postgres");
const sql = postgres({
  host: dsn.host, port: Number(dsn.port), username: dsn.user,
  password: dsn.password, database: dsn.database, prepare: false, max: 1,
});
const tables = (await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name
`).map((r) => r.table_name);
const counts = {};
for (const t of tables) {
  const rows = await sql.unsafe(`select count(*)::int as n from "${t}"`);
  counts[t] = rows[0].n;
}
await sql.end();

const manifest = {
  createdAt: new Date().toISOString(),
  // Database NAME only — never the host or credentials.
  database: dsn.database,
  pgDumpVersion,
  dumpFile: "db.dump",
  tables: counts,
};
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`✔ backup written to ${outDir}/`);
console.log(`  pg_dump: ${manifest.pgDumpVersion}`);
console.log(`  tables: ${tables.length}, total rows: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
console.log(`  manifest.json written (reconciled by npm run db:restore-test)`);
