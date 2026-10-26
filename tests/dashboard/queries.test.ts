import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

import { testDb } from "../helpers/pg";
import { ensureOrg } from "../helpers/orgs";

/**
 * M5 WP3 — dashboard aggregate correctness against seeded fixtures, all
 * reads through withUserDbForTest (the real RLS path), plus cross-org
 * isolation (org A's data invisible when running as org B's member, even
 * when org A's id is passed explicitly — the RLS backstop holds).
 */

const NOW = new Date("2026-10-25T15:00:00.000Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function isoAgo(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const RULES = {
  kill_points: 1,
  placement_points: { "1": 10, "2": 6, "3": 4 },
  default_placement_points: 0,
};

const state: { db?: Db; cleanup?: () => Promise<void> } = {};

async function seedSession(
  orgId: string,
  userId: string,
  s: {
    id: string;
    name: string;
    status: "active" | "completed";
    planned: number;
    teamCount: number;
    createdAt: string;
  },
) {
  await state.db!.insert(schema.sessions).values({
    id: s.id,
    userId,
    orgId,
    name: s.name,
    plannedMatches: s.planned,
    teamCount: s.teamCount,
    scoringRules: RULES,
    status: s.status,
    createdAt: s.createdAt,
  });
}

async function seedMatch(
  sessionId: string,
  m: {
    id: string;
    matchNo: number;
    status: "draft" | "confirmed";
    createdAt: string;
    confirmedAt?: string;
  },
) {
  await state.db!.insert(schema.matches).values({
    id: m.id,
    sessionId,
    matchNo: m.matchNo,
    status: m.status,
    createdAt: m.createdAt,
    confirmedAt: m.confirmedAt ?? null,
  });
}

async function seedResult(
  matchId: string,
  teamId: string,
  placement: number,
  kills: number,
) {
  const table = RULES.placement_points as Record<string, number>;
  const pp = table[String(placement)] ?? 0;
  await state.db!.insert(schema.matchResults).values({
    id: crypto.randomUUID(),
    matchId,
    teamId,
    placement,
    kills,
    placementPoints: pp,
    players: [],
  });
}

async function seedTeam(sessionId: string, id: string, name: string) {
  await state.db!.insert(schema.teams).values({ id, sessionId, name });
}

