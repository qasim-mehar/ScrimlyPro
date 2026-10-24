import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

/**
 * M3 (7) suite: auth-event audit inserts + flags editor actions + audit
 * viewer filters.
 *
 *  - auditAuthEvent: the security-definer audit_auth_event() stores the
 *    actor from CLAIMS only; pre-auth events get a NULL actor; the action
 *    whitelist is enforced at the function level.
 *  - flags server actions: admin-only (404 uniformity), validation, audited
 *    admin.flag.set / admin.flag.delete.
 *  - getAuditRows: action-prefix and actor filtering.
 */
const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const USER = "bbbbbbbb-2222-2222-2222-222222222222";

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

let authedUser: { id: string; email: string | null } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(async () => authedUser),
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("Supabase env is not configured");
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let db: Db;
let cleanup: () => Promise<void>;

const adminGlobals = globalThis as unknown as {
  __scrimlyAdminSql?: unknown;
  __scrimlyAdminDb?: unknown;
  __scrimlyPgSql?: unknown;
};

beforeEach(async () => {
  const t = await testDb();
  db = t.db;
  cleanup = t.cleanup;
  process.env.SUPABASE_DB_URL = t.url;
  process.env.AUDIT_SALT = "test-audit-salt";
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;
  // The REAL withUserDb/getDb is used here (unmocked) so the security-definer
  // sink sees the true claims context; repoint the pooled client per test.
  adminGlobals.__scrimlyPgSql = undefined;

  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [USER, "user@test.dev"],
  ] as const) {
    await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);

  authedUser = null;
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;
  adminGlobals.__scrimlyPgSql = undefined;
  delete process.env.SUPABASE_DB_URL;
  delete process.env.AUDIT_SALT;
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

const REQ = new Request("http://localhost:3056/api/auth/login", { method: "POST" });

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe("auth-event audit (definer sink)", () => {
  it("authenticated event → actor from claims", async () => {
    const { auditAuthEvent } = await import("@/lib/audit/auth-events");
    await auditAuthEvent("auth.login", REQ, { userId: USER });

    const rows = rowsOf<{ actor_user_id: string; action: string }>(
      await db.execute(sql`select actor_user_id, action from audit_log where action = 'auth.login'`),
    );
    expect(rows).toEqual([{ actor_user_id: USER, action: "auth.login" }]);
  });

  it("pre-auth event (forgot) → NULL actor, row still recorded", async () => {
    const { auditAuthEvent } = await import("@/lib/audit/auth-events");
    await auditAuthEvent("auth.forgot", REQ);

    const rows = rowsOf<{ actor_user_id: string | null; action: string }>(
      await db.execute(sql`select actor_user_id, action from audit_log where action = 'auth.forgot'`),
    );
    expect(rows).toEqual([{ actor_user_id: null, action: "auth.forgot" }]);
  });

  it("non-whitelisted action is rejected by the definer and never stored", async () => {
    let saw = "";
    try {
      const { withUserDb } = await import("@/lib/db/user");
      await withUserDb({ sub: USER }, (userDb) =>
        userDb.execute(sql`select audit_auth_event('admin.tenant.disable', '{}', null)`),
      );
    } catch (e) {
      let cur: unknown = e;
      for (let i = 0; i < 4 && cur; i++) {
        saw += `${cur instanceof Error ? cur.message : String(cur)} | `;
        cur = (cur as { cause?: unknown }).cause;
      }
    }
    expect(saw).toMatch(/not permitted/);
    const rows = rowsOf<unknown>(await db.execute(sql`select 1 from audit_log`));
    expect(rows).toHaveLength(0);
  });

  it("reset event carries the verified user", async () => {
    const { auditAuthEvent } = await import("@/lib/audit/auth-events");
    await auditAuthEvent("auth.reset", REQ, { userId: USER });
    const rows = rowsOf<{ actor_user_id: string }>(
      await db.execute(sql`select actor_user_id from audit_log where action = 'auth.reset'`),
    );
    expect(rows).toEqual([{ actor_user_id: USER }]);
  });
});

