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
    // redirectTo routes the recovery link through the PKCE callback. Behind a
    // reverse proxy, req.url can carry an internal origin — derive the public
    // origin from forwarded headers when present, then req.url.
    const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
    const siteOrigin =
      process.env.NODE_ENV !== "production" && forwardedHost?.startsWith("localhost")
        ? `http://${forwardedHost}`
        : forwardedHost
          ? `${forwardedProto}://${forwardedHost}`
          : new URL(req.url).origin;
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
