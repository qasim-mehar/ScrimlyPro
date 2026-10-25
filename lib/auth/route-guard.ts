import type { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  RATE_LIMITS,
  SlidingWindowRateLimiter,
} from "@/lib/auth/rate-limit";
import { noStore } from "@/lib/http";
import { getAuthedUser, type AuthedUser } from "@/lib/supabase/server";

/**
 * Guard stack for authenticated API route handlers (WP6):
 *   1. same-origin (403) → 2. verified identity (401) →
 *   3. per-user api rate limit (429 + Retry-After) → handler.
 *
 * Every response — from the guards AND the wrapped handler — is no-store.
 * Identity comes ONLY from getAuthedUser (supabase.auth.getUser); request
 * payloads/headers are never consulted for identity.
 */

export type TenantRouteContext<P = undefined> = {
  user: AuthedUser;
  /**
   * Wave-1 (WP6 fold): dynamic-segment params, awaited from the route
   * context. Static routes never receive a params promise and get undefined.
   * This is why Lane B's withOrgRoute wrapper existed — withTenantRoute
   * dropped params, so org routes had to use a COPY of the guard stack that
   * would silently miss every future insertion (kill switch, effective
   * identity). One wrapper, one stack.
   */
  params: P;
};

export type RequireUserResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

/**
 * Verify the caller's identity. Returns either the server-verified user or
 * a ready-to-send 401 response (no detail about WHY auth failed).
 *
 * `req` is part of the guard contract (callers pass the request through);
 * identity itself always comes from cookies via getAuthedUser.
 */
export async function requireUser(req: Request): Promise<RequireUserResult> {
  void req;
  const user = await getAuthedUser();
  if (!user) {
    return {
      ok: false,
      response: noStore({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

// Per-user api limiter (RATE_LIMITS.api: 120/min), keyed by the verified
// user id — module-level so the window survives across requests.
const apiLimiter = new SlidingWindowRateLimiter(RATE_LIMITS.api);

/**
 * Wrap an authenticated route handler with the full guard stack. The
 * wrapped handler receives `{ user, params }` (server-verified identity;
 * awaited dynamic params or undefined) and must return a no-store
 * response; tenant reads/writes inside the handler run through
 * withUserDb({ sub: user.id }, ...).
 *
 * Generic P: pass it for dynamic routes —
 *   withTenantRoute<{ id: string }>(async (req, { user, params }) => ...)
 * — or omit it on static routes (params is then undefined).
 */
export function withTenantRoute<P = undefined>(
  handler: (request: Request, ctx: TenantRouteContext<P>) => Promise<NextResponse>,
) {
  return async (
    request: Request,
    // Next 16 hands EVERY route handler `{ params: Promise<{}> }` (empty for
    // static routes). Accept its widest shape here — narrowing to the
    // handler's P happens inside — so both static and dynamic routes
    // typecheck against Next's route validator.
    routeCtx?: { params: Promise<object> },
  ): Promise<NextResponse> => {
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
      const params = routeCtx
        ? ((await routeCtx.params) as unknown as P)
        : (undefined as P);
      return await handler(request, { user, params });
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
