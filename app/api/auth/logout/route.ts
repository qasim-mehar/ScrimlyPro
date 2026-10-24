import { noStore } from "@/lib/http";
import { assertSameOrigin } from "@/lib/auth/origin-guard";
import {
  authUnavailable,
  forbidden,
  rateLimited,
} from "@/lib/auth/route-helpers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { LOGOUT_OK } from "@/lib/auth/responses";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isEnvConfigError(e: unknown): boolean {
  return (
    e instanceof Error && e.message.startsWith("Supabase env is not configured")
  );
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return forbidden();
  const rl = checkRateLimit("api", req);
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return noStore(LOGOUT_OK);
  } catch (e) {
    if (isEnvConfigError(e)) return authUnavailable();
    throw e;
  }
}
