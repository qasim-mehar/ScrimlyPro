import { noStore } from "@/lib/http";
import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  authUnavailable,
  badRequest,
  forbidden,
  rateLimited,
  validationError,
} from "@/lib/auth/route-helpers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { FORGOT_OK } from "@/lib/auth/responses";
import { parseJsonObject, validateEmail } from "@/lib/auth/validate";
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

  try {
    const supabase = await createServerSupabaseClient();
    // redirectTo routes the recovery link through the PKCE callback.
    // Origin resolution order (anti-phishing: the emailed link carries the
    // one-time recovery code, so its origin must never be attacker-chosen):
    //   1. APP_ORIGIN env — the configured public origin (set in production);
    //   2. forwarded headers, but ONLY in dev (x-forwarded-host is
    //      client-spoofable when the app is directly reachable);
    //   3. req.url origin as last resort.
    const siteOrigin =
      process.env.APP_ORIGIN ??
      (process.env.NODE_ENV !== "production" &&
      (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))?.startsWith("localhost")
        ? `http://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`
        : new URL(req.url).origin);
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
