import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

/**
 * MERGE GATE — Lane AB critical review C-1 (P0, B×C seam).
 *
 * Lane B ships its own `lib/orgs/route-guard.ts`, forked from the shared
 * route guard BEFORE Lane C inserted the kill-switch probe and the
 * effective-identity swap into `lib/auth/route-guard.ts`. Copies don't
 * inherit fixes: an unfolded copy means every org route (a) never probes
 * `is_user_disabled()` (kill-switch bypass on the whole M2 surface) and
 * (b) runs under the REAL identity, so an impersonating admin acts as
 * themselves instead of the target.
 *
 * In THIS tree (pre-merge, no lib/orgs) the file is absent and the suite
 * skips cleanly. When qasim/m2-orgs merges, these tests MUST FAIL until the
 * runbook's fold-in lands (withOrgRoute → shared guard, copy deleted /
 * delegating), and pass after. They are the merge gate, not decoration.
 *
 * Covered semantics (review C-1's three adversarial cases):
 *   1. disabled user → org route → 403 {"error":"account_disabled"};
 *   2. impersonating admin → org route → handler receives the TARGET
 *      identity (RLS runs as target);
 *   3. the structural half: an org guard copy must not carry its own
 *      identity logic at all (no getAuthedUser/createServerSupabaseClient
 *      imports) — it must delegate to lib/auth/route-guard.
 * (Case 3 of the review — org SERVER actions — is enforced structurally:
 * action files must import the shared action-guard; the architecture
 * meta-test union covers the wiring, this suite proves semantics.)
 */
const ORG_GUARD = "lib/orgs/route-guard.ts";

const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const TARGET = "cccccccc-3333-3333-3333-333333333333";
const USER = "bbbbbbbb-2222-2222-2222-222222222222";

let authedUser: { id: string; email: string | null } | null = null;
let jar = new Map<string, string>();

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () => authedUser),
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("Supabase env is not configured");
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
  })),
}));

let userDbRunner: <T>(fn: (userDb: Db) => Promise<T>) => Promise<T> = async (fn) =>
  fn(undefined as unknown as Db);

vi.mock("@/lib/db/user", () => ({
  withUserDb: vi.fn(async (_claims: unknown, fn: (db: Db) => Promise<unknown>) =>
    userDbRunner(fn),
  ),
  withUserDbForTest: vi.fn(async (_claims: unknown, fn: (db: Db) => Promise<unknown>, client: Db) =>
    fn(client),
  ),
}));

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  if (!existsSync(join(process.cwd(), ORG_GUARD))) return; // pre-merge: skip setup
  const t = await testDb();
  db = t.db;
  cleanup = t.cleanup;
  process.env.SUPABASE_DB_URL = t.url;
  process.env.IMP_SECRET = "test-imp-secret-0123456789abcdef0123456789abcdef";
  const g = globalThis as unknown as {
    __scrimlyAdminSql?: unknown;
    __scrimlyAdminDb?: unknown;
  };
  g.__scrimlyAdminSql = undefined;
  g.__scrimlyAdminDb = undefined;

  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [USER, "user@test.dev"],
    [TARGET, "target@test.dev"],
  ] as const) {
    await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);
  authedUser = null;
  jar = new Map();
  userDbRunner = (fn) => fn(db);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
  const g = globalThis as unknown as { __scrimlyAdminSql?: unknown; __scrimlyAdminDb?: unknown };
  g.__scrimlyAdminSql = undefined;
  g.__scrimlyAdminDb = undefined;
  delete process.env.SUPABASE_DB_URL;
  delete process.env.IMP_SECRET;
});

function orgGuardExists(): boolean {
  return existsSync(join(process.cwd(), ORG_GUARD));
}

describe("C-1 merge gate: Lane B's org guard inherits the shared guard fixes", () => {
  it("structural: an org route guard must not carry its own identity logic", async () => {
    if (!orgGuardExists()) {
      console.info(`org-guard-fold: ${ORG_GUARD} absent (pre-merge) — structural check skipped`);
      return;
    }
    const src = readFileSync(join(process.cwd(), ORG_GUARD), "utf8");
    // The fold-in means: identity comes from the shared guards only.
    expect(src).not.toMatch(/import\s*\{[^}]*getAuthedUser/);
    expect(src).not.toMatch(/createServerSupabaseClient/);
    expect(src).toMatch(/@\/lib\/auth\/(route-guard|action-guard)/);
  });

  it("semantic: disabled user → org route → 403 account_disabled", async () => {
    if (!orgGuardExists()) return; // pre-merge skip (structural skip logged above)
    const mod = (await import(`@/${ORG_GUARD.replace(/\.ts$/, "")}`)) as Record<string, unknown>;
    const wrapper = Object.entries(mod).find(
      ([name, v]) => /^with\w*Route$/.test(name) && typeof v === "function",
    );
    if (!wrapper) {
      throw new Error("org guard exports no withXRoute wrapper — cannot prove kill-switch coverage");
    }
    authedUser = { id: USER, email: "user@test.dev" };
    await db.execute(sql`
      insert into feature_flags (id, subject_type, subject_id, flag, value)
      values (gen_random_uuid(), 'user', ${USER}::uuid, 'disabled', '{"reason":"abuse"}')
    `);

    let handlerRan = false;
    const handler = (wrapper[1] as (h: unknown) => (req: Request) => Promise<Response>)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (_req: Request, ctx: any) => {
        handlerRan = true;
        void ctx;
        return new Response("handler-ran", { status: 200 });
      },
    );
    const res = await handler(
      new Request("http://localhost:3056/api/org", {
        method: "POST",
        headers: { "x-scrimly-no-origin-test": "1" },
      }),
    );
    expect(handlerRan).toBe(false);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "account_disabled" });
  });

  it("semantic: impersonating admin → org route → handler receives the TARGET identity", async () => {
    if (!orgGuardExists()) return;
    const mod = (await import(`@/${ORG_GUARD.replace(/\.ts$/, "")}`)) as Record<string, unknown>;
    const wrapper = Object.entries(mod).find(
      ([name, v]) => /^with\w*Route$/.test(name) && typeof v === "function",
    );
    if (!wrapper) {
      throw new Error("org guard exports no withXRoute wrapper — cannot prove impersonation coverage");
    }
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { impCookieValue } = await import("@/lib/admin/impersonation");
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.execute(sql`
      insert into impersonation_sessions
        (id, admin_user_id, target_user_id, target_email, reason, expires_at)
      values (${id}::uuid, ${ADMIN}::uuid, ${TARGET}::uuid, 'target@test.dev',
              'support', ${expiresAt.toISOString()})
    `);
    jar.set("imp", impCookieValue(id, ADMIN, TARGET, expiresAt));

    let seenUserId = "";
    const handler = (wrapper[1] as (h: unknown) => (req: Request) => Promise<Response>)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (_req: Request, ctx: any) => {
        seenUserId = (ctx.user as { id: string }).id;
        return new Response("ok", { status: 200 });
      },
    );
    const res = await handler(
      new Request("http://localhost:3056/api/org", {
        method: "POST",
        headers: { "x-scrimly-no-origin-test": "1" },
      }),
    );
    expect(res.status).toBe(200);
    // REAL identity would be ADMIN — the fold-in must make org routes act as TARGET.
    expect(seenUserId).toBe(TARGET);
  });
});
