import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/**
 * M6 WP3 — dashboard data module fixtures.
 *
 * Deterministic fixture world (all timestamps explicit relative to now),
 * then getAdminDashboardData / getAdminNavData / getOrgRows / adminSearch
 * are asserted against hand-computed expectations. Also proves the audit
 * SILENCE law: a full dashboard read inserts zero audit_log rows.
 */

const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const U_HEAVY = "bbbbbbbb-2222-2222-2222-222222222222"; // 270/300 reads → high quota
const U_WARM = "cccccccc-3333-3333-3333-333333333333"; // 250/300 → medium quota
const U_OK = "dddddddd-4444-4444-4444-444444444444"; // 10 reads
const U_GONE = "eeeeeeee-5555-5555-5555-555555555555"; // kill-switched

const O_ACTIVE = "11111111-aaaa-4000-8000-0000000000a1"; // Karachi Kings
const O_STALE = "11111111-aaaa-4000-8000-0000000000a2"; // Islamabad Falcons
const O_NEW = "11111111-aaaa-4000-8000-0000000000a3"; // Lahore Night Owls

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
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;
  await seedFixture(db);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
  adminGlobals.__scrimlyAdminSql = undefined;
  adminGlobals.__scrimlyAdminDb = undefined;
  delete process.env.SUPABASE_DB_URL;
});

