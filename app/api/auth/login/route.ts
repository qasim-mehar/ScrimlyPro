import { noStore } from "@/lib/http";
import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  authUnavailable,
  badRequest,
  describeLoginError,
  forbidden,
  rateLimited,
  validationError,
} from "@/lib/auth/route-helpers";
import {
  checkRateLimit,
  clearLoginEmailFailures,
  loginEmailRetryAfter,
  recordLoginEmailFailure,
} from "@/lib/auth/rate-limit";
import { tooManyLoginAttemptsCopy } from "@/lib/auth/responses";
import { parseJsonObject, validateEmail } from "@/lib/auth/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { auditAuthEvent } from "@/lib/audit/auth-events";

function isEnvConfigError(e: unknown): boolean {
  return (
    e instanceof Error && e.message.startsWith("Supabase env is not configured")
  );
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return forbidden();
  const rl = checkRateLimit("login", req);
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  const body = parseJsonObject(await req.json().catch(() => null));
  if (!body) return badRequest();

  const fields: Record<string, string> = {};
  const email = validateEmail(body.email);
  if (email) fields.email = email;
  if (typeof body.password !== "string" || body.password.length === 0)
    fields.password = "password is required";
  if (Object.keys(fields).length > 0) return validationError(fields);
  // Per-email FAILURE bucket (B2): checked before the provider call, recorded
  // only on credential failures. A lockout is reported as 429 with the real
  // wait time — reporting it as 401 taught users their password was wrong.
  const blockedFor = loginEmailRetryAfter(body.email as string);
  if (blockedFor !== null) {
    return noStore(
      {
        error: "too_many_attempts",
        message: tooManyLoginAttemptsCopy(blockedFor),
      },
      { status: 429, headers: { "Retry-After": String(blockedFor) } },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email as string,
      password: body.password as string,
    });
    if (error) {
      const failure = describeLoginError(error);
      // Only a real credential mismatch counts against the per-email bucket;
      // an outage must never lock a legitimate user out.
      if (failure.body.error === "invalid_credentials") {
        recordLoginEmailFailure(body.email as string);
      } else {
        // No PII: status/code only.
        console.warn("login: sign-in rejected by provider", {
          status: error.status,
          code: error.code,
        });
      }
      return noStore(failure.body, {
        status: failure.status,
        headers: failure.headers,
      });
    }
    // Password proven: forget earlier failures for this email.
    clearLoginEmailFailures(body.email as string);
    // M3 (Lane C): audited auth event (minimal insertion — merge point).
    await auditAuthEvent("auth.login", req, { userId: data.user?.id ?? null });
    return noStore({ ok: true });
  } catch (e) {
    if (isEnvConfigError(e)) return authUnavailable();
    throw e;
  }
}
