import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/helpers/pg";
import { acceptInvite } from "@/lib/orgs/invites";
import { hashToken } from "@/lib/orgs/tokens";
import { createShareLink } from "@/lib/share/links";
import { withUserDbForTest } from "@/lib/db/user";
import type { Db } from "@/lib/db/client";

/**
 * M2 RLS adversarial suite — org isolation across the new tables, written
 * BEFORE the 0010–0012 migrations were approved (red→green, M1 G2 pattern).
 *
 * Actors:
 *   OWNER_A  — creates org A, owns sessionA
 *   ADMIN_A  — admin of org A
 *   MEMBER_A — plain member of org A (can collaborate, cannot admin)
 *   OWNER_B  — attacker: owns org B + sessionB, zero grants on org A
 *
 * Every assertion runs through withUserDb (role switch + jwt claims) on a
 * throwaway database, so the suite is a direct proof of the policy set that
 * ships in migration 0010.
 */
const OWNER_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const ADMIN_A = "aaaaaaaa-0000-4000-8000-00000000000b";
const MEMBER_A = "aaaaaaaa-0000-4000-8000-00000000000c";
const OWNER_B = "bbbbbbbb-0000-4000-8000-00000000000b";

const ORG_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const ORG_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const SESSION_A = "rls-session-a";
const SESSION_B = "rls-session-b";

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10 },
  default_placement_points: 0,
};

let db: Db;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
});

afterAll(async () => {
  await cleanup?.();
});

async function seed(): Promise<void> {
  // Auth stand-in users (profiles created by the M1 trigger).
  for (const [id, email] of [
    [OWNER_A, "owner-a@test.dev"],
    [ADMIN_A, "admin-a@test.dev"],
    [MEMBER_A, "member-a@test.dev"],
    [OWNER_B, "owner-b@test.dev"],
  ] as const) {
    await db.execute(
      sql`insert into auth.users (id, email) values (${id}, ${email})`,
    );
  }

  await db.insert(schema.organizations).values([
    { id: ORG_A, name: "Org A", slug: "u-aaaaaaaa", createdBy: OWNER_A },
    { id: ORG_B, name: "Org B", slug: "u-bbbbbbbb", createdBy: OWNER_B },
  ]);
  await db.insert(schema.orgMembers).values([
    { orgId: ORG_A, userId: OWNER_A, role: "owner" },
    { orgId: ORG_A, userId: ADMIN_A, role: "admin" },
    { orgId: ORG_A, userId: MEMBER_A, role: "member" },
    { orgId: ORG_B, userId: OWNER_B, role: "owner" },
  ]);
  // Quota rows for both orgs are minted by the 0014 bootstrap trigger on the
  // organizations INSERT above (org_quotas has no tenant write policy).
  await db.insert(schema.sessions).values([
    {
      id: SESSION_A,
      userId: OWNER_A,
      orgId: ORG_A,
      name: "Org A Scrim",
      plannedMatches: 2,
      teamCount: 4,
      scoringRules: RULES,
    },
    {
      id: SESSION_B,
      userId: OWNER_B,
      orgId: ORG_B,
      name: "Org B Scrim",
      plannedMatches: 2,
      teamCount: 4,
      scoringRules: RULES,
    },
  ]);
  // One pending invite for org A and one share link for sessionA — both
  // admin-managed rows the attacker must never see or touch.
  await db.insert(schema.orgInvites).values({
    id: "aaaaaaaa-0000-4000-8000-00000000a001",
    orgId: ORG_A,
    role: "member",
    tokenHash: "hash-invite-a1",
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    createdBy: ADMIN_A,
  });
  await db.insert(schema.shareLinks).values({
    id: "aaaaaaaa-0000-4000-8000-00000000a002",
    sessionId: SESSION_A,
    tokenHash: "hash-share-a1",
    createdBy: MEMBER_A,
  });
}

function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return (res as { rows?: T[] }).rows ?? [];
}