beforeEach(async () => {
  const { db, cleanup } = await testDb();
  state.db = db;
  state.cleanup = cleanup;

  // Org A (owner USER_A) — the fixture org.
  const orgA = await ensureOrg(db, USER_A, "Team Nexus");

  // S1: active, 4 matches (2 confirmed, 2 drafts — one stale ≥ 24h).
  await seedSession(orgA, USER_A, {
    id: "sess-weekly-0001",
    name: "Weekly Scrim",
    status: "active",
    planned: 6,
    teamCount: 4,
    createdAt: isoAgo(2 * DAY),
  });
  await seedTeam("sess-weekly-0001", "team-1", "Alpha Esports");
  await seedTeam("sess-weekly-0001", "team-2", "Bravo Gaming");
  await seedTeam("sess-weekly-0001", "team-3", "Charlie Squad");
  await seedTeam("sess-weekly-0001", "team-4", "Delta Force");
  // m1 confirmed 2d ago, processed in 30min.
  await seedMatch("sess-weekly-0001", {
    id: "match-w1",
    matchNo: 1,
    status: "confirmed",
    createdAt: isoAgo(2 * DAY),
    confirmedAt: isoAgo(2 * DAY - 30 * 60_000),
  });
  await seedResult("match-w1", "team-1", 1, 0);
  await seedResult("match-w1", "team-2", 2, 1);
  await seedResult("match-w1", "team-3", 3, 0);
  // m2 confirmed ~26h ago, processed in 10min.
  await seedMatch("sess-weekly-0001", {
    id: "match-w2",
    matchNo: 2,
    status: "confirmed",
    createdAt: isoAgo(26 * HOUR),
    confirmedAt: isoAgo(26 * HOUR - 10 * 60_000),
  });
  await seedResult("match-w2", "team-1", 2, 2);
  await seedResult("match-w2", "team-2", 1, 2);
  await seedResult("match-w2", "team-3", 3, 0);
  // m3 draft created 30h ago (STALE — crosses the 24h line).
  await seedMatch("sess-weekly-0001", {
    id: "match-w3",
    matchNo: 3,
    status: "draft",
    createdAt: isoAgo(30 * HOUR),
  });
  // m4 fresh draft.
  await seedMatch("sess-weekly-0001", {
    id: "match-w4",
    matchNo: 4,
    status: "draft",
    createdAt: isoAgo(2 * HOUR),
  });

  // S2: completed 3d ago, no share link → unshared-standings attention.
  await seedSession(orgA, USER_A, {
    id: "sess-sunday-002",
    name: "Sunday Cup",
    status: "completed",
    planned: 4,
    teamCount: 12,
    createdAt: isoAgo(10 * DAY),
  });
  await seedMatch("sess-sunday-002", {
    id: "match-s1",
    matchNo: 1,
    status: "confirmed",
    createdAt: isoAgo(3 * DAY),
    confirmedAt: isoAgo(3 * DAY - 20 * 60_000),
  });

  // S3: completed long ago WITH an active share link → no attention.
  await seedSession(orgA, USER_A, {
    id: "sess-lan-0003",
    name: "Old LAN",
    status: "completed",
    planned: 2,
    teamCount: 8,
    createdAt: isoAgo(20 * DAY),
  });
  await seedMatch("sess-lan-0003", {
    id: "match-l1",
    matchNo: 1,
    status: "confirmed",
    createdAt: isoAgo(15 * DAY),
    confirmedAt: isoAgo(15 * DAY - 5 * 60_000),
  });
  await state.db!.insert(schema.shareLinks).values({
    id: crypto.randomUUID(),
    sessionId: "sess-lan-0003",
    tokenHash: `hash-lan-${crypto.randomUUID()}`,
    createdBy: USER_A,
    createdAt: isoAgo(5 * DAY),
  });

  // Invites: one accepted 2d ago, one pending for 4d (≥3d rule).
  await state.db!.insert(schema.orgInvites).values({
    id: crypto.randomUUID(),
    orgId: orgA,
    email: "joined@team.dev",
    role: "member",
    tokenHash: `hash-inv-acc-${crypto.randomUUID()}`,
    expiresAt: isoAgo(-30 * DAY),
    acceptedAt: isoAgo(2 * DAY),
    createdBy: USER_A,
    createdAt: isoAgo(8 * DAY),
  });
  await state.db!.insert(schema.orgInvites).values({
    id: crypto.randomUUID(),
    orgId: orgA,
    email: "pending@team.dev",
    role: "member",
    tokenHash: `hash-inv-pend-${crypto.randomUUID()}`,
    expiresAt: isoAgo(-30 * DAY),
    createdBy: USER_A,
    createdAt: isoAgo(4 * DAY),
  });

  // OCR meter: 5 events this month, 2 last month (outside the meter).
  for (let i = 0; i < 5; i++) {
    await state.db!.insert(schema.usageEvents).values({
      id: crypto.randomUUID(),
      orgId: orgA,
      userId: USER_A,
      kind: "ocr",
      createdAt: isoAgo(i * HOUR),
    });
  }
  await state.db!.insert(schema.usageEvents).values({
    id: crypto.randomUUID(),
    orgId: orgA,
    userId: USER_A,
    kind: "ocr",
    createdAt: isoAgo(40 * DAY),
  });
  await state.db!.insert(schema.usageEvents).values({
    id: crypto.randomUUID(),
    orgId: orgA,
    userId: USER_A,
    kind: "ocr",
    createdAt: isoAgo(41 * DAY),
  });

  // Org B — exists only for the isolation test.
  await ensureOrg(db, USER_B, "Other Org");
});

