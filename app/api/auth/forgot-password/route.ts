import { noStore } from "@/lib/http";
import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  authUnavailable,
  badRequest,
  forbidden,
  rateLimited,
  validationError,
} from "@/lib/auth/route-helpers";
import {
  checkEmailRateLimit,
  checkRateLimit,
} from "@/lib/auth/rate-limit";
import { FORGOT_OK } from "@/lib/auth/responses";
import { parseJsonObject, validateEmail } from "@/lib/auth/validate";
import { auditAuthEvent } from "@/lib/audit/auth-events";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isEnvConfigError(e: unknown): boolean {
  return (
    e instanceof Error && e.message.startsWith("Supabase env is not configured")
  );
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return forbidden();
  const rl = checkRateLimit("forgot", req);
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  const body = parseJsonObject(await req.json().catch(() => null));
  if (!body) return badRequest();

  const email = validateEmail(body.email);
  if (email) return validationError({ email });
  // Per-email secondary bucket (attribution-independent; B2) — also the
  // email-bombing defense when IP buckets are spoofable.
  const emailRl = checkEmailRateLimit("forgotEmail", body.email as string);
  if (!emailRl.ok) return rateLimited(emailRl.retryAfterSeconds);

  try {
    const supabase = await createServerSupabaseClient();
    // redirectTo routes the recovery link through the PKCE callback.
    // Origin resolution order (anti-phishing: the emailed link carries the
    // one-time recovery code, so its origin must never be attacker-chosen):
    //   1. APP_ORIGIN env — the configured public origin (set in production);
    //   2. forwarded headers, but ONLY in dev (x-forwarded-host is
    //      client-spoofable when the app is directly reachable);
    //   3. req.url origin as last resort.
    // Fail-closed (M1 review B3): production without APP_ORIGIN refuses the
    // recovery flow rather than trusting spoofable forwarded headers.
    if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) {
      console.error("forgot-password: APP_ORIGIN is required in production");
      return authUnavailable();
    }
    const siteOrigin =
      process.env.APP_ORIGIN ??
      (process.env.NODE_ENV !== "production" &&
      (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))?.startsWith("localhost")
        ? `http://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`
        : new URL(req.url).origin);
    // M3 (Lane C): audited auth event; no user context exists pre-auth, so
    // the actor is stored as NULL (definer derives from claims only).
    await auditAuthEvent("auth.forgot", req);
    const { error } = await supabase.auth.resetPasswordForEmail(
      body.email as string,
      { redirectTo: new URL("/auth/callback", siteOrigin).toString() },
    );
    if (error) {
      // Log without PII; respond identically regardless of account existence.
      console.warn("forgot-password: provider error (email withheld)", {
        status: error.status,
      });
    }
    return noStore(FORGOT_OK);
  } catch (e) {
    if (isEnvConfigError(e)) return authUnavailable();
    throw e;
  }
}
