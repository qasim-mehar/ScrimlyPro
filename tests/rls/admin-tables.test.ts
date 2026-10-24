import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/helpers/pg";
import { withUserDbForTest } from "@/lib/db/user";
import type { Db } from "@/lib/db/client";

/**
 * M3 adversarial RLS suite (Lane C brief §6 — DB-layer half).
 *
 * Proven at the policy level against a real Postgres with RLS enabled+FORCED:
 *  - audit_log is append-only (no update/delete policy for ANY role — zero
 *    rows affected even for admin claims; foreign-actor inserts rejected).
 *  - feature_flags is admin-only readable/writable; users see nothing.
 *  - impersonation_sessions exposes rows only to involved parties/admins.
 *  - the M1 role-escalation guard still holds (guard_profile_role trigger).
 *  - is_user_disabled() (security definer) reflects the reserved kill-switch
 *    marker for the request path.
 *
 * RLS behavior notes the assertions encode:
 *  - a violating INSERT WITH CHECK raises 42501 (row-security violation);
 *  - UPDATE/DELETE under a non-matching USING policy filter silently affect
 *    zero rows — the append-only tables additionally have NO update/delete
 *    policies at all, so even admin claims mutate nothing.
 *
 * The admin/user fixture identities are real auth.users rows (the audit FKs
 * point there); claims are attached per-query via withUserDbForTest, exactly
 * like the M1 tenant-isolation suite.
 */
const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const USER = "bbbbbbbb-2222-2222-2222-222222222222";
const TARGET = "cccccccc-3333-3333-3333-333333333333";

const U = {
  flagRow: "dddddddd-4444-4444-4444-444444444444",
  impRow: "eeeeeeee-5555-5555-5555-555555555555",
  impAdminOk: "f0f0f0f0-6666-6666-6666-666666666666",
  killRow: "a0a0a0a0-7777-7777-7777-777777777777",
};

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
  // auth.users stand-ins (FK targets); the on_auth_user_created trigger
  // auto-creates each profile (role 'user'). Admin fixture promotes its
  // profile via the schema-owner client — outside RLS and outside the
  // guard trigger's 'authenticated' check. profiles lives in raw SQL
  // (migration 0002), not the drizzle schema.
  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [USER, "user@test.dev"],
    [TARGET, "target@test.dev"],
  ] as const) {
    await db.execute(
      sql`insert into auth.users (id, email) values (${id}, ${email})`,
    );
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
});

/** Full error-chain text of a rejected asUser() call (drizzle wraps the
 * Postgres error; the RLS/trigger detail lives in the cause). Catching HERE
 * is safe — the poisoned transaction has already been unwound by the time
 * withUserDb rejects. */
async function rejectionDetail(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "NO-REJECTION";
  } catch (e) {
    const parts: string[] = [];
    let cur: unknown = e;
    for (let i = 0; i < 4 && cur; i++) {
      parts.push(cur instanceof Error ? cur.message : String(cur));
      cur = (cur as { cause?: unknown }).cause;
    }
    return parts.join(" | ");
  }
}

function asUser<T>(user: string, fn: (userDb: Db) => Promise<T>): Promise<T> {
  return withUserDbForTest({ sub: user }, fn, db);
}

/** Rows affected by a data-changing statement under the caller's claims. */
async function mutationCount(
  userDb: Db,
  stmt: ReturnType<typeof sql>,
): Promise<number> {
  const res = (await userDb.execute(stmt)) as unknown as {
    count?: number;
    rowCount?: number;
  };
  return res.count ?? res.rowCount ?? 0;
}

/** Rows of a select under the caller's claims. */
async function selectRows<T>(userDb: Db, stmt: ReturnType<typeof sql>) {
  const res = (await userDb.execute(stmt)) as unknown as { rows?: T[] };
  return (Array.isArray(res) ? res : res.rows ?? []) as T[];
}

