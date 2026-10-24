import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Architectural guard-enforcement meta-test (M1 review A2).
 *
 * The §9 route matrix is a one-time cross-check; this test makes DRIFT a CI
 * failure instead. Filesystem walk, no new deps:
 *
 *   1. every API route file (app/api, all route.ts) must use
 *      withTenantRoute or requireUser, or be listed in PUBLIC_API_ALLOWLIST
 *      below (the auth-public routes);
 *   2. every 'use server' module must import the action guard;
 *   3. every page outside PUBLIC_PAGES must show an auth gate.
 *
 * To add a legitimately public route or page: extend the allowlist HERE, with
 * a comment saying why — the failure message points you at this file.
 */

const ROOT = join(process.cwd(), "app");

// Auth-public API routes (lib/auth/public-paths.ts §5.4 contract).
const PUBLIC_API_ALLOWLIST = new Set([
  "api/auth/signup/route.ts",
  "api/auth/login/route.ts",
  "api/auth/logout/route.ts",
  "api/auth/forgot-password/route.ts",
  "api/auth/reset-password/route.ts",
  // PKCE code exchange for confirmation/recovery links — lives at app/auth/
  // callback (the /auth/callback URL), not under /api. No tenant access,
  // redirects only. Public by design (§5.4 /auth/callback).
  "auth/callback/route.ts",
  // Liveness-only health endpoint (M4E): constant body {status, version},
  // no DB ping, no auth by design; registered in PUBLIC_API_PATHS.
  "api/health/route.ts",
]);

// Public pages per lib/auth/public-paths.ts (prefix match).
const PUBLIC_PAGE_PREFIXES = [
  "login/",
  "signup/",
  "forgot-password/",
  "reset-password/",
  "auth/",
];

const GUARD_MARKERS = ["withTenantRoute", "requireUser", "getAuthedUser", "assertSessionOwner"];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function rel(path: string): string {
  return path.slice(ROOT.length + 1).split(sep).join("/");
}

describe("architecture: every request path is auth-guarded (A2)", () => {
  const all = [...walk(ROOT)];

  it("every API route is guarded or explicitly allowlisted", () => {
    const routes = all.filter((f) => f.endsWith("route.ts"));
    expect(routes.length).toBeGreaterThan(0);
    const unguarded = routes
      .map(rel)
      .filter((r) => !PUBLIC_API_ALLOWLIST.has(r))
      .filter((r) => {
        const src = readFileSync(join(ROOT, r), "utf8");
        return !GUARD_MARKERS.some((m) => src.includes(m));
      });
    expect(unguarded).toEqual([]);
  });

  it("every 'use server' module imports the action guard", () => {
    const serverFiles = all.filter((f) => f.endsWith(".ts")).filter((f) =>
      readFileSync(f, "utf8").includes('"use server"'),
    );
    expect(serverFiles.length).toBeGreaterThan(0);
    const unguarded = serverFiles
      .map(rel)
      .filter((r) => {
        const src = readFileSync(join(ROOT, r), "utf8");
        return !["assertSessionOwner", "requireUser"].some((m) => src.includes(m));
      });
    expect(unguarded).toEqual([]);
  });

  it("every page outside the public surface shows an auth gate", () => {
    const pages = all.filter((f) => f.endsWith("page.tsx")).map(rel);
    expect(pages.length).toBeGreaterThan(5);
    const unguarded = pages.filter((p) => {
      if (PUBLIC_PAGE_PREFIXES.some((prefix) => p.startsWith(prefix))) return false;
      const src = readFileSync(join(ROOT, p), "utf8");
      return !GUARD_MARKERS.some((m) => src.includes(m));
    });
    expect(unguarded).toEqual([]);
  });
});
