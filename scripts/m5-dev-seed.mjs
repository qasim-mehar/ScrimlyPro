// M5 dev helper (LOCAL dev DB ONLY — refuses when SUPABASE_DB_URL is not the
// local portable cluster): wires the hosted dev user into the local database
// — auth.users stand-in row, an org + owner membership (the 0014 trigger
// mints the quota row) — so /dashboard renders real, empty-org data.
// Idempotent.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = (() => {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const m = readFileSync(".env.local", "utf8").match(/^SUPABASE_DB_URL=(.*)$/m);
  if (!m) throw new Error("SUPABASE_DB_URL is not set");
  return m[1].trim();
})();
if (!/127\.0\.0\.1:54329/.test(url)) {
  console.error("REFUSING: this helper only runs against the local cluster");
  process.exit(1);
}

const USER_ID = "a01f707b-8bcd-4165-8119-1e4a10b77e7e";
const EMAIL = "m5dash-dev@gmail.com";
const ORG_NAME = "Team Nexus";

const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql`
    insert into auth.users (id, email) values (${USER_ID}, ${EMAIL})
    on conflict (id) do nothing`;

  const existing = await sql`
    select org_id from org_members where user_id = ${USER_ID} limit 1`;
  let orgId;
  if (existing[0]) {
    orgId = existing[0].org_id;
    console.log("org exists", orgId);
  } else {
    orgId = crypto.randomUUID();
    await sql`
      insert into organizations (id, name, slug, created_by)
      values (${orgId}, ${ORG_NAME}, ${"u-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8)}, ${USER_ID})`;
    await sql`
      insert into org_members (org_id, user_id, role) values (${orgId}, ${USER_ID}, 'owner')`;
    console.log("created org", orgId);
  }
  const q = await sql`
    select max_sessions, monthly_ocr_calls from org_quotas where org_id = ${orgId}`;
  console.log("quota row:", JSON.stringify(q[0] ?? "MISSING"));
} finally {
  await sql.end();
}
