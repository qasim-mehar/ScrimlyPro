import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/**
 * M6 WP10 — /api/admin/search guard + contract.
 *
 * 404 law: unauthenticated and non-admin callers get the identical Next 404
 * fallback (no existence leak). Admins get grouped results with no-store.
 */

const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const USER = "bbbbbbbb-2222-2222-2222-222222222222";

let authedUser: { id: string; email: string | null } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () => authedUser),
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("Supabase env is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }),
}));

vi.mock("@/lib/db/user", () => ({
  withUserDb: vi.fn(
    async (_claims: unknown, fn: (db: Db) => Promise<unknown>) => userDbRunner(fn),
  ),
  withUserDbForTest: vi.fn(
    async (_claims: unknown, fn: (db: Db) => Promise<unknown>, client: Db) => fn(client),
  ),
}));

let db: Db;
let cleanup: () => Promise<void>;
let userDbRunner: <T>(fn: (userDb: Db) => Promise<T>) => Promise<T> = async (fn) =>
  fn(undefined as unknown as Db);

const adminGlobals = globalThis as unknown as {
  __scrimlyAdminSql?: unknown;
  __scrimlyAdminDb?: unknown;
};

beforeEach(async () => {
  const t = await testDb();
  db = t.db;
  cleanup = t.cleanup;
  process.env.SUPABASE_DB_URL = t.url;
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;

  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [USER, "user@test.dev"],
  ] as const) {
    await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);
  await db.execute(
    sql`insert into organizations (id, name, slug, created_by, created_at)
        values ('11111111-aaaa-4000-8000-0000000000b1', 'Karachi Kings', 'karachi', ${ADMIN}, now() - interval '5 days')`,
  );

  authedUser = null;
  userDbRunner = (fn) => fn(db);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;
  delete process.env.SUPABASE_DB_URL;
});

async function digestOfGet(url: string): Promise<string | undefined> {
  const { GET } = await import("@/app/api/admin/search/route");
  try {
    await GET(new Request(url));
    return undefined;
  } catch (e) {
    return (e as { digest?: string }).digest;
  }
}

describe("GET /api/admin/search", () => {
  it("unauthenticated → the standard Next 404 fallback", async () => {
    authedUser = null;
    expect(await digestOfGet("http://localhost:3064/api/admin/search?q=x")).toBe(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("authenticated non-admin → the identical 404 (no existence leak)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    expect(await digestOfGet("http://localhost:3064/api/admin/search?q=x")).toBe(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("admin → grouped results, no-store, empty q → empty groups", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { GET } = await import("@/app/api/admin/search/route");

    const res = await GET(
      new Request("http://localhost:3064/api/admin/search?q=karachi"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = (await res.json()) as {
      users: unknown[];
      orgs: Array<{ name: string }>;
    };
    expect(body.orgs.map((o) => o.name)).toEqual(["Karachi Kings"]);
    expect(body.users).toEqual([]);

    const byUser = await GET(
      new Request("http://localhost:3064/api/admin/search?q=user@test"),
    );
    const body2 = (await byUser.json()) as { users: Array<{ email: string }> };
    expect(body2.users.map((u) => u.email)).toEqual(["user@test.dev"]);

    const empty = await GET(new Request("http://localhost:3064/api/admin/search?q="));
    const body3 = (await empty.json()) as { users: unknown[]; orgs: unknown[] };
    expect(body3).toEqual({ users: [], orgs: [] });
  });
});