async function seedFixture(d: Db): Promise<void> {
  // users + profiles (profile creation dates drive the lifecycle funnel)
  for (const [id, email, profileAge] of [
    [ADMIN, "admin@test.dev", 90],
    [U_HEAVY, "heavy@test.dev", 30],
    [U_WARM, "warm@test.dev", 20],
    [U_OK, "ok@test.dev", 2],
    [U_GONE, "gone@test.dev", 30],
  ] as const) {
    await d.execute(
      sql`insert into auth.users (id, email, created_at)
          values (${id}, ${email}, now() - (${profileAge} || ' days')::interval)`,
    );
    await d.execute(
      sql`update profiles set created_at = now() - (${profileAge} || ' days')::interval
          where id = ${id}`,
    );
  }

  // orgs: ACTIVE (hot), STALE (60d old, no activity), NEW (2d old)
  await d.execute(sql`
    insert into organizations (id, name, slug, created_by, created_at) values
      (${O_ACTIVE}, 'Karachi Kings Scrims', 'karachi-kings', ${U_HEAVY}, now() - interval '40 days'),
      (${O_STALE}, 'Islamabad Falcons', 'islamabad-falcons', ${U_GONE}, now() - interval '60 days'),
      (${O_NEW}, 'Lahore Night Owls', 'lahore-owls', ${U_OK}, now() - interval '2 days')
  `);

  // members (U_WARM joined yesterday → joined_org in 7d range; activation 19d)
  await d.execute(sql`
    insert into org_members (org_id, user_id, role, joined_at) values
      (${O_ACTIVE}, ${U_HEAVY}, 'owner', now() - interval '40 days'),
      (${O_ACTIVE}, ${U_WARM}, 'member', now() - interval '1 day'),
      (${O_ACTIVE}, ${U_OK}, 'member', now() - interval '10 days'),
      (${O_STALE}, ${U_GONE}, 'owner', now() - interval '60 days'),
      (${O_NEW}, ${U_OK}, 'owner', now() - interval '2 days')
  `);

  // usage: HEAVY 270 (today, day-anchored - 'now - 30m' breaks at midnight),
  // WARM 250 (26h ago, always outside 'today'), OK 2 today + 8 at 3d
  await d.execute(sql`
    insert into usage_events (id, org_id, user_id, kind, created_at)
    select gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_HEAVY}::uuid, 'ocr', date_trunc('day', now()) + interval '30 minutes'
    from generate_series(1, 270)
  `);
  await d.execute(sql`
    insert into usage_events (id, org_id, user_id, kind, created_at)
    select gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_WARM}::uuid, 'ocr', now() - interval '26 hours'
    from generate_series(1, 250)
  `);
  await d.execute(sql`
    insert into usage_events (id, org_id, user_id, kind, created_at) values
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', date_trunc('day', now()) + interval '10 minutes'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', date_trunc('day', now()) + interval '11 minutes'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '1 hour'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '2 hours'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '3 hours'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '4 hours'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '5 hours'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '6 hours'),
      (gen_random_uuid(), ${O_ACTIVE}::uuid, ${U_OK}::uuid, 'ocr', now() - interval '3 days' - interval '7 hours')
  `);

  // sessions: S1/S2 in 7d range, S3 in the prior window (12d ago)
  const RULES = JSON.stringify({
    kill_points: 1,
    placement_points: { "1": 10, "2": 6, "3": 5, "4": 4, "5": 3, "6": 2, "7": 1, "8": 1 },
    default_placement_points: 1,
  });
  await d.execute(sql`
    insert into sessions (id, user_id, org_id, name, planned_matches, team_count, scoring_rules, status, created_at) values
      ('sess-m6-0001', ${U_HEAVY}, ${O_ACTIVE}, 'Thursday Scrim Night', 3, 4, ${RULES}::jsonb, 'active', now() - interval '1 day'),
      ('sess-m6-0002', ${U_WARM}, ${O_ACTIVE}, 'Tuesday Warmup', 3, 4, ${RULES}::jsonb, 'active', now() - interval '3 days'),
      ('sess-m6-0003', ${U_HEAVY}, ${O_ACTIVE}, 'Old Weekly', 3, 4, ${RULES}::jsonb, 'completed', now() - interval '12 days')
  `);
  // teams + one confirmed match with results in S1 (the hero source)
  await d.execute(sql`
    insert into teams (id, session_id, name) values
      ('team-m6-a', 'sess-m6-0001', 'Alpha Esports'),
      ('team-m6-b', 'sess-m6-0001', 'Beta Squad'),
      ('team-m6-g', 'sess-m6-0001', 'Gamma Gaming'),
      ('team-m6-d', 'sess-m6-0001', 'Delta Force')
  `);
  await d.execute(sql`
    insert into matches (id, session_id, match_no, status, created_at, confirmed_at) values
      ('match-m6-1', 'sess-m6-0001', 1, 'confirmed', now() - interval '1 day', now() - interval '22 hours'),
      ('match-m6-2', 'sess-m6-0002', 1, 'draft', now() - interval '2 days', null)
  `);
  await d.execute(sql`
    insert into match_results (id, match_id, team_id, placement, kills, placement_points, players) values
      (gen_random_uuid(), 'match-m6-1', 'team-m6-a', 1, 10, 10, '[]'::jsonb),
      (gen_random_uuid(), 'match-m6-1', 'team-m6-b', 2, 8, 6, '[]'::jsonb),
      (gen_random_uuid(), 'match-m6-1', 'team-m6-g', 3, 4, 5, '[]'::jsonb),
      (gen_random_uuid(), 'match-m6-1', 'team-m6-d', 4, 0, 4, '[]'::jsonb)
  `);

  // flags: kill switch on U_GONE; no global AI flag (→ On)
  await d.execute(sql`
    insert into feature_flags (id, subject_type, subject_id, flag, value, updated_at) values
      (gen_random_uuid(), 'user', ${U_GONE}, 'disabled', '{}'::jsonb, now() - interval '2 days')
  `);

  // impersonations: one active, one expired-never-stopped
  await d.execute(sql`
    insert into impersonation_sessions (id, admin_user_id, target_user_id, target_email, reason, expires_at, created_at) values
      ('22222222-bbbb-4000-8000-000000000001', ${ADMIN}, ${U_OK}, 'ok@test.dev', 'support ticket 123', now() + interval '20 minutes', now() - interval '10 minutes'),
      ('22222222-bbbb-4000-8000-000000000002', ${ADMIN}, ${U_WARM}, 'warm@test.dev', 'check quota view', now() - interval '2 hours', now() - interval '3 hours')
  `);

  // invites: one pending 9 days (flagged), one fresh
  await d.execute(sql`
    insert into org_invites (id, org_id, email, role, token_hash, expires_at, created_by, created_at) values
      ('33333333-cccc-4000-8000-000000000001', ${O_ACTIVE}, 'straggler@example.com', 'member', ${"hash-old-" + "x".repeat(55)}, now() + interval '1 day', ${U_HEAVY}, now() - interval '9 days'),
      ('33333333-cccc-4000-8000-000000000002', ${O_ACTIVE}, 'fresh@example.com', 'member', ${"hash-new-" + "y".repeat(55)}, now() + interval '6 days', ${U_HEAVY}, now() - interval '1 day')
  `);

  // audit events for the bell
  await d.execute(sql`
    insert into audit_log (id, actor_user_id, action, target_type, target_id, metadata, created_at) values
      (gen_random_uuid(), ${ADMIN}, 'admin.impersonation.start', 'user', ${U_OK}, '{"reason":"support ticket 123"}'::jsonb, now() - interval '25 minutes'),
      (gen_random_uuid(), ${U_OK}, 'auth.login', null, null, '{}'::jsonb, now() - interval '30 minutes')
  `);
}

