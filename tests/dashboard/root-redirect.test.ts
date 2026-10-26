import { sql } from "drizzle-orm";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { testDb } from "../helpers/pg";

/**
 * M5 WP2 — role redirect on "/":
 *   anonymous → marketing landing (NO redirect; deviation from the brief's
 *               /login — the landing merge postdates the brief)
 *   member    → /dashboard
 *   admin     → /admin            (profiles.role, EFFECTIVE identity)
 *   imp member → /dashboard       (effective identity = impersonation target)
 *   disabled  → /login?disabled=1 (kill switch via the one true requireUser)
 *
 * Identity is mocked at the established seams (getAuthedUser /
 * getEffectiveUser); redirect/notFound throw marker errors exactly like the
 * action-guard suite. getDb is injected onto the throwaway test DB so the
 * profiles probe and the kill-switch's is_user_disabled() both run real SQL.
 */

const state = vi.hoisted(() => ({
  db: undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["db"]
    | undefined,
  cleanup: (undefined as unknown as
    | Awaited<ReturnType<typeof testDb>>["cleanup"]
    | undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/admin/impersonation", () => ({
  getEffectiveUser: vi.fn(),
}));

// The landing sections call next/font/google at module scope; outside
// Next's build pipeline those loaders don't exist — stub the face objects.
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Inter_Tight: () => ({ variable: "--font-inter-tight" }),
  Lexend: () => ({ variable: "--font-lexend" }),
  Source_Serif_4: () => ({ variable: "--font-serif" }),
  Yellowtail: () => ({ variable: "--font-logo" }),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => state.db,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));

import Home from "@/app/page";
import { getAuthedUser } from "@/lib/supabase/server";
import { getEffectiveUser } from "@/lib/admin/impersonation";

const mockedGetAuthedUser = vi.mocked(getAuthedUser);
const mockedGetEffectiveUser = vi.mocked(getEffectiveUser);

const MEMBER = "33333333-3333-4333-8333-333333333333";
const ADMIN = "44444444-4444-4444-8444-444444444444";
const TARGET = "55555555-5555-4555-8555-555555555555";

async function seedUser(id: string, email: string) {
  await state.db!.execute(
    sql`insert into auth.users (id, email) values (${id}::uuid, ${email})`,
  );
}

beforeEach(async () => {
  const { db, cleanup } = await testDb();
  state.db = db;
  state.cleanup = cleanup;
  await seedUser(MEMBER, "member@test.dev");
  await seedUser(ADMIN, "admin@test.dev");
  await seedUser(TARGET, "target@test.dev");
  await state.db!.execute(
    sql`update profiles set role = 'admin' where id = ${ADMIN}::uuid`,
  );
});

afterEach(async () => {
  await state.cleanup?.();
  state.db = undefined;
});

describe("/ role redirect (M5 WP2)", () => {
  it("anonymous visitors get the marketing landing, not a redirect", async () => {
    mockedGetAuthedUser.mockResolvedValue(null);
    const page = await Home(); // resolves — no NEXT_REDIRECT thrown
    expect(page).toBeTruthy();
  });

  it("members redirect to /dashboard", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: MEMBER, email: "member@test.dev" });
    mockedGetEffectiveUser.mockResolvedValue({ id: MEMBER, email: "member@test.dev" });
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("platform admins redirect to /admin (profiles.role probe)", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: ADMIN, email: "admin@test.dev" });
    mockedGetEffectiveUser.mockResolvedValue({ id: ADMIN, email: "admin@test.dev" });
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT:/admin");
  });

  it("impersonation follows the EFFECTIVE identity: target member → /dashboard", async () => {
    mockedGetAuthedUser.mockResolvedValue({ id: ADMIN, email: "admin@test.dev" });
    mockedGetEffectiveUser.mockResolvedValue({ id: TARGET, email: "target@test.dev" });
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("kill switch wins over everything: disabled member → /login?disabled=1", async () => {
    await state.db!.execute(sql`
      insert into feature_flags (id, subject_type, subject_id, flag, value)
      values (${crypto.randomUUID()}::uuid, 'user', ${MEMBER}::uuid, 'disabled', '{}'::jsonb)
    `);
    mockedGetAuthedUser.mockResolvedValue({ id: MEMBER, email: "member@test.dev" });
    mockedGetEffectiveUser.mockResolvedValue({ id: MEMBER, email: "member@test.dev" });
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT:/login?disabled=1");
  });
});
