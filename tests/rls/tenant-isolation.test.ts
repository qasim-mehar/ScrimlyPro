import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/helpers/pg";
import { ensureOrg } from "@/tests/helpers/orgs";
// Lane A's C3 test-DI split: the throwaway per-test client is injected —
// the production getDb() path stays out of tests.
import { withUserDbForTest } from "@/lib/db/user";
import type { Db } from "@/lib/db/client";

/**
 * RLS adversarial suite (G2) — owner vs attacker claims across every tenant
 * table, run through withUserDb (role switch + jwt claims) against the
 * throwaway per-test database. On local Postgres the auth-shim migration
 * provides auth.uid(); on a hosted Supabase project the same suite exercises
 * the real auth schema.
 */
const OWNER = "11111111-1111-1111-1111-111111111111";
const ATTACKER = "22222222-2222-2222-2222-222222222222";

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
});

afterAll(async () => {
  await cleanup?.();
});

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10 },
  default_placement_points: 0,
};

async function seedAsAdmin(): Promise<string> {
  const sessionId = "rls-session-1";
  await db.insert(schema.sessions).values({
    id: sessionId,
    userId: OWNER,
    // M2: tenancy is org-scoped — the seed owner gets their Personal org.
    orgId: await ensureOrg(db, OWNER),
    name: "RLS Session",
    plannedMatches: 2,
    teamCount: 4,
    scoringRules: RULES,
    createdAt: new Date().toISOString(),
  });
  await db.insert(schema.teams).values({ id: "rls-team-1", sessionId, name: "Alpha" });
  await db.insert(schema.rosters).values({ teamId: "rls-team-1", playerNorm: "p1", displayName: "P1" });
  await db.insert(schema.matches).values({
    id: "rls-match-1",
    sessionId,
    matchNo: 1,
    createdAt: new Date().toISOString(),
  });
  await db.insert(schema.matchResults).values({
    id: "rls-result-1",
    matchId: "rls-match-1",
    teamId: "rls-team-1",
    placement: 1,
    kills: 5,
    placementPoints: 10,
    players: [{ name: "P1", kills: 5 }],
  });
  await db.insert(schema.mvpLists).values({ sessionId, entries: [], locked: false });
  return sessionId;
}


function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return (res as { rows?: T[] }).rows ?? [];
}

function asUser<T>(user: string, fn: (userDb: Db) => Promise<T>): Promise<T> {
  return withUserDbForTest({ sub: user }, fn, db);
}

async function countAs(user: string, table: string): Promise<number> {
  return asUser(user, async (userDb) => {
    const res = await userDb.execute(sql`select count(*)::int as n from ${sql.identifier(table)}`);
    const rows = rowsOf<{ n: number }>(res);
    return rows[0]?.n ?? 0;
  });
}

