import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import type { Db } from "@/lib/db/client";
import { withUserDb } from "@/lib/db/user";
import { sessions } from "@/lib/db/schema";
import { getAuthedUser, type AuthedUser } from "@/lib/supabase/server";

/**
 * Guard stack for server actions and server components (WP6).
 *
 * - `requireUser()`: the verified user, or redirect("/login").
 * - `assertSessionOwner(sessionId)`: verified user + proof they own the
 *   session. Missing and foreign sessions are INDISTINGUISHABLE — both
 *   render the 404 page via notFound() (never reveal existence).
 *
 * notFound()/redirect() only ever run here (server action/component layer),
 * never inside lib functions. `client` is dependency-injection for tests
 * (mirrors withUserDb); production request paths never pass it.
 */

export async function requireUser(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  return user;
}

export type SessionOwnerContext = { user: AuthedUser; sessionId: string };

export async function assertSessionOwner(
  sessionId: string,
  client?: Db,
): Promise<SessionOwnerContext> {
  const user = await requireUser();
  const found = await withUserDb({ sub: user.id }, async (userDb) => {
    return (
      (
        await userDb
          .select({ id: sessions.id })
          .from(sessions)
          // Belt AND suspenders: RLS filters foreign rows backstop-style;
          // the explicit predicate does the same even without RLS.
          .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
          .limit(1)
      )[0] ?? null
    );
  }, client);
  if (!found) notFound();
  return { user, sessionId };
}
