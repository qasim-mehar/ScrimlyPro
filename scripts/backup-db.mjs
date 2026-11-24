// M4E — production backup tooling (cut-over runbook step: first backup).
//
//   npm run db:backup
//
// Dumps the Postgres database at SUPABASE_DB_URL (env or .env.local) with
// pg_dump --format=custom into ${BACKUP_DIR:-backups}/<yyyymmdd-hhmmss>/db.dump, next to a
// manifest.json (timestamp, table row counts, pg_dump version) that
// restore-test.mjs reconciles against.
//
// Safety:
// - ABORTS (exit 1) if SUPABASE_DB_URL is missing.
// - NEVER prints the connection string: the password is passed via the
//   PGPASSWORD environment variable, and host/port/user/dbname via separate
//   argv fields — no DSN ever appears in output, logs, or errors.
// - pg_dump/pg_restore binaries resolve from PG_BIN_DIR when set; on Windows
//   the default is the local embedded cluster, on Linux/macOS they are found
//   on PATH (install `postgresql-client` on the VM). Zero new npm deps.
// - Output root is BACKUP_DIR (default: ./backups) so the VM cron can write
//   straight to /home/ubuntu/backups. The directory is created if missing.
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
  // Windows needs the .exe suffix; Linux/macOS do not. When PG_BIN_DIR is not
  // set on Unix, let spawnSync resolve the binary on PATH.
  const exe = process.platform === "win32" ? `${name}.exe` : name;
  const localDefault = "C:/Users/mianq/Projects/pg-embedded/pgsql/bin";
  const binDir = process.env.PG_BIN_DIR ||
    (process.platform === "win32" ? localDefault : "");
  if (!binDir) return exe;
  const full = path.join(binDir, exe);
  if (!existsSync(full)) {
    console.error(
      `ABORT: ${exe} not found at ${full} — set PG_BIN_DIR to the folder containing the PostgreSQL binaries`,
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
    if (res.error.code === "ENOENT") {
      console.error(
        "Hint: install the PostgreSQL client (postgresql-client on Ubuntu) or set PG_BIN_DIR to the folder containing pg_dump/pg_restore.",
      );
    }
    process.exit(1);
  }
  return res;
}

const dsn = dsnParts(dbUrl());
const pgDump = pgBinary("pg_dump");
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15); // yyyymmdd-hhmmss
const backupRoot = process.env.BACKUP_DIR || "backups";
const outDir = path.join(backupRoot, stamp);
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

// Content-level digests (E-5.3): per-session standings digest (computed with
// the REAL computeStandings via Node's native type-stripping, same as
// scripts/golden-check.ts) written into the manifest so the restore test can
// verify restored CONTENT, not just row counts — deterministically, with no
// race against live writes. Only when the three scoring tables exist.
let standings = null;
if (["sessions", "teams", "match_results"].every((t) => counts[t] !== undefined)) {
  try {
    const { createHash } = await import("node:crypto");
    const { computeStandings } = await import("../lib/scoring/standings.ts");
    standings = {};
    const sessionIds = (await sql`select id from sessions order by id`).map((r) => r.id);
    for (const sessionId of sessionIds) {
      const s = await sql`select scoring_rules from sessions where id = ${sessionId}`;
      const teams = (
        await sql`select id, name, logo_url from teams where session_id = ${sessionId}`
      ).map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url }));
      const results = (
        await sql`
          select r.team_id, r.placement, r.kills, r.placement_points
          from match_results r join matches m on m.id = r.match_id
          where m.session_id = ${sessionId}`
      ).map((r) => ({
        teamId: r.team_id, placement: r.placement,
        kills: r.kills, placementPoints: r.placement_points,
      }));
      standings[sessionId] = createHash("sha256")
        .update(JSON.stringify(computeStandings(results, teams, s[0]?.scoring_rules ?? {})))
        .digest("hex");
    }
  } catch (e) {
    console.log(`· standings digests SKIP — ${String(e.message).split("\n")[0]}`);
  }
}
await sql.end();

const manifest = {
  createdAt: new Date().toISOString(),
  // Database NAME only — never the host or credentials.
  database: dsn.database,
  pgDumpVersion,
  dumpFile: "db.dump",
  tables: counts,
  standings,
};
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`✔ backup written to ${outDir}/`);
console.log(`  pg_dump: ${manifest.pgDumpVersion}`);
console.log(`  tables: ${tables.length}, total rows: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
console.log(`  manifest.json written (reconciled by npm run db:restore-test)`);
