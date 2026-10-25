import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { PUBLIC_PAGES, isPublicPath } from "@/lib/auth/public-paths";

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
  // M2 (Lane B): public share + invite surfaces, mirrored from
  // lib/auth/public-paths.ts PUBLIC_PAGES. /invite redirects anonymous
  // users to login; /share renders only the token's public projection.
  "invite/",
  "share/",
];

// M2 (Lane B) org guards — entries ADDED, never removed. withOrgRoute is
// B's route wrapper over the same identity checks (folded into
// withTenantRoute at WP6); requireOrgRole/requireSessionAccess verify user +
// org membership before any tenant access (successor of assertSessionOwner).
// M3 (Lane C): requireAdmin is the REAL-identity admin surface marker (the
// kill switch / impersonation must never apply to admin routes).
const GUARD_MARKERS = [
  "withTenantRoute",
  "requireUser",
  "getAuthedUser",
  "assertSessionOwner",
  "withOrgRoute",
  "requireOrgRole",
  "requireSessionAccess",
  // M3 Lane C: the admin panel's own gate (real identity + DB role → 404).
  "requireAdmin",
];

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
        // requireOrgRole/requireSessionAccess added for M2 (Lane B) —
        // verified user + org-membership guards on server actions.
        return !["assertSessionOwner", "requireUser", "requireOrgRole", "requireSessionAccess"].some((m) => src.includes(m));
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

/**
 * Wave-1 (WP6): Lane B's stand-in meta-test (tests/security/
 * m2-guard-coverage.test.ts) folded in — ONE meta-test file for the whole
 * request surface. Entries ONLY ADDED (never removed). The M2 route test
 * now asserts withTenantRoute: the WP6 fold retired B's withOrgRoute copy
 * so the org surface shares ONE guard stack (kill switch + effective
 * identity, when Lane C lands, arrive for free).
 */
function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const M2_ROUTES = [
  "app/api/orgs/[id]/invites/route.ts",
  "app/api/sessions/[id]/share/route.ts",
];

const M2_ACTION_OR_PAGE = [
  "app/orgs/page.tsx",
  "app/orgs/[id]/actions.ts",
  "app/orgs/[id]/page.tsx",
  "app/orgs/new/actions.ts",
  "app/orgs/new/page.tsx",
  "app/sessions/[id]/actions.ts",
  "app/sessions/[id]/page.tsx",
  "app/sessions/[id]/mvp/actions.ts",
  "app/sessions/[id]/matches/[matchNo]/actions.ts",
  "app/invite/[token]/actions.ts",
  "app/invite/[token]/page.tsx",
];

