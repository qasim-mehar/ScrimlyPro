import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

// DB-backed suites are slow under parallel workers; the 5s default flakes.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/**
 * M3 kill-switch adversarial suite (Lane C brief rule 8 + §6).
 *
 * Proven on REAL guards and a REAL route with the mocked identity seam:
 *  - the disable check lives in requireUser() — the single choke point — so
 *    a disabled tenant is locked out of every authed API surface (403
 *    {"error":"account_disabled"}, proven on the real /api/ocr route) and
 *    every authed page/action (redirect to /login?disabled=1);
 *  - missing flag = allowed (fail-ALLOWED by design for the flag read; the
 *    disabled marker itself fails CLOSED);
 *  - re-enable restores access immediately;
 *  - disable/enable API: non-admin → 404, admin → 200 + audited rows with
 *    actor/effective/target ids.
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

// Same DI seam as the admin-guard suite: the production withUserDb wrapper
// is pointed at the throwaway per-test database.
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
  // Point the real service-role clients (admin-db) at the throwaway DB.
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

async function setDisabled(on: boolean, reason = "abuse") {
  if (on) {
    await db.execute(sql`
      insert into feature_flags (id, subject_type, subject_id, flag, value)
      values (gen_random_uuid(), 'user', ${USER}::uuid, 'disabled',
              ${JSON.stringify({ reason })}::jsonb)
    `);
  } else {
    await db.execute(sql`
      delete from feature_flags
      where subject_type = 'user' and subject_id = ${USER}::uuid and flag = 'disabled'
    `);
  }
}

/** postgres.js returns row arrays (drizzle passes them through); older
 * result shapes carry .rows — handle both. */
function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return (res as { rows?: T[] }).rows ?? [];
}

/** A guard's notFound() inside a route handler throws Next's 404 fallback;
 * the runtime converts it to a real 404 response — mirror that here. */
async function postCatch404(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    if ((e as { digest?: string }).digest === "NEXT_HTTP_ERROR_FALLBACK;404") {
      return new Response(null, { status: 404 }) as unknown as Response;
    }
    throw e;
  }
}

describe("requireUser choke point (API)", () => {
  it("disabled user → 403 account_disabled on the real /api/ocr route", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    await setDisabled(true);
    const { POST } = await import("@/app/api/ocr/route");
    const res = await POST(
      new Request("http://localhost:3056/api/ocr", {
        method: "POST",
        headers: { "x-scrimly-no-origin-test": "1" },
      }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "account_disabled" });
  });

  it("missing flag = allowed (default)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const { requireUser } = await import("@/lib/auth/route-guard");
    const result = await requireUser(new Request("http://localhost:3056/api/ocr"));
    expect(result.ok).toBe(true);
  });

  it("disabled → 403; re-enabled → works again, immediately", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const { requireUser } = await import("@/lib/auth/route-guard");
    await setDisabled(true);
    const denied = await requireUser(new Request("http://localhost:3056/api/ocr"));
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(403);
      expect(await denied.response.json()).toEqual({ error: "account_disabled" });
    }
    await setDisabled(false);
    const allowed = await requireUser(new Request("http://localhost:3056/api/ocr"));
    expect(allowed.ok).toBe(true);
  });
});

describe("requireUser choke point (pages/actions)", () => {
  it("disabled user → redirect to /login?disabled=1 (plain 'Account disabled' copy there)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    await setDisabled(true);
    const { requireUser } = await import("@/lib/auth/action-guard");
    try {
      await requireUser();
      expect.unreachable("requireUser should have redirected");
    } catch (e) {
      const digest = (e as { digest?: string }).digest ?? "";
      expect(digest).toContain("NEXT_REDIRECT");
      expect(digest).toContain("/login?disabled=1");
    }
  });

  it("enabled user → no redirect", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const { requireUser } = await import("@/lib/auth/action-guard");
    const user = await requireUser();
    expect(user.id).toBe(USER);
  });
});

describe("disable/enable admin API", () => {
  const noOrigin = { "x-scrimly-no-origin-test": "1" };

  function post(path: string, body: unknown, headers: Record<string, string> = noOrigin) {
    return import(path === "disable" ? "@/app/api/admin/tenants/disable/route" : "@/app/api/admin/tenants/enable/route").then(
      ({ POST }) =>
        postCatch404(() =>
          POST(
            new Request(`http://localhost:3056/api/admin/tenants/${path}`, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            }),
          ),
        ),
    );
  }

  it("non-admin → 404 (indistinguishable from a missing route)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const res = await post("disable", { userId: USER, reason: "x" });
    expect(res.status).toBe(404);
  });

  it("unauthenticated → 404", async () => {
    authedUser = null;
    const res = await post("disable", { userId: USER, reason: "x" });
    expect(res.status).toBe(404);
  });

  it("admin disables → flag row + audited admin.tenant.disable with actor/target", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const res = await post("disable", { userId: USER, reason: "tos violation" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const flags = await db.execute(
      sql`select flag from feature_flags where subject_id = ${USER}::uuid and flag = 'disabled'`,
    );
    expect(rowsOf<unknown>(flags)).toHaveLength(1);

    const audits = await db.execute(
      sql`select actor_user_id, effective_user_id, action, target_type, target_id, metadata
          from audit_log where action = 'admin.tenant.disable'`,
    );
    const rows = rowsOf<{
      actor_user_id: string;
      effective_user_id: string;
      action: string;
      target_type: string;
      target_id: string;
      metadata: { reason: string };
    }>(audits);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor_user_id: ADMIN,
      effective_user_id: ADMIN,
      action: "admin.tenant.disable",
      target_type: "user",
      target_id: USER,
      metadata: { reason: "tos violation" },
    });
  });

  it("bad body → 400; unknown user → 404", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    expect((await post("disable", { userId: "nope", reason: "x" })).status).toBe(400);
    expect((await post("disable", { userId: USER, reason: "" })).status).toBe(400);
    const ghost = "99999999-9999-9999-9999-999999999999";
    expect((await post("disable", { userId: ghost, reason: "x" })).status).toBe(404);
  });

  it("admin re-enables → flag gone + audited admin.tenant.enable", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    await setDisabled(true);
    const res = await post("enable", { userId: USER });
    expect(res.status).toBe(200);
    const flags = await db.execute(
      sql`select flag from feature_flags where subject_id = ${USER}::uuid and flag = 'disabled'`,
    );
    expect(rowsOf<unknown>(flags).length).toBe(0);
    const audits = await db.execute(
      sql`select actor_user_id, target_id from audit_log where action = 'admin.tenant.enable'`,
    );
    const rows = rowsOf<{ actor_user_id: string; target_id: string }>(audits);
    expect(rows).toEqual([{ actor_user_id: ADMIN, target_id: USER }]);
  });

  it("cross-origin disable probe → 404 like everything else admin", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const res = await post("disable", { userId: USER, reason: "x" }, {
      origin: "https://evil.example",
    });
    expect(res.status).toBe(404);
  });
});
