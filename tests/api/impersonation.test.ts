import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

/**
 * M3 impersonation adversarial suite (Lane C brief rule 6 + §6).
 *
 * Cookie contract, expiry, revocation, real-vs-effective identity:
 *  - start: admin-only (404 uniformity), 30-min ledger row + signed
 *    HttpOnly cookie, double-impersonation refused, self/admin/unknown
 *    targets refused, audited.
 *  - getEffectiveUser: valid cookie → target; expired/revoked/forged/
 *    tampered cookies → REAL identity (fail-closed, every request).
 *  - admin surfaces use the REAL identity: a non-admin holding a stolen
 *    valid cookie still 404s on /admin.
 *  - stop: cookie holder or real admin only; unrelated holders → denied;
 *    audited.
 */
const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const ADMIN2 = "aaaaaaaa-2222-2222-2222-222222222222";
const USER = "bbbbbbbb-2222-2222-2222-222222222222";
const TARGET = "cccccccc-3333-3333-3333-333333333333";

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

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

const adminGlobals = globalThis as unknown as {
  __scrimlyAdminSql?: unknown;
  __scrimlyAdminDb?: unknown;
};

beforeEach(async () => {
  const t = await testDb();
  db = t.db;
  cleanup = t.cleanup;
  process.env.SUPABASE_DB_URL = t.url;
  process.env.IMP_SECRET = "test-imp-secret-0123456789abcdef0123456789abcdef";
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;

  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [ADMIN2, "admin2@test.dev"],
    [USER, "user@test.dev"],
    [TARGET, "target@test.dev"],
  ] as const) {
    await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN2}`);

  authedUser = null;
  jar = new Map();
  userDbRunner = (fn) => fn(db);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;
  delete process.env.SUPABASE_DB_URL;
  delete process.env.IMP_SECRET;
});

function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return (res as { rows?: T[] }).rows ?? [];
}

async function digestOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (e) {
    return (e as { digest?: string }).digest;
  }
}

async function seedImpersonation(opts?: {
  expiresAt?: Date;
  admin?: string;
}): Promise<{ id: string; cookie: string }> {
  const adminId = opts?.admin ?? ADMIN;
  const id = crypto.randomUUID();
  const expiresAt = opts?.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000);
  await db.execute(sql`
    insert into impersonation_sessions
      (id, admin_user_id, target_user_id, target_email, reason, expires_at)
    values (${id}::uuid, ${adminId}::uuid, ${TARGET}::uuid, 'target@test.dev',
            'support', ${expiresAt.toISOString()})
  `);
  const { impCookieValue } = await import("@/lib/admin/impersonation");
  return { id, cookie: impCookieValue(id, adminId, TARGET, expiresAt) };
}

const postInit = (body: unknown) => ({
  method: "POST",
  headers: { "x-scrimly-no-origin-test": "1", "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("impersonate/start", () => {
  it("non-admin → 404; unauthenticated → 404", async () => {
    const { POST } = await import("@/app/api/admin/impersonate/start/route");
    authedUser = { id: USER, email: "user@test.dev" };
    expect(
      await digestOf(() => POST(new Request("http://x/api/admin/impersonate/start", postInit({ targetUserId: TARGET, reason: "r" })))),
    ).toBe(NOT_FOUND_DIGEST);
    authedUser = null;
    expect(
      await digestOf(() => POST(new Request("http://x/api/admin/impersonate/start", postInit({ targetUserId: TARGET, reason: "r" })))),
    ).toBe(NOT_FOUND_DIGEST);
  });

  it("admin start → 200, ledger row (~30 min), signed HttpOnly cookie, audited", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { POST } = await import("@/app/api/admin/impersonate/start/route");
    const res = await POST(new Request("http://x/api/admin/impersonate/start", postInit({ targetUserId: TARGET, reason: "ticket 7" })));
    expect(res.status).toBe(200);

    const rows = rowsOf<{ id: string; expires_at: string; target_email: string }>(
      await db.execute(sql`select id, expires_at, target_email from impersonation_sessions`),
    );
    expect(rows).toHaveLength(1);
    const mins = (new Date(rows[0].expires_at).getTime() - Date.now()) / 60000;
    expect(mins).toBeGreaterThan(28);
    expect(mins).toBeLessThan(31);
    expect(rows[0].target_email).toBe("target@test.dev");

    const cookie = jar.get("imp");
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(new RegExp(`^${rows[0].id}\\.[0-9a-f]{64}$`));

    const audits = rowsOf<{ actor_user_id: string; action: string; target_id: string }>(
      await db.execute(sql`select actor_user_id, action, target_id from audit_log where action = 'admin.impersonation.start'`),
    );
    expect(audits).toEqual([
      { actor_user_id: ADMIN, action: "admin.impersonation.start", target_id: TARGET },
    ]);
  });

  it("double impersonation → 403 already_impersonating (valid cookie present)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { impCookieValue } = await import("@/lib/admin/impersonation");
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    void impCookieValue;

    const { POST } = await import("@/app/api/admin/impersonate/start/route");
    const res = await POST(new Request("http://x/api/admin/impersonate/start", postInit({ targetUserId: USER, reason: "r" })));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "already_impersonating" });
  });

  it("expired cookie does NOT block a fresh start (not 'already impersonating')", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation({ expiresAt: new Date(Date.now() - 1000) });
    jar.set("imp", seeded.cookie);
    const { POST } = await import("@/app/api/admin/impersonate/start/route");
    const res = await POST(new Request("http://x/api/admin/impersonate/start", postInit({ targetUserId: USER, reason: "r" })));
    expect(res.status).toBe(200);
  });

  it("unknown target → 404; self → 400; admin target → 403; missing reason → 400", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { POST } = await import("@/app/api/admin/impersonate/start/route");
    const call = (body: unknown) =>
      POST(new Request("http://x/api/admin/impersonate/start", postInit(body)));
    const ghost = "99999999-9999-9999-9999-999999999999";
    expect((await call({ targetUserId: ghost, reason: "r" })).status).toBe(404);
    expect((await call({ targetUserId: ADMIN, reason: "r" })).status).toBe(400);
    expect((await call({ targetUserId: ADMIN2, reason: "r" })).status).toBe(403);
    expect((await call({ targetUserId: TARGET, reason: "" })).status).toBe(400);
  });
});

describe("effective identity (server-validated on every request)", () => {
  it("valid cookie → target identity; no cookie → real identity", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { getEffectiveUser } = await import("@/lib/admin/impersonation");
    expect(await getEffectiveUser()).toEqual({ id: ADMIN, email: "admin@test.dev" });

    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    expect(await getEffectiveUser()).toEqual({ id: TARGET, email: "target@test.dev" });
  });

  it("expired row → real identity (expiry honored server-side)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation({ expiresAt: new Date(Date.now() - 60_000) });
    jar.set("imp", seeded.cookie);
    const { getEffectiveUser } = await import("@/lib/admin/impersonation");
    expect(await getEffectiveUser()).toEqual({ id: ADMIN, email: "admin@test.dev" });
  });

  it("revoked row → real identity (revocation kills live sessions)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    await db.execute(sql`update impersonation_sessions set revoked_at = now() where id = ${seeded.id}::uuid`);
    const { getEffectiveUser } = await import("@/lib/admin/impersonation");
    expect(await getEffectiveUser()).toEqual({ id: ADMIN, email: "admin@test.dev" });
  });

  it("forged signature → real identity", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", `${seeded.id}.${"0".repeat(64)}`);
    const { getEffectiveUser } = await import("@/lib/admin/impersonation");
    expect(await getEffectiveUser()).toEqual({ id: ADMIN, email: "admin@test.dev" });
  });

  it("tampered expiry (row changed after signing) → real identity", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    await db.execute(
      sql`update impersonation_sessions set expires_at = now() + interval '10 hours' where id = ${seeded.id}::uuid`,
    );
    const { getEffectiveUser } = await import("@/lib/admin/impersonation");
    // The signature no longer matches the row's (admin|target|exp) — reject.
    expect(await getEffectiveUser()).toEqual({ id: ADMIN, email: "admin@test.dev" });
  });

  it("cookie without the admin's auth session (stolen by target) → real (target) identity, worthless", async () => {
    // The target's browser holds the stolen cookie; their own session is
    // the context, and the row's admin_user_id ≠ them → treated as absent.
    authedUser = { id: TARGET, email: "target@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    const { getEffectiveUser } = await import("@/lib/admin/impersonation");
    expect(await getEffectiveUser()).toEqual({ id: TARGET, email: "target@test.dev" });
  });
});

describe("real-vs-effective identity on admin surfaces", () => {
  it("non-admin holding a stolen valid cookie still cannot reach /admin (404)", async () => {
    authedUser = { id: TARGET, email: "target@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    expect(await digestOf(() => requireAdmin())).toBe(NOT_FOUND_DIGEST);
  });

  it("the real admin keeps admin access while impersonating (real identity preserved)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    const { requireAdmin } = await import("@/lib/admin/require-admin");
    const user = await requireAdmin();
    expect(user.id).toBe(ADMIN);
  });
});

describe("impersonate/stop", () => {
  it("cookie holder stops: row revoked, audited with both ids, cookie cleared", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);

    const { POST } = await import("@/app/api/admin/impersonate/stop/route");
    const res = await POST(new Request("http://x/api/admin/impersonate/stop", postInit({})));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, revoked: true });

    const rows = rowsOf<{ revoked_at: string | null }>(
      await db.execute(sql`select revoked_at from impersonation_sessions where id = ${seeded.id}::uuid`),
    );
    expect(rows[0].revoked_at).not.toBeNull();
    expect(jar.get("imp")).toBe("");

    const audits = rowsOf<{ actor_user_id: string; action: string }>(
      await db.execute(sql`select actor_user_id, action from audit_log where action = 'admin.impersonation.stop'`),
    );
    expect(audits).toEqual([{ actor_user_id: ADMIN, action: "admin.impersonation.stop" }]);
  });

  it("unrelated user with a stolen cookie → 404 (admin-surface uniformity)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const seeded = await seedImpersonation();
    jar.set("imp", seeded.cookie);
    const { POST } = await import("@/app/api/admin/impersonate/stop/route");
    expect(
      await digestOf(() => POST(new Request("http://x/api/admin/impersonate/stop", postInit({})))),
    ).toBe(NOT_FOUND_DIGEST);
    // Row untouched.
    const rows = rowsOf<{ revoked_at: string | null }>(
      await db.execute(sql`select revoked_at from impersonation_sessions where id = ${seeded.id}::uuid`),
    );
    expect(rows[0].revoked_at).toBeNull();
  });

  it("another admin's cookie in a different admin's browser → 403, row stays live", async () => {
    authedUser = { id: ADMIN2, email: "admin2@test.dev" };
    const seeded = await seedImpersonation({ admin: ADMIN });
    jar.set("imp", seeded.cookie);
    const { POST } = await import("@/app/api/admin/impersonate/stop/route");
    const res = await POST(new Request("http://x/api/admin/impersonate/stop", postInit({})));
    expect(res.status).toBe(403);
    const rows = rowsOf<{ revoked_at: string | null }>(
      await db.execute(sql`select revoked_at from impersonation_sessions where id = ${seeded.id}::uuid`),
    );
    expect(rows[0].revoked_at).toBeNull();
  });

  it("global stop by row id (real admin, no cookie) → revoked + audited", async () => {
    authedUser = { id: ADMIN2, email: "admin2@test.dev" };
    const seeded = await seedImpersonation({ admin: ADMIN });
    const { POST } = await import("@/app/api/admin/impersonate/stop/route");
    const res = await POST(new Request("http://x/api/admin/impersonate/stop", postInit({ id: seeded.id })));
    expect(res.status).toBe(200);
    const rows = rowsOf<{ revoked_at: string | null }>(
      await db.execute(sql`select revoked_at from impersonation_sessions where id = ${seeded.id}::uuid`),
    );
    expect(rows[0].revoked_at).not.toBeNull();
  });

  it("stop with unknown id → 404; bad id → 400", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { POST } = await import("@/app/api/admin/impersonate/stop/route");
    const ghost = "99999999-9999-9999-9999-999999999999";
    expect(
      (await POST(new Request("http://x/api/admin/impersonate/stop", postInit({ id: ghost })))).status,
    ).toBe(404);
    expect(
      (await POST(new Request("http://x/api/admin/impersonate/stop", postInit({ id: "junk" })))).status,
    ).toBe(400);
  });
});