describe("M2 guard coverage (B stand-in, folded at WP6)", () => {
  it("every M2 dynamic API route is wrapped in withTenantRoute (WP6 fold)", () => {
    for (const route of M2_ROUTES) {
      const src = read(route);
      expect(src, `${route}: withTenantRoute`).toContain("withTenantRoute");
      expect(src, `${route}: no bare export async function`).not.toMatch(
        /export\s+(async\s+function|const)\s+(POST|DELETE)(?!\s*=)/,
      );
    }
  });

  it("the org wrapper copy is gone from the tree and every request path", () => {
    // lib/orgs/route-guard.ts (withOrgRoute) was a pre-Lane-C copy of the
    // guard stack — a kill-switch bypass waiting to happen. The fold is
    // permanent: the file must stay deleted and no request path may name it.
    let exists = true;
    try {
      readFileSync(join(process.cwd(), "lib/orgs/route-guard.ts"), "utf8");
    } catch {
      exists = false;
    }
    expect(exists, "lib/orgs/route-guard.ts must not exist").toBe(false);
    for (const route of M2_ROUTES) {
      expect(read(route), `${route}: withOrgRoute retired`).not.toContain("withOrgRoute");
    }
  });

  it("every M2 action/page re-derives role server-side (requireOrgRole/requireSessionAccess)", () => {
    for (const file of M2_ACTION_OR_PAGE) {
      const src = read(file);
      const guarded =
        src.includes("requireOrgRole") ||
        src.includes("requireSessionAccess") ||
        // the invite page/action verifies identity directly (membership is
        // derived from the single-use token by the definer function, not
        // from a client-supplied org id)
        src.includes("getAuthedUser") ||
        src.includes("requireUser");
      expect(guarded, `${file}: membership guard`).toBe(true);
    }
  });

  it("no M2 file reintroduces the M1 ownership predicate or assertSessionOwner", () => {
    const files = [
      ...M2_ROUTES,
      ...M2_ACTION_OR_PAGE,
      "app/sessions/[id]/page.tsx",
      "app/sessions/new/actions.ts",
      "app/api/ocr/route.ts",
      "lib/sessions/queries.ts",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, `${file}: assertSessionOwner is retired`).not.toContain(
        "assertSessionOwner",
      );
      expect(
        src,
        `${file}: no eq(sessions.userId, …) belt predicate`,
      ).not.toMatch(/eq\(sessions\.userId/);
    }
  });

  it("public surface additions are enumerated; everything else stays gated", () => {
    expect(isPublicPath("/share/abc")).toBe(true);
    expect(isPublicPath("/invite/abc")).toBe(true);
    expect(isPublicPath("/orgs/abc")).toBe(false);
    expect(isPublicPath("/api/orgs/x/invites")).toBe(false);
    for (const required of ["/invite", "/share"]) {
      expect(PUBLIC_PAGES).toContain(required);
    }
  });

  it("the public share page: rate-limited, noindex, projection-only reader", () => {
    const page = read("app/share/[token]/page.tsx");
    expect(page).toContain("checkShareRateLimit");
    expect(page).toContain("noindex");
    expect(page).toContain("getSharedStandings");
    // The page must not import the admin client or DB layer directly.
    expect(page).not.toContain("lib/db/admin");
    expect(page).not.toContain("lib/db/client");

    const reader = read("lib/share/public-reader.ts");
    expect(reader).toContain("getAdminSql");
    // The projection contract lives in one narrow function.
    expect(reader).toContain("export async function getSharedStandings");
  });

  it("token plumbing: hashes only — no raw token is ever written in lib", () => {
    for (const file of [
      "lib/orgs/tokens.ts",
      "lib/orgs/invites.ts",
      "lib/share/links.ts",
    ]) {
      const src = read(file);
      expect(src).toContain("hashToken");
    }
    // The creation paths return the raw token exactly once; they must not
    // also persist it.
    const invites = read("lib/orgs/invites.ts");
    expect(invites).toMatch(/tokenHash: hashToken\(token\)/);
    const links = read("lib/share/links.ts");
    expect(links).toMatch(/tokenHash: hashToken\(token\)/);
  });

  it("OCR route: quota gate runs inside the request tx with the membership predicate", () => {
    const ocr = read("app/api/ocr/route.ts");
    expect(ocr).toContain("assertOcrQuota");
    expect(ocr).toContain("recordUsage");
    expect(ocr).toContain("orgMemberPredicate");
    expect(ocr).toContain("withUserDb");
  });
});

/**
 * Wave-1 (WP9, C-3): the impersonation banner must mount on EVERY tenant
 * surface — the banner is the only visible cue that an operator is acting
 * as someone else. Surfaces: the landing page, the sessions tree, the org
 * surface outside app/sessions/**, and (M5) the member dashboard.
 */
describe("impersonation banner mounts on every tenant surface (C-3)", () => {
  const SURFACES = [
    "app/page.tsx",
    "app/sessions/layout.tsx",
    "app/orgs/layout.tsx",
    "app/dashboard/layout.tsx",
  ];

  it("every tenant surface mounts <ImpersonationBanner />", () => {
    for (const file of SURFACES) {
      const src = read(file);
      expect(src, `${file}: banner mount`).toContain("<ImpersonationBanner />");
    }
  });
});
