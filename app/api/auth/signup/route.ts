import { noStore } from "@/lib/http";
import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  authUnavailable,
  badRequest,
  forbidden,
  isAlreadyRegistered,
  rateLimited,
  validationError,
} from "@/lib/auth/route-helpers";
import {
  checkEmailRateLimit,
  checkRateLimit,
} from "@/lib/auth/rate-limit";
import { SIGNUP_OK } from "@/lib/auth/responses";
import { parseJsonObject, validateEmail, validatePassword } from "@/lib/auth/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isEnvConfigError(e: unknown): boolean {
  return (
    e instanceof Error && e.message.startsWith("Supabase env is not configured")
  );
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return forbidden();
  const rl = checkRateLimit("signup", req);
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  const body = parseJsonObject(await req.json().catch(() => null));
  if (!body) return badRequest();

  const fields: Record<string, string> = {};
  const email = validateEmail(body.email);
  if (email) fields.email = email;
  const password = validatePassword(body.password);
  if (password) fields.password = password;
  if (Object.keys(fields).length > 0) return validationError(fields);
  // Per-email secondary bucket (attribution-independent; B2).
  const emailRl = checkEmailRateLimit("signupEmail", body.email as string);
  if (!emailRl.ok) return rateLimited(emailRl.retryAfterSeconds);

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email: body.email as string,
      password: body.password as string,
    });
    if (error) {
      if (isAlreadyRegistered(error)) {
        // Enumeration safety: swallow, warn WITHOUT the raw email, return the
        // byte-identical success body (parity pinned by tests).
        console.warn("signup: duplicate registration attempt (email withheld)");
        return noStore(SIGNUP_OK);
      }
      console.warn("signup: rejected", { status: error.status });
      return badRequest();
    }
    return noStore(SIGNUP_OK);
  } catch (e) {
    if (isEnvConfigError(e)) return authUnavailable();
    throw e;
  }
}
