// G4 bundle secret scan. Run AFTER `next build` (npm run verify:secrets).
// Scans every emitted client/server bundle for:
//   (a) the exact values of SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL and
//       GEMINI_API_KEY taken from .env.local (values only, never printed), and
//   (b) the literal variable name SUPABASE_SERVICE_ROLE_KEY.
// Exits 1 on any hit. Values are read from .env.local at scan time; files that
// do not exist are skipped so the scan is safe in CI without local env.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = [".next/static", ".next/server/app", ".next/server/chunks"];
const NAME_SCAN = "SUPABASE_SERVICE_ROLE_KEY";

function parseEnvValues(path) {
  if (!existsSync(path)) return [];
  const values = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, name, raw] = m;
    const value = raw.replace(/^["']|["']$/g, "");
    // Only scan values that are actually secret-shaped (long enough, not a placeholder).
    if (
      ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "GEMINI_API_KEY"].includes(
        name,
      ) &&
      value.length >= 8 &&
      !/^<(your_|.*>)$/i.test(value) &&
      !/^postgres(ql)?:\/\/postgres:postgres@/.test(value)
    ) {
      values.push({ name, value });
    }
  }
  return values;
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (st.isFile()) yield p;
  }
}

const secrets = [
  ...parseEnvValues(join(ROOT, ".env.local")),
  ...parseEnvValues(join(ROOT, ".env.local.bak")),
];

let filesScanned = 0;
const hits = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (statSync(file).size > 20 * 1024 * 1024) continue;
    let isText = true;
    try {
      readFileSync(file, "utf8");
    } catch {
      isText = false; // binary chunk — name scan below covers the literal
    }
    if (!isText) continue;
    filesScanned++;
    const content = readFileSync(file, "utf8");
    for (const { name, value } of secrets) {
      if (content.includes(value)) {
        hits.push(`${relative(ROOT, file)} contains the value of ${name}`);
      }
    }
    if (content.includes(NAME_SCAN)) {
      hits.push(`${relative(ROOT, file)} contains the string ${NAME_SCAN}`);
    }
  }
}

// Binary files (woff2, images) can't be string-scanned above; scan raw buffers
// for the variable-name literal only.
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (statSync(file).size > 20 * 1024 * 1024) continue;
    let isText = true;
    try {
      readFileSync(file, "utf8");
    } catch {
      isText = false;
    }
    if (isText) continue;
    const buf = readFileSync(file);
    if (buf.includes(Buffer.from(NAME_SCAN, "utf8"))) {
      hits.push(`${relative(ROOT, file)} (binary) contains the string ${NAME_SCAN}`);
    }
  }
}

console.log(
  `[verify:secrets] scanned ${filesScanned} text files under ${SCAN_DIRS.join(", ")}` +
    ` + binary name-scan against ${secrets.length} secret values`,
);

if (hits.length > 0) {
  console.error("[verify:secrets] FAIL — secret material found in build output:");
  for (const h of hits) console.error(`  - ${h}`);
  process.exit(1);
}
console.log("[verify:secrets] OK — no secret material in build output");