describe("getAdminNavData", () => {
  it("counts orgs, users, flags, live impersonations; AI on with no global flag", async () => {
    const { getAdminNavData } = await import("@/lib/admin/dashboard-queries");
    const nav = await getAdminNavData();
    expect(nav).toMatchObject({
      orgs: 3,
      users: 5,
      flags: 1,
      activeImpersonations: 1,
      aiOn: true,
      usersFlagged: 1,
    });
    expect(nav.reads7d).toBe(530);
  });
});

describe("getAdminDashboardData", () => {
  it("computes stats, deltas, funnel, AI facts and events from the fixture (7d)", async () => {
    const { getAdminDashboardData } = await import("@/lib/admin/dashboard-queries");
    const d = await getAdminDashboardData("7d", "platform.admin@test.dev");

    expect(d.range).toBe("7d");
    expect(d.adminFirstName).toBe("Platform");
    expect(d.stats).toMatchObject({
      users: 5,
      orgs: 3,
      sessionsInRange: 2,
      readsInRange: 530,
      attentionCount: 6,
    });
    expect(d.stats.sessionsDelta).toBe(1); // 2 in range vs 1 in the prior week

    expect(d.lifecycle).toMatchObject({
      signups: 1, // U_OK's profile is 2d old
      joinedOrg: 2, // U_WARM (1d ago) + U_OK joining Lahore (2d ago)
      activeInRange: 3,
      nearQuota: 2,
      disabled: 1,
    });
    // U_WARM: 20d-old profile joined 1d ago (19d); U_OK→O_NEW: 0d → avg 9.5
    expect(d.lifecycle.averageActivationDays).toBe(9.5);

    expect(d.ai).toMatchObject({
      reads7d: 530,
      users7d: 3,
      orgs7d: 1,
      draftMatches7d: 1,
      nearQuotaCount: 2,
    });
    expect(d.ai.lastReadAt).not.toBeNull();

    // honest gauge: reads metered, success rate NOT computable
    expect(d.gauge).toEqual({ readsInRange: 530, successRateComputable: false });

    // featured = most active org; hero = latest session's confirmed standings
    expect(d.featured).toMatchObject({
      name: "Karachi Kings Scrims",
      membersTotal: 3,
      membersActive: 3,
      sessionsInRange: 2,
      readsInRange: 530,
      status: "quota", // 530 month reads ≥ 80% of the default 300 quota
    });
    expect(d.featured?.monogram).toBe("K");
    expect(d.featured?.hero).toEqual({
      sessionName: "Thursday Scrim Night",
      hasResults: true,
      // 1st 10+10 · 2nd 6+8 · 3rd 5+4 (kill×1) — hand-computed
      top: [
        { teamName: "Alpha Esports", points: 20 },
        { teamName: "Beta Squad", points: 14 },
        { teamName: "Gamma Gaming", points: 9 },
      ],
    });

    // attention rules, severity-first then oldest-first:
    //   high   = disabled (2d ago) → expired impersonation (2h) → ≥90% quota
    //   medium = stale org (60d) → old invite (9d) → 80–89% quota
    expect(d.attention.map((a) => a.key)).toEqual([
      "disabled:gone@test.dev",
      "imp:22222222-bbbb-4000-8000-000000000002",
      "quota:heavy@test.dev",
      `org:${O_STALE}`,
      "invite:33333333-cccc-4000-8000-000000000001",
      "quota:warm@test.dev",
    ]);
    expect(d.attention.map((a) => a.severity)).toEqual([
      "high", "high", "high", "medium", "medium", "medium",
    ]);
    expect(d.attention[0].status).toBe("Disabled");
    expect(d.attention[2].detail).toBe("90% of monthly reads used");

    // events: newest first, humanized
    expect(d.events.map((e) => e.text)).toEqual([
      "admin@test.dev started impersonating ok@test.dev",
      "ok@test.dev signed in",
    ]);

    // active impersonation strip
    expect(d.activeImpersonations).toHaveLength(1);
    expect(d.activeImpersonations[0].targetEmail).toBe("ok@test.dev");
  });

  it("scoping by range=today drops older data honestly", async () => {
    const { getAdminDashboardData } = await import("@/lib/admin/dashboard-queries");
    const d = await getAdminDashboardData("today", "platform.admin@test.dev");
    // HEAVY (30m) + OK (10m, 11m) are today; WARM (26h) is not
    expect(d.stats.readsInRange).toBe(272);
    expect(d.stats.sessionsInRange).toBe(0);
    expect(d.lifecycle.activeInRange).toBe(2);
    expect(d.featured?.name).toBe("Karachi Kings Scrims");
    expect(d.featured?.membersActive).toBe(2);
  });

  it("inserts ZERO audit_log rows while reading (audit silence)", async () => {
    const before = await countAudit(db);
    const { getAdminDashboardData, getAdminNavData } = await import("@/lib/admin/dashboard-queries");
    await getAdminDashboardData("7d", "platform.admin@test.dev");
    await getAdminNavData();
    expect(await countAudit(db)).toBe(before);
  });
});

