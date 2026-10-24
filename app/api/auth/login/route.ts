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
import { INVALID_CREDENTIALS_COPY } from "@/lib/auth/responses";
import { parseJsonObject, validateEmail } from "@/lib/auth/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email as string,
      password: body.password as string,
    });
    if (error) {
      // Same body for unknown email and wrong password (enumeration safety).
      return noStore(
        { error: "invalid_credentials", message: INVALID_CREDENTIALS_COPY },
        { status: 401 },
      );
    }
    return noStore({ ok: true });
  } catch (e) {
    if (isEnvConfigError(e)) return authUnavailable();
    throw e;
  }
}
