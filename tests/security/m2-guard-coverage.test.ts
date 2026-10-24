import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PUBLIC_PAGES, isPublicPath } from "@/lib/auth/public-paths";

/**
 * M2 guard-coverage meta-test (Lane B's stand-in for Lane A's
 * tests/security/guard-coverage.test.ts, which had NOT landed on the M1 base
 * when this lane started — extension note in docs/reports/M2-orgs-report.md).
 *
 * It reads the source of every M2 route/action/page and asserts the guard
 * wiring is present at the source level, so a future edit that bypasses the
 * guard stack fails CI even before any behavioral test runs:
 *   - every dynamic API route goes through withOrgRoute (origin + verified
 *     identity + rate limit + awaited params);
 *   - every M2 server-action/page entry uses requireOrgRole /
 *     requireSessionAccess (verified identity + DB-checked membership);
 *   - the public surface additions are enumerated in public-paths;
 *   - the public share page carries noindex + the rate limiter.
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

describe("M2 guard coverage meta-test", () => {
  it("every M2 dynamic API route is wrapped in withOrgRoute", () => {
    for (const route of M2_ROUTES) {
      const src = read(route);
      expect(src, `${route}: withOrgRoute`).toContain("withOrgRoute");
      expect(src, `${route}: no bare export async function`).not.toMatch(
        /export\s+(async\s+function|const)\s+(POST|DELETE)(?!\s*=)/,
      );
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