describe("audit_log — append-only", () => {
  it("authenticated user can insert a row with actor_user_id = own id", async () => {
    const n = await asUser(USER, (u) =>
      mutationCount(
        u,
        sql`insert into audit_log (id, actor_user_id, action) values (gen_random_uuid(), ${USER}::uuid, 'test.event')`,
      ),
    );
    expect(n).toBe(1);
  });

  it("authenticated user CANNOT insert a row attributing someone else", async () => {
    const msg = await rejectionDetail(() =>
      asUser(USER, (u) =>
        u.execute(
          sql`insert into audit_log (id, actor_user_id, action) values (gen_random_uuid(), ${ADMIN}::uuid, 'spoof')`,
        ),
      ),
    );
    expect(msg).toMatch(/row-level security policy for table "audit_log"/);
  });

  it("UPDATE affects zero rows for user AND admin claims (no policy exists)", async () => {
    await asUser(USER, (u) =>
      u.execute(
        sql`insert into audit_log (id, actor_user_id, action) values (gen_random_uuid(), ${USER}::uuid, 'test.event')`,
      ),
    );
    for (const claims of [USER, ADMIN]) {
      const n = await asUser(claims, (u) =>
        mutationCount(u, sql`update audit_log set action = 'tampered'`),
      );
      expect(n).toBe(0);
    }
  });

  it("DELETE affects zero rows for user AND admin claims (no policy exists)", async () => {
    await asUser(USER, (u) =>
      u.execute(
        sql`insert into audit_log (id, actor_user_id, action) values (gen_random_uuid(), ${USER}::uuid, 'test.event')`,
      ),
    );
    for (const claims of [USER, ADMIN]) {
      const n = await asUser(claims, (u) =>
        mutationCount(u, sql`delete from audit_log`),
      );
      expect(n).toBe(0);
    }
    // The row survived both attempts (service client sees it).
    const rows = await selectRows<{ n: number }>(
      db,
      sql`select count(*)::int as n from audit_log`,
    );
    expect(rows[0].n).toBe(1);
  });

  it("select: plain user sees nothing, admin sees rows", async () => {
    await asUser(USER, (u) =>
      u.execute(
        sql`insert into audit_log (id, actor_user_id, action) values (gen_random_uuid(), ${USER}::uuid, 'test.event')`,
      ),
    );
    const seenByUser = await asUser(USER, (u) =>
      selectRows(u, sql`select action from audit_log`),
    );
    expect(seenByUser).toHaveLength(0);
    const seenByAdmin = await asUser(ADMIN, (u) =>
      selectRows<{ action: string }>(u, sql`select action from audit_log`),
    );
    expect(seenByAdmin).toEqual([{ action: "test.event" }]);
  });
});

describe("feature_flags — admin-only", () => {
  async function seedFlag() {
    await db.insert(schema.featureFlags).values({
      id: U.flagRow,
      subjectType: "user",
      subjectId: TARGET,
      flag: "beta_graphic",
      value: { on: true },
    });
  }

  it("plain user: select sees nothing; insert/update/delete rejected or no-op", async () => {
    await seedFlag();
    const sel = await asUser(USER, (u) =>
      selectRows(u, sql`select * from feature_flags`),
    );
    expect(sel).toHaveLength(0);
    const msg = await rejectionDetail(() =>
      asUser(USER, (u) =>
        u.execute(
          sql`insert into feature_flags (id, subject_type, flag) values (gen_random_uuid(), 'user', 'x')`,
        ),
      ),
    );
    expect(msg).toMatch(/row-level security policy for table "feature_flags"/);
    // UPDATE/DELETE: USING filter misses → zero rows, silently.
    expect(
      await asUser(USER, (u) =>
        mutationCount(u, sql`update feature_flags set value = '{}'`),
      ),
    ).toBe(0);
    expect(
      await asUser(USER, (u) =>
        mutationCount(u, sql`delete from feature_flags`),
      ),
    ).toBe(0);
  });

  it("admin claims can read and write flags", async () => {
    await seedFlag();
    await asUser(ADMIN, async (u) => {
      const sel = await selectRows<{ flag: string }>(
        u,
        sql`select flag from feature_flags where subject_id = ${TARGET}::uuid`,
      );
      expect(sel).toEqual([{ flag: "beta_graphic" }]);
      expect(
        await mutationCount(
          u,
          sql`insert into feature_flags (id, subject_type, subject_id, flag) values (gen_random_uuid(), 'user', ${TARGET}::uuid, 'y')`,
        ),
      ).toBe(1);
      expect(
        await mutationCount(
          u,
          sql`update feature_flags set value = '{}' where flag = 'y'`,
        ),
      ).toBe(1);
      expect(
        await mutationCount(u, sql`delete from feature_flags where flag = 'y'`),
      ).toBe(1);
    });
  });
});