function asUser<T>(user: string, fn: (userDb: Db) => Promise<T>): Promise<T> {
  return withUserDbForTest({ sub: user }, fn, db);
}

async function countWhere(
  user: string,
  table: string,
  scope: ReturnType<typeof sql>,
): Promise<number> {
  return asUser(user, async (userDb) => {
    const res = await userDb.execute(
      sql`select count(*)::int as n from ${sql.identifier(table)} where ${scope}`,
    );
    return rowsOf<{ n: number }>(res)[0]?.n ?? 0;
  });
}

describe("M2 RLS org isolation", () => {
  beforeEach(seed);

  it("members see their org's rows; the attacker sees zero org A rows", async () => {
    // Org-A-scoped counts (the attacker legitimately sees their OWN org B).
    const ORG_A_SCOPED: Record<string, ReturnType<typeof sql>> = {
      organizations: sql`id = ${ORG_A}`,
      org_members: sql`org_id = ${ORG_A}`,
      org_quotas: sql`org_id = ${ORG_A}`,
      sessions: sql`org_id = ${ORG_A}`,
      share_links: sql`session_id = ${SESSION_A}`,
    };
    for (const [table, scope] of Object.entries(ORG_A_SCOPED)) {
      expect(
        await countWhere(OWNER_A, table, scope),
        `owner sees ${table}`,
      ).toBeGreaterThan(0);
      expect(
        await countWhere(MEMBER_A, table, scope),
        `member sees ${table}`,
      ).toBeGreaterThan(0);
      expect(
        await countWhere(OWNER_B, table, scope),
        `attacker sees ${table}`,
      ).toBe(0);
    }

    // org_invites are admin-managed: admin+ sees them; plain members and the
    // attacker see none (invitees never read rows — acceptance is definer-mediated).
    for (const [user, expected] of [
      [OWNER_A, 1],
      [ADMIN_A, 1],
      [MEMBER_A, 0],
      [OWNER_B, 0],
    ] as const) {
      expect(
        await countWhere(user, "org_invites", sql`org_id = ${ORG_A}`),
        `invites visible to ${user}`,
      ).toBe(expected);
    }
  });

  it("attacker's UPDATE/DELETE on org A rows silently affect zero rows", async () => {
    const updated = await asUser(OWNER_B, (userDb) =>
      userDb
        .update(schema.sessions)
        .set({ name: "HACKED" })
        .where(sql`sessions.id = ${SESSION_A}`)
        .returning({ id: schema.sessions.id }),
    );
    expect(updated).toEqual([]);

    const deleted = await asUser(OWNER_B, (userDb) =>
      userDb
        .delete(schema.organizations)
        .where(sql`organizations.id = ${ORG_A}`)
        .returning({ id: schema.organizations.id }),
    );
    expect(deleted).toEqual([]);
    const name = await db.execute(
      sql`select name from sessions where id = ${SESSION_A}`,
    );
    expect(rowsOf<{ name: string }>(name)[0]?.name).toBe("Org A Scrim");
  });

  it("attacker cannot INSERT into org A (WITH CHECK on every new table)", async () => {
    // organizations: created_by spoof
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb.insert(schema.organizations).values({
          id: "cccccccc-0000-4000-8000-00000000000c",
          name: "Evil",
          slug: "u-evilaaa",
          createdBy: OWNER_A,
        }),
      ),
    ).rejects.toThrow();

    // org_members: self-grant into org A
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb
          .insert(schema.orgMembers)
          .values({ orgId: ORG_A, userId: OWNER_B, role: "owner" }),
      ),
    ).rejects.toThrow();

    // org_invites
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb.insert(schema.orgInvites).values({
          id: "dddddddd-0000-4000-8000-00000000000d",
          orgId: ORG_A,
          role: "member",
          tokenHash: "hash-evil",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          createdBy: OWNER_B,
        }),
      ),
    ).rejects.toThrow();

    // share_links for org A's session
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb.insert(schema.shareLinks).values({
          id: "eeeeeeee-0000-4000-8000-00000000000e",
          sessionId: SESSION_A,
          tokenHash: "hash-share-evil",
          createdBy: OWNER_B,
        }),
      ),
    ).rejects.toThrow();

    // sessions into org A
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb.insert(schema.sessions).values({
          id: "evil-session",
          userId: OWNER_B,
          orgId: ORG_A,
          name: "Evil",
          plannedMatches: 2,
          teamCount: 4,
          scoringRules: RULES,
        }),
      ),
    ).rejects.toThrow();

    // usage_events into org A (spoofed user_id must also fail)
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb.insert(schema.usageEvents).values({
          id: "ffffffff-0000-4000-8000-00000000000f",
          orgId: ORG_A,
          userId: MEMBER_A,
        }),
      ),
    ).rejects.toThrow();
  });

  it("org_id spoofing is rejected: member of A cannot write into org B", async () => {
    await expect(
      asUser(MEMBER_A, (userDb) =>
        userDb.insert(schema.sessions).values({
          id: "spoof-session",
          userId: MEMBER_A,
          orgId: ORG_B,
          name: "Spoof",
          plannedMatches: 2,
          teamCount: 4,
          scoringRules: RULES,
        }),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(MEMBER_A, (userDb) =>
        userDb.insert(schema.usageEvents).values({
          id: "aaaaaaaa-0000-4000-8000-00000000aaa1",
          orgId: ORG_B,
          userId: MEMBER_A,
        }),
      ),
    ).rejects.toThrow();
  });

  it("invite INSERT requires admin+; share_links INSERT requires membership", async () => {
    // plain member cannot mint invites
    await expect(
      asUser(MEMBER_A, (userDb) =>
        userDb.insert(schema.orgInvites).values({
          id: "aaaaaaaa-0000-4000-8000-00000000aaa2",
          orgId: ORG_A,
          role: "admin",
          tokenHash: "hash-member-invite",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          createdBy: MEMBER_A,
        }),
      ),
    ).rejects.toThrow();

    // admin can (positive control)
    await asUser(ADMIN_A, (userDb) =>
      userDb.insert(schema.orgInvites).values({
        id: "aaaaaaaa-0000-4000-8000-00000000aaa3",
        orgId: ORG_A,
        role: "member",
        tokenHash: "hash-admin-invite",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        createdBy: ADMIN_A,
      }),
    );

    // member CAN create a share link for their org's session (member+ share)
    await asUser(MEMBER_A, (userDb) =>
      userDb.insert(schema.shareLinks).values({
        id: "aaaaaaaa-0000-4000-8000-00000000aaa4",
        sessionId: SESSION_A,
        tokenHash: "hash-share-member",
        createdBy: MEMBER_A,
      }),
    );
  });

  it("plain members cannot mutate memberships, invites, or quotas (admin-only)", async () => {
    // USING-filtered mutations silently affect zero rows (M1 pattern) — the
    // security property is "nothing changed", asserted per statement.
    const promoted = await asUser(MEMBER_A, (userDb) =>
      userDb
        .update(schema.orgMembers)
        .set({ role: "owner" })
        .where(
          sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${MEMBER_A}`,
        )
        .returning({ role: schema.orgMembers.role }),
    );
    expect(promoted).toEqual([]);

    const purgedInvites = await asUser(MEMBER_A, (userDb) =>
      userDb
        .delete(schema.orgInvites)
        .where(sql`org_invites.org_id = ${ORG_A}`)
        .returning({ id: schema.orgInvites.id }),
    );
    expect(purgedInvites).toEqual([]);

    const quotaRaise = await asUser(MEMBER_A, (userDb) =>
      userDb
        .update(schema.orgQuotas)
        .set({ maxSessions: 1_000_000 })
        .where(sql`org_quotas.org_id = ${ORG_A}`)
        .returning({ maxSessions: schema.orgQuotas.maxSessions }),
    );
    expect(quotaRaise).toEqual([]);

    const removed = await asUser(MEMBER_A, (userDb) =>
      userDb
        .delete(schema.orgMembers)
        .where(
          sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${ADMIN_A}`,
        )
        .returning({ userId: schema.orgMembers.userId }),
    );
    expect(removed).toEqual([]);

    // ...and nothing actually changed.
    const roles = await db.execute(
      sql`select user_id, role from org_members where org_id = ${ORG_A} order by role`,
    );
    expect(rowsOf<{ user_id: string; role: string }>(roles)).toHaveLength(3);
    const quota = await db.execute(
      sql`select max_sessions from org_quotas where org_id = ${ORG_A}`,
    );
    expect(rowsOf<{ max_sessions: number }>(quota)[0]?.max_sessions).toBe(100);
  });

  it("quota rows are platform-owned: no principal can raise or mint one (B-1)", async () => {
    // The 0010 owner INSERT/UPDATE policies are gone (0014): raising a limit
    // is a platform-side SQL operation. UPDATE is USING-filtered (zero rows);
    // INSERT with no policy is an outright error.
    for (const actor of [OWNER_A, ADMIN_A]) {
      const raised = await asUser(actor, (userDb) =>
        userDb
          .update(schema.orgQuotas)
          .set({ maxSessions: 1_000_000, monthlyOcrCalls: 1_000_000 })
          .where(sql`org_quotas.org_id = ${ORG_A}`)
          .returning({ maxSessions: schema.orgQuotas.maxSessions }),
      );
      expect(raised, `${actor} UPDATE org_quotas`).toEqual([]);

      await expect(
        asUser(actor, (userDb) =>
          userDb.insert(schema.orgQuotas).values({ orgId: ORG_A }),
        ),
        `${actor} INSERT org_quotas`,
      ).rejects.toThrow();
    }

    // ...and nothing actually changed (superuser read).
    const quota = await db.execute(
      sql`select max_sessions, monthly_ocr_calls from org_quotas where org_id = ${ORG_A}`,
    );
    expect(rowsOf<{ max_sessions: number; monthly_ocr_calls: number }>(quota)[0]).toEqual({
      max_sessions: 100,
      monthly_ocr_calls: 300,
    });
  });

  it("org_members invariants live in RLS: no owner-grant or owner-row touch below owner (B-3)", async () => {
    // Admin self-promote to owner: USING passes (own non-owner row) but the
    // WITH CHECK refuses the new role — Postgres rejects the statement with
    // 42501 outright.
    await expect(
      asUser(ADMIN_A, (userDb) =>
        userDb
          .update(schema.orgMembers)
          .set({ role: "owner" })
          .where(
            sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${ADMIN_A}`,
          )
          .returning({ role: schema.orgMembers.role }),
      ),
    ).rejects.toThrow(); // 42501 new row violates row-level security policy

    // Admin demotes the owner: USING refuses (old.role='owner').
    const demoted = await asUser(ADMIN_A, (userDb) =>
      userDb
        .update(schema.orgMembers)
        .set({ role: "member" })
        .where(
          sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${OWNER_A}`,
        )
        .returning({ role: schema.orgMembers.role }),
    );
    expect(demoted).toEqual([]);

    // Admin deletes the owner's row: USING refuses the same way.
    const deleted = await asUser(ADMIN_A, (userDb) =>
      userDb
        .delete(schema.orgMembers)
        .where(
          sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${OWNER_A}`,
        )
        .returning({ userId: schema.orgMembers.userId }),
    );
    expect(deleted).toEqual([]);

    // Positive controls: admins still manage non-owner rows; the owner
    // still grants admin. (Own-role drop admin→member is allowed — it is
    // not an escalation.)
    const demotedSelf = await asUser(ADMIN_A, (userDb) =>
      userDb
        .update(schema.orgMembers)
        .set({ role: "member" })
        .where(
          sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${ADMIN_A}`,
        )
        .returning({ role: schema.orgMembers.role }),
    );
    expect(demotedSelf).toEqual([{ role: "member" }]);

    await asUser(OWNER_A, (userDb) =>
      userDb
        .update(schema.orgMembers)
        .set({ role: "admin" })
        .where(
          sql`org_members.org_id = ${ORG_A} and org_members.user_id = ${MEMBER_A}`,
        ),
    );

    const roles = await db.execute(
      sql`select user_id, role from org_members where org_id = ${ORG_A} order by user_id`,
    );
    expect(rowsOf<{ user_id: string; role: string }>(roles)).toEqual([
      { user_id: OWNER_A, role: "owner" },
      { user_id: ADMIN_A, role: "member" },
      { user_id: MEMBER_A, role: "admin" },
    ]);
  });

  it("invite roles are DB-bounded: 'owner' is never invitable (B-2)", async () => {
    // Raw SQL on purpose: the drizzle column type already forbids 'owner' —
    // this proves the DATABASE (org_invites_role_check, 0014) refuses it too,
    // even for a principal the RLS insert policy would allow.
    await expect(
      asUser(OWNER_A, (userDb) =>
        userDb.execute(
          sql`insert into org_invites (id, org_id, role, token_hash, expires_at, created_by)
              values ('aaaaaaaa-0000-4000-8000-00000000aaa6', ${ORG_A}, 'owner',
                      'hash-owner-invite', now() + interval '1 day', ${OWNER_A})`,
        ),
      ),
    ).rejects.toThrow();

    const roles = await db.execute(
      sql`select role from org_invites where org_id = ${ORG_A}`,
    );
    expect(rowsOf<{ role: string }>(roles).map((r) => r.role)).toEqual([
      "member",
    ]);
  });

  it("members can collaborate: MEMBER_A inserts a match into org A's session", async () => {
    await asUser(MEMBER_A, (userDb) =>
      userDb.insert(schema.teams).values({
        id: "member-team",
        sessionId: SESSION_A,
        name: "Added By Member",
      }),
    );
  });

  it("org bootstrap: creator may self-join as owner; nobody else can", async () => {
    const NEW_ORG = "dddddddd-0000-4000-8000-00000000000a";
    await asUser(MEMBER_A, async (userDb) => {
      await userDb.insert(schema.organizations).values({
        id: NEW_ORG,
        name: "Member's Own",
        slug: "u-memberaa",
        createdBy: MEMBER_A,
      });
      await userDb
        .insert(schema.orgMembers)
        .values({ orgId: NEW_ORG, userId: MEMBER_A, role: "owner" });
    });

    // Attacker self-joining as owner of someone else's org is rejected.
    await expect(
      asUser(OWNER_B, (userDb) =>
        userDb
          .insert(schema.orgMembers)
          .values({ orgId: NEW_ORG, userId: OWNER_B, role: "owner" }),
      ),
    ).rejects.toThrow();
  });

  it("usage log is append-only: no UPDATE/DELETE policy exists (default deny)", async () => {
    const eventId = "aaaaaaaa-0000-4000-8000-00000000aaa5";
    await db.insert(schema.usageEvents).values({
      id: eventId,
      orgId: ORG_A,
      userId: MEMBER_A,
    });
    const updated = await asUser(MEMBER_A, (userDb) =>
      userDb
        .update(schema.usageEvents)
        .set({ kind: "tampered" })
        .where(sql`usage_events.id = ${eventId}`)
        .returning({ kind: schema.usageEvents.kind }),
    );
    expect(updated).toEqual([]);

    const deleted = await asUser(MEMBER_A, (userDb) =>
      userDb
        .delete(schema.usageEvents)
        .where(sql`usage_events.id = ${eventId}`)
        .returning({ id: schema.usageEvents.id }),
    );
    expect(deleted).toEqual([]);

    const rows = await db.execute(
      sql`select kind from usage_events where id = ${eventId}`,
    );
    expect(rowsOf<{ kind: string }>(rows)[0]?.kind).toBe("ocr");
  });
});