describe("getOrgRows + adminSearch", () => {
  it("orders orgs by in-range activity with owner email + status", async () => {
    const { getOrgRows } = await import("@/lib/admin/dashboard-queries");
    const rows = await getOrgRows("7d");
    expect(rows.map((r) => r.name)).toEqual([
      "Karachi Kings Scrims",
      "Lahore Night Owls",
      "Islamabad Falcons",
    ]);
    expect(rows[0]).toMatchObject({
      ownerEmail: "heavy@test.dev",
      members: 3,
      sessionsInRange: 2,
      readsInRange: 530,
      status: "quota", // 520 month reads ≥ 80% of default 300
    });
    expect(rows[2]).toMatchObject({ status: "active", readsInRange: 0 });
  });

  it("searches users by email and orgs by name, grouped", async () => {
    const { adminSearch } = await import("@/lib/admin/dashboard-queries");
    const byEmail = await adminSearch("heavy@");
    expect(byEmail.users).toEqual([{ id: U_HEAVY, email: "heavy@test.dev" }]);
    expect(byEmail.orgs).toEqual([]);

    const byOrg = await adminSearch("falcons");
    expect(byOrg.orgs).toEqual([{ id: O_STALE, name: "Islamabad Falcons" }]);
    expect(byOrg.users).toEqual([]);

    const empty = await adminSearch("   ");
    expect(empty).toEqual({ users: [], orgs: [] });
  });
});

async function countAudit(d: Db): Promise<number> {
  const res = (await d.execute(
    sql`select count(*)::int as n from audit_log`,
  )) as unknown as { rows?: Array<{ n: number }> };
  const rows = Array.isArray(res) ? (res as unknown as Array<{ n: number }>) : res.rows ?? [];
  return rows[0]?.n ?? 0;
}