describe("impersonation_sessions — visibility + write scoping", () => {
  async function seedImpersonation() {
    await db.insert(schema.impersonationSessions).values({
      id: U.impRow,
      adminUserId: ADMIN,
      targetUserId: TARGET,
      targetEmail: "target@test.dev",
      reason: "support ticket #42",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  }

  it("uninvolved user sees nothing; admin and target can read", async () => {
    await seedImpersonation();
    const outsider = await asUser(USER, (u) =>
      selectRows(u, sql`select id from impersonation_sessions`),
    );
    expect(outsider).toHaveLength(0);
    for (const who of [ADMIN, TARGET]) {
      const seen = await asUser(who, (u) =>
        selectRows(u, sql`select id from impersonation_sessions`),
      );
      expect(seen).toHaveLength(1);
    }
  });

  it("insert requires admin_user_id = auth.uid() AND the admin role", async () => {
    // Non-admin naming themselves admin of the row → WITH CHECK rejects.
    const msg = await rejectionDetail(() =>
      asUser(USER, (u) =>
        u.execute(
          sql`insert into impersonation_sessions (id, admin_user_id, target_user_id, target_email, reason, expires_at)
              values (gen_random_uuid(), ${USER}::uuid, ${TARGET}::uuid, 't@t.dev', 'nope', now() + interval '5 minutes')`,
        ),
      ),
    );
    expect(msg).toMatch(/row-level security policy for table "impersonation_sessions"/);
    // Admin inserting a row naming themselves → allowed.
    expect(
      await asUser(ADMIN, (u) =>
        mutationCount(
          u,
          sql`insert into impersonation_sessions (id, admin_user_id, target_user_id, target_email, reason, expires_at)
              values (${U.impAdminOk}::uuid, ${ADMIN}::uuid, ${TARGET}::uuid, 't@t.dev', 'ok', now() + interval '5 minutes')`,
        ),
      ),
    ).toBe(1);
  });

  it("target cannot revoke their own impersonation row", async () => {
    await seedImpersonation();
    expect(
      await asUser(TARGET, (u) =>
        mutationCount(
          u,
          sql`update impersonation_sessions set revoked_at = now()`,
        ),
      ),
    ).toBe(0);
  });
});

describe("M1 escalation guard still holds (M3 proof)", () => {
  it("authenticated user cannot change profiles.role (guard_profile_role)", async () => {
    const msg = await rejectionDetail(() =>
      asUser(USER, (u) =>
        u.execute(sql`update profiles set role = 'admin' where id = ${USER}::uuid`),
      ),
    );
    expect(msg).toMatch(/managed by admins only/);
    // Role unchanged at the service layer.
    const rows = await selectRows<{ role: string }>(
      db,
      sql`select role from profiles where id = ${USER}::uuid`,
    );
    expect(rows[0].role).toBe("user");
  });

  it("profiles update policy is self-rows only: a user cannot touch someone else's profile", async () => {
    // USING filter misses → zero rows, no error (trigger never reached).
    expect(
      await asUser(USER, (u) =>
        mutationCount(
          u,
          sql`update profiles set role = 'admin' where id = ${ADMIN}::uuid`,
        ),
      ),
    ).toBe(0);
    const rows = await selectRows<{ role: string }>(
      db,
      sql`select role from profiles where id = ${ADMIN}::uuid`,
    );
    expect(rows[0].role).toBe("admin");
  });
});

describe("is_user_disabled() — kill-switch probe", () => {
  it("false by default, true once the reserved disabled marker exists", async () => {
    const before = await asUser(USER, (u) =>
      selectRows<{ d: boolean }>(
        u,
        sql`select is_user_disabled(${USER}::uuid) as d`,
      ),
    );
    expect(before[0].d).toBe(false);

    await db.insert(schema.featureFlags).values({
      id: U.killRow,
      subjectType: "user",
      subjectId: USER,
      flag: "disabled",
      value: { reason: "abuse" },
    });

    const after = await asUser(USER, (u) =>
      selectRows<{ d: boolean }>(
        u,
        sql`select is_user_disabled(${USER}::uuid) as d`,
      ),
    );
    expect(after[0].d).toBe(true);
  });
});