describe("RLS tenant isolation (owner vs attacker)", () => {
  let sessionId: string;

  beforeEach(async () => {
    sessionId = await seedAsAdmin();
  });

  const TENANT_TABLES = [
    "sessions",
    "teams",
    "rosters",
    "matches",
    "match_results",
    "mvp_lists",
  ] as const;

  it("owner sees exactly their rows in every tenant table", async () => {
    for (const table of TENANT_TABLES) {
      expect(await countAs(OWNER, table)).toBe(1);
    }
  });

  it("attacker sees zero rows in every tenant table (select blocked)", async () => {
    for (const table of TENANT_TABLES) {
      expect(await countAs(ATTACKER, table)).toBe(0);
    }
  });

  it("raw select with NO where clause returns only the claims owner's rows", async () => {
    // Second session owned by the attacker.
    await db.insert(schema.sessions).values({
      id: "rls-session-2",
      userId: ATTACKER,
      orgId: await ensureOrg(db, ATTACKER),
      name: "Attacker Session",
      plannedMatches: 2,
      teamCount: 4,
      scoringRules: RULES,
      createdAt: new Date().toISOString(),
    });
    const ownerRows = await asUser(OWNER, async (userDb) => {
      const r = await userDb.execute(sql`select id from sessions`);
      return rowsOf<{ id: string }>(r);
    });
    expect(ownerRows.map((r) => r.id)).toEqual([sessionId]);
  });

  it("attacker cannot INSERT into another tenant's children (WITH CHECK)", async () => {
    await expect(
      asUser(ATTACKER, async (userDb) => {
        await userDb
          .insert(schema.teams)
          .values({ id: "evil-team", sessionId, name: "Evil" });
      }),
    ).rejects.toThrow();
    // And the row was NOT written (withUserDb rolled back).
    const rows = await db.execute(sql`select id from teams where id = ${"evil-team"}`);
    expect(rowsOf<{ id: string }>(rows)).toEqual([]);
  });

  it("attacker cannot INSERT a session into a foreign org (WITH CHECK)", async () => {
    // M2 tenancy: the tenant root is the org, not the raw user_id (kept as an
    // audit column). Spoofing tenancy now means claiming a foreign org_id —
    // the WITH CHECK must reject it and write nothing.
    const ownerOrg = await ensureOrg(db, OWNER);
    await expect(
      asUser(ATTACKER, async (userDb) => {
        await userDb.insert(schema.sessions).values({
          id: "evil-session",
          userId: ATTACKER,
          orgId: ownerOrg, // spoofed org membership — WITH CHECK must reject
          name: "Evil",
          plannedMatches: 2,
          teamCount: 4,
          scoringRules: RULES,
          createdAt: new Date().toISOString(),
        });
      }),
    ).rejects.toThrow();
    const rows = await db.execute(sql`select id from sessions where id = ${"evil-session"}`);
    expect(rowsOf<{ id: string }>(rows)).toEqual([]);
  });

  it("attacker's UPDATE/DELETE silently affect zero rows (USING filter)", async () => {
    const updated = await asUser(ATTACKER, async (userDb) => {
      return userDb
        .update(schema.sessions)
        .set({ name: "HACKED" })
        .where(sql`sessions.id = ${sessionId}`)
        .returning({ id: schema.sessions.id });
    });
    expect(updated).toEqual([]);

    const deleted = await asUser(ATTACKER, async (userDb) => {
      return userDb
        .delete(schema.sessions)
        .where(sql`sessions.id = ${sessionId}`)
        .returning({ id: schema.sessions.id });
    });
    expect(deleted).toEqual([]);

    // And nothing actually changed or vanished.
    const rows = await db.execute(
      sql`select name from sessions where id = ${"rls-session-1"}`,
    );
    expect(rowsOf<{ name: string }>(rows)[0]?.name).toBe("RLS Session");
  });

  it("profiles: self-select only; role escalation blocked for authenticated", async () => {
    // Create users directly in the auth stand-in → trigger creates profiles.
    // ensureOrg (seed) already created the auth.users stand-ins — idempotent.
    await db.execute(
      sql`insert into auth.users (id, email) values (${OWNER}, ${"owner@test.dev"}) on conflict (id) do nothing`,
    );
    await db.execute(
      sql`insert into auth.users (id, email) values (${ATTACKER}, ${"attacker@test.dev"}) on conflict (id) do nothing`,
    );

    // Owner sees exactly their own profile.
    expect(await countAs(OWNER, "profiles")).toBe(1);

    // authenticated cannot self-elevate (guard trigger on their own row).
    // Drizzle wraps the PG error, so assert the rejection plus that the role
    // was NOT changed — the security property is "escalation impossible".
    await expect(
      asUser(OWNER, async (userDb) => {
        await userDb.execute(
          sql`update profiles set role = 'admin' where id = ${OWNER}`,
        );
      }),
    ).rejects.toThrow();
    const prof = await db.execute(
      sql`select role from profiles where id = ${OWNER}`,
    );
    const profRows = rowsOf<{ role: string }>(prof);
    expect(profRows[0]?.role).toBe("user");
  });
});
