import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { isUserDisabled } from "@/lib/admin/kill-switch";
import { getEffectiveUser } from "@/lib/admin/impersonation";
import type { Db } from "@/lib/db/client";
import { withUserDb, withUserDbForTest } from "@/lib/db/user";
import { sessions } from "@/lib/db/schema";
import type { AuthedUser } from "@/lib/supabase/server";

/**
 * Guard stack for server actions and server components (WP6).
 *
 * - `requireUser()`: the verified user (M3: EFFECTIVE identity — the
 *   impersonation target when a valid impersonation cookie is present,
 *   otherwise the real user), or redirect("/login"). A tenant carrying the
 *   reserved `disabled` marker is locked out of every authed page/action —
 *   bounced to /login?disabled=1 (plain "Account disabled" copy, no detail).
 *   Admin routes use requireAdmin (REAL identity) and never this seam.
 * - `assertSessionOwner(sessionId)`: verified user + proof they own the
 *   session. Missing and foreign sessions are INDISTINGUISHABLE — both
 *   render the 404 page via notFound() (never reveal existence).
 *
 * notFound()/redirect() only ever run here (server action/component layer),
 * never inside lib functions. `client` is dependency-injection for tests
 * (mirrors withUserDb); production request paths never pass it.
 */

export async function requireUser(): Promise<AuthedUser> {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  if (await isUserDisabled(user.id)) redirect("/login?disabled=1");
  return user;
}

export type SessionOwnerContext = { user: AuthedUser; sessionId: string };

/**
 * Production path: verified user + proof they own the session (404 for
 * missing AND foreign, identically). Tests use assertSessionOwnerForTest.
 */
export async function assertSessionOwner(
  sessionId: string,
): Promise<SessionOwnerContext> {
  const user = await requireUser();
  const found = await withUserDb({ sub: user.id }, (userDb) =>
    findOwnedSession(userDb, user.id, sessionId),
  );
  if (!found) notFound();
  return { user, sessionId };
}

/** Test-only variant operating on an injected client. */
export async function assertSessionOwnerForTest(
  client: Db,
  sessionId: string,
): Promise<SessionOwnerContext> {
  const user = await requireUser();
  const found = await withUserDbForTest(
    { sub: user.id },
    (userDb) => findOwnedSession(userDb, user.id, sessionId),
    client,
  );
  if (!found) notFound();
  return { user, sessionId };
}

async function findOwnedSession(
  userDb: Db,
  userId: string,
  sessionId: string,
): Promise<{ id: string } | null> {
  return (
    (
      await userDb
        .select({ id: sessions.id })
        .from(sessions)
        // Belt AND suspenders: RLS filters foreign rows backstop-style;
        // the explicit predicate does the same even without RLS.
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
        .limit(1)
    )[0] ?? null
  );
}
