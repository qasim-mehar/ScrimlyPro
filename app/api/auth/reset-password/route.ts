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
import { RESET_OK } from "@/lib/auth/responses";
import { parseJsonObject, validatePassword } from "@/lib/auth/validate";
import { createServerSupabaseClient, getAuthedUser } from "@/lib/supabase/server";
import { auditAuthEvent } from "@/lib/audit/auth-events";

function isEnvConfigError(e: unknown): boolean {
  return (
    e instanceof Error && e.message.startsWith("Supabase env is not configured")
  );
}

/**
 * Requires the session established by the recovery link (the reset email's
 * code is exchanged server-side by /auth/callback). Identity comes from the
 * server-verified session only — never from the body.
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return forbidden();
  const rl = checkRateLimit("reset", req);
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  const body = parseJsonObject(await req.json().catch(() => null));
  if (!body) return badRequest();

  const password = validatePassword(body.password);
  if (password) return validationError({ password });

  try {
    const user = await getAuthedUser();
    if (!user) {
      // No recovery session → 401, no detail.
      return noStore({ error: "unauthorized" }, { status: 401 });
    }
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: body.password as string,
    });
    if (error) {
      console.warn("reset-password: provider error", { status: error.status });
      return badRequest();
    }
    // M3 (Lane C): audited auth event (minimal insertion — merge point).
    await auditAuthEvent("auth.reset", req, { userId: user.id });
    return noStore(RESET_OK);
  } catch (e) {
    if (isEnvConfigError(e)) return authUnavailable();
    throw e;
  }
}