/**
 * SECURITY DEFINER discipline (B-2, wave1(4b) — tests-only: the definer
 * signatures were already claims-derived on the lane tip, so the commit adds
 * the adversarial proofs the brief requires).
 */
describe("SECURITY DEFINER discipline (B-2, wave1(4b))", () => {
  beforeEach(seed);

  it("accept_org_invite takes ONLY (token_hash) — no forged-parameter surface", async () => {
    // drizzle wraps driver errors ("Failed query: ...") — the Postgres
    // message is on .cause.
    const err = await db
      .execute(sql`select public.accept_org_invite('hash-invite-a1', 'owner')`)
      .then(
        () => null,
        (e: Error & { cause?: Error }) => e,
      );
    expect(err?.cause?.message).toMatch(/function public\.accept_org_invite\(.*\) does not exist/);
  });

  it("acceptance is claims- and row-derived: identity = auth.uid(), role/org from the invite row", async () => {
    // A real pending invite to org A (member role), hash at rest.
    const raw = "raw-attacker-facing-token-0000000000000000000000";
    await db.insert(schema.orgInvites).values({
      id: "aaaaaaaa-0000-4000-8000-00000000b001",
      orgId: ORG_A,
      role: "member",
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      createdBy: ADMIN_A,
    });

    // The ATTACKER (OWNER_B — zero org A grants) accepts with the token.
    const result = await asUser(OWNER_B, (userDb) => acceptInvite(userDb, raw));
    expect(result).toEqual({ ok: true, orgId: ORG_A });

    // The membership row: identity from the jwt claims (OWNER_B), role from
    // the invite row (member), org from the invite row — no attacker input.
    const rows = await db.execute(
      sql`select user_id, role from org_members where org_id = ${ORG_A} and user_id = ${OWNER_B}`,
    );
    expect(rowsOf<{ user_id: string; role: string }>(rows)).toEqual([
      { user_id: OWNER_B, role: "member" },
    ]);
  });

  it("forged owner invite impossible: org_invites_role_check rejects 'owner' even as superuser", async () => {
    // CHECK constraints apply regardless of RLS/superuser status — a forged
    // owner invite row cannot exist to be accepted. (drizzle wraps driver
    // errors — the Postgres message is on .cause.)
    const err = await db
      .insert(schema.orgInvites).values({
        id: "aaaaaaaa-0000-4000-8000-00000000b002",
        orgId: ORG_A,
        role: "owner" as "member",
        tokenHash: "hash-forged-owner",
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        createdBy: ADMIN_A,
      })
      .then(
        () => null,
        (e: Error & { cause?: Error }) => e,
      );
    expect(err?.cause?.message).toMatch(/org_invites_role_check/);
  });

  it("org_invite_preview exposes only (org_name, role) — no PII columns", async () => {
    const raw = "raw-preview-token-00000000000000000000000000";
    await db.insert(schema.orgInvites).values({
      id: "aaaaaaaa-0000-4000-8000-00000000b003",
      orgId: ORG_A,
      role: "member",
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      createdBy: ADMIN_A,
    });
    const res = await asUser(OWNER_B, (userDb) =>
      userDb.execute(
        sql`select * from public.org_invite_preview(${hashToken(raw)})`,
      ),
    );
    const row = rowsOf<Record<string, unknown>>(res)[0];
    expect(Object.keys(row).sort()).toEqual(["org_name", "role"]);
    expect(row.org_name).toBe("Org A");
  });

  it("share tokens are hash-at-rest: the raw token never lands in share_links", async () => {
    const created = await asUser(MEMBER_A, (userDb) =>
      createShareLink(userDb, SESSION_A, MEMBER_A),
    );
    const rows = await db.execute(sql`select token_hash from share_links`);
    const hashes = rowsOf<{ token_hash: string }>(rows).map((r) => r.token_hash);
    expect(hashes).not.toContain(created.token);
    expect(hashes).toContain(hashToken(created.token));
  });
});
