import type { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  RATE_LIMITS,
  SlidingWindowRateLimiter,
} from "@/lib/auth/rate-limit";
import { isUserDisabled } from "@/lib/admin/kill-switch";
import { getEffectiveUser } from "@/lib/admin/impersonation";
import { noStore } from "@/lib/http";
import type { AuthedUser } from "@/lib/supabase/server";

/**
 * Guard stack for authenticated API route handlers (WP6):
 *   1. same-origin (403) → 2. verified identity (401) →
 *   3. kill switch (403, M3) → 4. per-user api rate limit (429) → handler.
 *
 * Every response — from the guards AND the wrapped handler — is no-store.
 * Identity comes ONLY from the server-verified seam: getEffectiveUser
 * (M3: the impersonation target when a valid impersonation cookie is
 * present, otherwise the real getUser-verified user). Request
 * payloads/headers are never consulted for identity. Admin routes use
 * requireAdmin (REAL identity) and never this seam.
 */

export type TenantRouteContext = { user: AuthedUser };

export type RequireUserResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

/**
 * Verify the caller's identity (effective — see above). Returns either the
 * user or a ready-to-send 401 response (no detail about WHY auth failed).
 *
 * M3 (Lane C, single choke point): a tenant carrying the reserved
 * `disabled` marker — including an impersonation target — is locked out of
 * every authed API surface here — 403 with a plain body, no detail. The
 * probes (lib/admin/kill-switch.ts, lib/admin/impersonation.ts) are the
 * only lib/admin imports in this file (sanctioned by the eslint perimeter).
 *
 * `req` is part of the guard contract (callers pass the request through);
 * identity itself always comes from cookies.
 */
export async function requireUser(req: Request): Promise<RequireUserResult> {
  void req;
  const user = await getEffectiveUser();
  if (!user) {
    return {
      ok: false,
      response: noStore({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (await isUserDisabled(user.id)) {
    return {
      ok: false,
      response: noStore({ error: "account_disabled" }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

// Per-user api limiter (RATE_LIMITS.api: 120/min), keyed by the verified
// user id — module-level so the window survives across requests.
const apiLimiter = new SlidingWindowRateLimiter(RATE_LIMITS.api);

export type TenantRouteHandler = (
  request: Request,
  ctx: TenantRouteContext,
) => Promise<NextResponse>;

/**
 * Wrap an authenticated route handler with the full guard stack. The
 * wrapped handler receives `{ user }` (server-verified) and must return a
 * no-store response; tenant reads/writes inside the handler run through
 * withUserDb({ sub: user.id }, ...).
 */
export function withTenantRoute(handler: TenantRouteHandler) {
  return async (request: Request): Promise<NextResponse> => {
    // 1. Same-origin for state-changing methods (CSRF / cross-site posts).
    if (!assertSameOrigin(request)) {
      return noStore({ error: "forbidden" }, { status: 403 });
    }

    // 2. Verified identity — 401 with zero detail leakage.
    const auth = await requireUser(request);
    if (!auth.ok) return auth.response;
    const { user } = auth;

    // 3. Per-user rate limit (keyed by user id, never by client input).
    const limit = apiLimiter.check(user.id);
    if (!limit.ok) {
      return noStore(
        { error: "rate limited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    try {
      return await handler(request, { user });
    } catch (err) {
      // Unconfigured deployment (no Supabase env): 503, fail-closed, no detail.
      if (
        err instanceof Error &&
        err.message.startsWith("Supabase env is not configured")
      ) {
        return noStore({ error: "auth_unavailable" }, { status: 503 });
      }
      // Defense in depth: handlers own their error envelopes; this catch-all
      // only guarantees JSON (no-stack) responses for unexpected throws.
      console.warn("tenant route handler failed unexpectedly");
      if (process.env.NODE_ENV !== "production") {
        console.warn(String(err));
      }
      return noStore(
        { error: "internal error" },
        { status: 500 },
      );
    }
  };
}
