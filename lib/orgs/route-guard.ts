import type { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  RATE_LIMITS,
  SlidingWindowRateLimiter,
} from "@/lib/auth/rate-limit";
import { noStore } from "@/lib/http";
import { requireUser } from "@/lib/auth/route-guard";
import type { AuthedUser } from "@/lib/supabase/server";

/**
 * Guard stack for authenticated DYNAMIC API routes (M2): identical order to
 * lib/auth/route-guard.ts withTenantRoute — same-origin (403) → verified
 * identity (401) → per-user api rate limit (429) → handler — but it ALSO
 * awaits and forwards the dynamic segment params, which withTenantRoute
 * drops. Lane A owns lib/auth/route-guard.ts; integration note in the M2
 * report: consider folding params support back into withTenantRoute.
 */
export type OrgRouteContext<P> = {
  user: AuthedUser;
  params: P;
};

export type OrgRouteHandler<P> = (
  request: Request,
  ctx: OrgRouteContext<P>,
) => Promise<NextResponse>;

const apiLimiter = new SlidingWindowRateLimiter(RATE_LIMITS.api);

export function withOrgRoute<P extends object>(
  handler: OrgRouteHandler<P>,
) {
  return async (
    request: Request,
    ctx: { params: Promise<P> },
  ): Promise<NextResponse> => {
    if (!assertSameOrigin(request)) {
      return noStore({ error: "forbidden" }, { status: 403 });
    }
    const auth = await requireUser(request);
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const limit = apiLimiter.check(user.id);
    if (!limit.ok) {
      return noStore(
        { error: "rate limited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    try {
      const params = await ctx.params;
      return await handler(request, { user, params });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("Supabase env is not configured")
      ) {
        return noStore({ error: "auth_unavailable" }, { status: 503 });
      }
      console.warn("org route handler failed unexpectedly");
      if (process.env.NODE_ENV !== "production") {
        console.warn(String(err));
      }
      return noStore({ error: "internal error" }, { status: 500 });
    }
  };
}
