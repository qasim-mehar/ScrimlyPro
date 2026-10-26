import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import type { ReactElement } from "react";

import { testDb } from "@/tests/helpers/pg";
import type { Db } from "@/lib/db/client";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/**
 * M6 WP2 — role-based landing on "/" (matrix per §6/G3, page-level).
 *
 * Proven at the seam level with the established mocked-identity pattern
 * (mirrors tests/api/admin-guard.test.ts):
 *  - anonymous visitors see the PUBLIC marketing landing ("/" is on
 *    PUBLIC_PAGES — documented deviation: the proxy lets them through by
 *    design; authed pages still bounce them to /login);
 *  - a real-identity platform admin (not impersonating) is redirected to
 *    /admin — navigation only; /admin re-checks requireAdmin itself;
 *  - a normal member is redirected to the member surface /dashboard (M5);
 *  - an admin holding a valid impersonation follows the TARGET identity
 *    to /dashboard, never the admin console;
 *  - a ghost id (no profiles row) is never routed to /admin;
 *  - role revocation applies on the very next render (nothing is cached).
 */

const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const MEMBER = "bbbbbbbb-2222-2222-2222-222222222222";
const GHOST = "99999999-9999-9999-9999-999999999999";

let authedUser: { id: string; email: string | null } | null = null;
let effectiveUser: { id: string; email: string | null } | null = null;

// next/font/google is a Next-runtime intrinsic; outside Next every font
// constructor would throw. One stub covers the whole landing tree.
vi.mock("next/font/google", () => {
  const stub = () => ({ variable: "--font-stub", style: { fontFamily: "stub" } });
  return { Inter: stub, Inter_Tight: stub, Lexend: stub, Source_Serif_4: stub, Yellowtail: stub };
});

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

vi.mock("@/lib/admin/kill-switch", () => ({
  isUserDisabled: vi.fn(async () => false),
}));

vi.mock("@/lib/admin/impersonation", () => ({
  getEffectiveUser: vi.fn(async () => effectiveUser),
  getActiveImpersonation: vi.fn(async () => null),
}));

let db: Db;
let cleanup: () => Promise<void>;
let userDbRunner: <T>(fn: (userDb: Db) => Promise<T>) => Promise<T> = async (fn) =>
  fn(undefined as unknown as Db);

beforeEach(async () => {
  ({ db, cleanup } = await testDb());
  for (const [id, email] of [
    [ADMIN, "admin@test.dev"],
    [MEMBER, "member@test.dev"],
  ] as const) {
    await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
  }
  await db.execute(sql`update profiles set role = 'admin' where id = ${ADMIN}`);
  authedUser = null;
  effectiveUser = null;
  userDbRunner = (fn) => fn(db);
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined as unknown as () => Promise<void>;
});

/** Render the page and capture either its tree or a redirect digest. */
async function renderHome(): Promise<
  { kind: "tree"; names: string[]; text: string[] } | { kind: "redirect"; digest: string }
> {
  vi.resetModules();
  const { default: Home } = await import("@/app/page");
  try {
    const el = await Home();
    const names: string[] = [];
    const text: string[] = [];
    await walk(el, names, text);
    return { kind: "tree", names, text };
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return { kind: "redirect", digest };
    throw e;
  }
}

// Minimal async React-element walk (no renderer dependency): component
// names plus every text run. Server components are plain functions, so the
// walk CALLS them to expand their trees; components that use hooks (client
// components) cannot be called outside React — their subtree is skipped but
// their name is still recorded.
async function walk(node: unknown, names: string[], text: string[]): Promise<void> {
  if (node == null || typeof node !== "object") {
    if (typeof node === "string") text.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) await walk(child, names, text);
    return;
  }
  const el = node as ReactElement<{ children?: unknown }>;
  if (typeof el.type === "function") {
    const name = el.type.name ?? "(anon)";
    names.push(name);
    try {
      await walk(await (el.type as (p: unknown) => unknown)(el.props), names, text);
    } catch {
      // hook-using component — name recorded, subtree skipped
    }
    return;
  }
  if (typeof el.type === "string") names.push(el.type);
  await walk((el.props as { children?: unknown } | null)?.children, names, text);
}

describe("/ role landing (M6 WP2)", () => {
  it("anonymous visitor sees the public marketing landing", async () => {
    authedUser = null;
    const res = await renderHome();
    expect(res.kind).toBe("tree");
    if (res.kind !== "tree") return;
    expect(res.names).toContain("Hero");
    expect(res.names).toContain("SiteFooter");
    expect(res.names).not.toContain("ImpersonationBanner");
  });

  it("real-identity platform admin (not impersonating) → redirect to /admin", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    effectiveUser = { id: ADMIN, email: "admin@test.dev" };
    const res = await renderHome();
    expect(res.kind).toBe("redirect");
    if (res.kind !== "redirect") return;
    expect(res.digest).toContain("/admin");
  });

  it("normal member → member surface /dashboard (M5 routing)", async () => {
    authedUser = { id: MEMBER, email: "member@test.dev" };
    effectiveUser = { id: MEMBER, email: "member@test.dev" };
    const res = await renderHome();
    expect(res.kind).toBe("redirect");
    if (res.kind !== "redirect") return;
    expect(res.digest).toContain("/dashboard");
    expect(res.digest).not.toContain("/admin");
  });

  it("impersonating admin follows the TARGET identity to /dashboard", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    effectiveUser = { id: MEMBER, email: "member@test.dev" };
    const res = await renderHome();
    expect(res.kind).toBe("redirect");
    if (res.kind !== "redirect") return;
    expect(res.digest).toContain("/dashboard");
    expect(res.digest).not.toContain("/admin");
  });

  it("ghost id without a profiles row is never routed to /admin", async () => {
    authedUser = { id: GHOST, email: "ghost@test.dev" };
    effectiveUser = { id: GHOST, email: "ghost@test.dev" };
    const res = await renderHome();
    expect(res.kind).toBe("redirect");
    if (res.kind !== "redirect") return;
    expect(res.digest).toContain("/dashboard");
    expect(res.digest).not.toContain("/admin");
  });

  it("role revocation applies on the very next render (no caching)", async () => {
    authedUser = { id: ADMIN, email: "admin@test.dev" };
    effectiveUser = { id: ADMIN, email: "admin@test.dev" };
    expect((await renderHome()).kind).toBe("redirect");
    await db.execute(sql`update profiles set role = 'user' where id = ${ADMIN}`);
    const after = await renderHome();
    expect(after.kind).toBe("redirect");
    if (after.kind !== "redirect") return;
    expect(after.digest).toContain("/dashboard");
    expect(after.digest).not.toContain("/admin");
  });
});
