import { and, eq } from "drizzle-orm";

import { withUserDb } from "@/lib/db/user";
import { noStore } from "@/lib/http";
import { fetchOrgRole } from "@/lib/orgs/orgs";
import { appOriginFromRequest } from "@/lib/orgs/origin";
import { withTenantRoute } from "@/lib/auth/route-guard";
import { createShareLink, revokeShareLink } from "@/lib/share/links";
import { sessions } from "@/lib/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireOrgMemberRole(
  userId: string,
  sessionId: string,
): Promise<string | null> {
  return withUserDb({ sub: userId }, async (userDb) => {
    // The session's org, checked with the explicit membership predicate
    // (belt) — foreign/missing sessions are indistinguishable (null).
    const rows = await userDb
      .select({ orgId: sessions.orgId })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId)))
      .limit(1);
    const session = rows[0];
    if (!session) return null;
    return fetchOrgRole(userDb, session.orgId, userId);
  });
}

/**
 * POST /api/sessions/[id]/share — create a public standings share link
 * (org member+). 201 with the RAW link (<origin>/share/<token>) exactly
 * once; only the SHA-256 hash is stored. Foreign/missing session → 404.
 */
export const POST = withTenantRoute<{ id: string }>(async (request, { user, params }) => {
  const sessionId = params.id;
  if (!UUID_RE.test(sessionId)) {
    return noStore({ error: "not found" }, { status: 404 });
  }

  const role = await requireOrgMemberRole(user.id, sessionId);
  if (!role) return noStore({ error: "not found" }, { status: 404 });

  const link = await withUserDb({ sub: user.id }, (userDb) =>
    createShareLink(userDb, sessionId, user.id),
  );
  const origin = appOriginFromRequest(request);
  return noStore(
    { url: `${origin}/share/${link.token}` },
    { status: 201 },
  );
});

/**
 * DELETE /api/sessions/[id]/share — revoke (member+). Body: { linkId }.
 * A foreign linkId (another session's) affects zero rows → same 404 shape.
 */
export const DELETE = withTenantRoute<{ id: string }>(async (request, { user, params }) => {
  const sessionId = params.id;
  if (!UUID_RE.test(sessionId)) {
    return noStore({ error: "not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore({ error: "bad_request" }, { status: 400 });
  }
  const linkId = (body as { linkId?: unknown } | null)?.linkId;
  if (typeof linkId !== "string" || !UUID_RE.test(linkId)) {
    return noStore({ error: "bad_request", message: "linkId required" }, { status: 400 });
  }

  const role = await requireOrgMemberRole(user.id, sessionId);
  if (!role) return noStore({ error: "not found" }, { status: 404 });

  const revoked = await withUserDb({ sub: user.id }, (userDb) =>
    revokeShareLink(userDb, sessionId, linkId),
  );
  if (revoked === 0) {
    return noStore({ error: "not found" }, { status: 404 });
  }
  return noStore({ ok: true });
});