afterEach(async () => {
  await state.cleanup?.();
  state.db = undefined;
});

import { withUserDbForTest } from "@/lib/db/user";
import { getDashboardData, dashboardSearch } from "@/lib/dashboard/queries";

async function orgIdFor(user: string, name: string): Promise<string> {
  // Superuser fixture read (seed context, not a request path). postgres-js
  // returns the row array directly — handle both driver shapes.
  const res = (await state.db!.execute(
    sql`select o.id from organizations o
        join org_members m on m.org_id = o.id
        where m.user_id = ${user}::uuid and o.name = ${name}`,
  )) as unknown;
  const list = Array.isArray(res)
    ? (res as Array<{ id: string }>)
    : ((res as { rows?: Array<{ id: string }> }).rows ?? []);
  return list[0].id;
}

describe("getDashboardData (7d range)", () => {
  it("computes featured session, stats, pipeline, quota, notifications from real rows", async () => {
    const orgA = await orgIdFor(USER_A, "Team Nexus");
    const data = await withUserDbForTest({ sub: USER_A }, (db) =>
      getDashboardData(db, orgA, USER_A, "7d", NOW),
    state.db!);

    // Featured = newest ACTIVE session (S1).
    expect(data.featured).not.toBeNull();
    expect(data.featured!.name).toBe("Weekly Scrim");
    expect(data.featured!.confirmedCount).toBe(2);
    expect(data.featured!.draftCount).toBe(2);
    expect(data.featured!.plannedMatches).toBe(6);
    expect(data.featured!.teamCount).toBe(4);
    // Standings over confirmed matches: team-2 6+2+10+2? — compute exact:
    // team-1: m1 (p1 k0)=10, m2 (p2 k2)=6+2=8 → 18
    // team-2: m1 (p2 k1)=6+1=7,  m2 (p1 k2)=10+2=12 → 19
    expect(data.featured!.topStandings).toEqual([
      { teamName: "Bravo Gaming", total: 19 },
      { teamName: "Alpha Esports", total: 18 },
      { teamName: "Charlie Squad", total: 8 },
    ]);

    // Stats.
    expect(data.stats.activeSessions).toBe(1);
    expect(data.stats.matchesInPlay).toBe(4);
    expect(data.stats.matchesProcessed).toBe(3); // m1, m2, s1 in range
    expect(data.stats.matchesDelta).toBe(3); // previous window empty
    expect(data.stats.draftsAwaiting).toBe(2);
    expect(data.stats.oldestDraftHours).toBe(30);
    expect(data.stats.needsAttention).toBe(3); // stale draft + invite + unshared

    // Pipeline.
    expect(data.pipeline).toEqual({ upcoming: 2, drafts: 2, scored: 3 });

    // Avg processing = mean(30m, 10m, 20m) = 20min.
    expect(data.avgProcessingSeconds).toBe(20 * 60);

    // Quota: default 300, user month meter 5.
    expect(data.quota).toEqual({
      limit: 300,
      userMonthCount: 5,
      readsLeft: 295,
      consumedRatio: 5 / 300,
    });

    // Nav badges.
    expect(data.nav).toEqual({
      sessions: 1,
      matchesWeek: 5,
      drafts: 2,
      attention: 3,
    });

    // Attention list: all medium, sorted by due ascending (most overdue
    // first): unshared (due 2d ago) < invite (1d ago) < stale draft (6h ago).
    expect(data.attentionList.map((i) => i.key.split(":")[0])).toEqual([
      "unshared",
      "invite",
      "draft",
    ]);

    // Attention table rows: S1 (stale draft) + S2 (unshared), newest first.
    expect(data.attentionSessions.map((r) => r.name)).toEqual([
      "Weekly Scrim",
      "Sunday Cup",
    ]);
    expect(data.attentionSessions[0].primary).toContain("Match 3");
    expect(data.attentionSessions[0].primary).toContain("30h");

    // Notifications: newest first — m2 (~25.8h) < m1 (47.5h) < invite (2d)
    // < s1 (3d) < share (5d) < l1 (15d, Old LAN).
    expect(data.notifications.map((n) => n.kind)).toEqual([
      "match_confirmed",
      "match_confirmed",
      "invite_accepted",
      "match_confirmed",
      "share_created",
      "match_confirmed",
    ]);
    expect(data.notifications[5].label).toContain("Old LAN");

    expect(data.invitesPending).toBe(1);
  });

  it("quota ≥80% with an active session is a HIGH attention item", async () => {
    const orgA = await orgIdFor(USER_A, "Team Nexus");
    // Burn the meter to 240/300 = 80%.
    for (let i = 0; i < 235; i++) {
      await state.db!.insert(schema.usageEvents).values({
        id: crypto.randomUUID(),
        orgId: orgA,
        userId: USER_A,
        kind: "ocr",
        createdAt: isoAgo(i % 24 * HOUR),
      });
    }
    const data = await withUserDbForTest({ sub: USER_A }, (db) =>
      getDashboardData(db, orgA, USER_A, "7d", NOW),
    state.db!);
    const high = data.attentionList.filter((i) => i.risk === "high");
    expect(high).toHaveLength(1);
    expect(high[0].key).toBe("quota");
    expect(data.stats.needsAttention).toBe(4);
  });

  it("cross-org isolation: org A data invisible when running as org B member", async () => {
    const orgA = await orgIdFor(USER_A, "Team Nexus");
    const data = await withUserDbForTest({ sub: USER_B }, (db) =>
      getDashboardData(db, orgA, USER_B, "7d", NOW), // org A id passed EXPLICITLY
    state.db!);
    // RLS backstop: nothing from org A is visible to USER_B.
    expect(data.featured).toBeNull();
    expect(data.stats).toEqual({
      activeSessions: 0,
      matchesInPlay: 0,
      matchesProcessed: 0,
      matchesDelta: 0,
      draftsAwaiting: 0,
      oldestDraftHours: null,
      needsAttention: 0,
    });
    expect(data.pipeline).toEqual({ upcoming: 0, drafts: 0, scored: 0 });
    expect(data.notifications).toEqual([]);
    expect(data.attentionList).toEqual([]);
    expect(data.attentionSessions).toEqual([]);

    // Search follows the same law.
    const results = await withUserDbForTest({ sub: USER_B }, (db) =>
      dashboardSearch(db, orgA, "Weekly"),
    state.db!);
    expect(results.sessions).toEqual([]);
    expect(results.matches).toEqual([]);
  });

  it("search finds sessions by name and matches by number", async () => {
    const orgA = await orgIdFor(USER_A, "Team Nexus");
    const byName = await withUserDbForTest({ sub: USER_A }, (db) =>
      dashboardSearch(db, orgA, "weekly"),
    state.db!);
    expect(byName.sessions.map((s) => s.name)).toEqual(["Weekly Scrim"]);
    // sessionCode = "SCR-" + last 6 chars of the dash-stripped id.
    expect(byName.sessions[0].code).toBe("SCR-LY0001");
    const byNumber = await withUserDbForTest({ sub: USER_A }, (db) =>
      dashboardSearch(db, orgA, "3"),
    state.db!);
    expect(byNumber.matches.length).toBeGreaterThan(0);
    expect(
      byNumber.matches.every((m) => m.sessionName === "Weekly Scrim"),
    ).toBe(true);
  });

  it("empty org: featured null, everything zero, honest fallbacks", async () => {
    const orgB = await orgIdFor(USER_B, "Other Org");
    const data = await withUserDbForTest({ sub: USER_B }, (db) =>
      getDashboardData(db, orgB, USER_B, "7d", NOW),
    state.db!);
    expect(data.featured).toBeNull();
    expect(data.avgProcessingSeconds).toBeNull();
    expect(data.quota.readsLeft).toBe(300);
  });
});