describe("flags editor server actions", () => {
  it("non-admin → 404 (uniform with the rest of the admin surface)", async () => {
    authedUser = { id: USER, email: "user@test.dev" };
    const { setFlagAction } = await import("@/app/admin/flags/actions");
    expect(
      await digestOf(() =>
        setFlagAction(null, formData({ subjectType: "global", flag: "beta", value: "{}" })),
      ),
    ).toBe(NOT_FOUND_DIGEST);
  });

  it("admin sets a global flag → row + audited admin.flag.set", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { setFlagAction } = await import("@/app/admin/flags/actions");
    const result = await setFlagAction(
      null,
      formData({ subjectType: "global", flag: "maintenance_mode", value: '{"on":true}' }),
    );
    expect(result).toEqual({ ok: true });

    const flags = rowsOf<{ flag: string; subject_type: string }>(
      await db.execute(sql`select flag, subject_type from feature_flags`),
    );
    expect(flags).toEqual([{ flag: "maintenance_mode", subject_type: "global" }]);

    const audits = rowsOf<{ actor_user_id: string; action: string; metadata: Record<string, unknown> }>(
      await db.execute(sql`select actor_user_id, action, metadata from audit_log where action = 'admin.flag.set'`),
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].actor_user_id).toBe(ADMIN);
    expect(audits[0].metadata).toMatchObject({ flag: "maintenance_mode", subject_type: "global" });
  });

  it("user-scoped flag requires an existing subject; validation errors are explicit", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { setFlagAction } = await import("@/app/admin/flags/actions");
    const ghost = "99999999-9999-9999-9999-999999999999";
    expect(
      await setFlagAction(null, formData({ subjectType: "user", subjectId: ghost, flag: "x", value: "{}" })),
    ).toEqual({ ok: false, error: "subject user does not exist" });
    expect(
      await setFlagAction(null, formData({ subjectType: "user", subjectId: "not-a-uuid", flag: "x", value: "{}" })),
    ).toMatchObject({ ok: false });
    expect(
      await setFlagAction(null, formData({ subjectType: "global", flag: "BAD FLAG!", value: "{}" })),
    ).toMatchObject({ ok: false });
    expect(
      await setFlagAction(null, formData({ subjectType: "global", flag: "x", value: "[1,2]" })),
    ).toEqual({ ok: false, error: "value must be a JSON object" });
  });

  it("admin deletes a flag → row gone + audited admin.flag.delete", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { setFlagAction, deleteFlagAction } = await import("@/app/admin/flags/actions");
    await setFlagAction(null, formData({ subjectType: "global", flag: "temp", value: "{}" }));
    const id = rowsOf<{ id: string }>(
      await db.execute(sql`select id from feature_flags where flag = 'temp'`),
    )[0].id;
    const result = await deleteFlagAction(null, formData({ id }));
    expect(result).toEqual({ ok: true });
    expect(rowsOf<unknown>(await db.execute(sql`select 1 from feature_flags where flag = 'temp'`))).toHaveLength(0);
    const audits = rowsOf<{ action: string }>(
      await db.execute(sql`select action from audit_log where action = 'admin.flag.delete'`),
    );
    expect(audits).toHaveLength(1);
  });
});

describe("audit viewer filters", () => {
  it("action-prefix and actor filters", async () => {
    const { auditAuthEvent } = await import("@/lib/audit/auth-events");
    await auditAuthEvent("auth.login", REQ, { userId: USER });
    await auditAuthEvent("auth.signup", REQ, { userId: USER });
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    const { setFlagAction } = await import("@/app/admin/flags/actions");
    await setFlagAction(null, formData({ subjectType: "global", flag: "f1", value: "{}" }));

    const { getAuditRows } = await import("@/lib/admin/queries");
    const loginOnly = await getAuditRows({ actionPrefix: "auth.login" });
    expect(loginOnly.map((r) => r.action)).toEqual(["auth.login"]);
    const authAll = await getAuditRows({ actionPrefix: "auth." });
    expect(authAll.map((r) => r.action).sort()).toEqual(["auth.login", "auth.signup"]);
    const byActor = await getAuditRows({ actorUserId: USER });
    expect(byActor.every((r) => r.actorUserId === USER)).toBe(true);
    const flagRows = await getAuditRows({ actionPrefix: "admin.flag" });
    expect(flagRows.length).toBeGreaterThanOrEqual(1);
  });
});
