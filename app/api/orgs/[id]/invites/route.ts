import { withUserDb } from "@/lib/db/user";
import { noStore } from "@/lib/http";
import { createInvite } from "@/lib/orgs/invites";
import { appOriginFromRequest } from "@/lib/orgs/origin";
import { fetchOrgRole, roleAtLeast } from "@/lib/orgs/orgs";
import { withOrgRoute } from "@/lib/orgs/route-guard";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/orgs/[id]/invites — mint a single-use invite link (admin+).
 * Guarded: withOrgRoute (origin/identity/rate-limit) + requireOrgRole(admin).
 * Response carries the RAW link exactly once (`<origin>/invite/<token>`);
 * only its SHA-256 hash is stored. Pilot: no emails are sent — the admin
 * copies the link. Body: { role: "admin" | "member", email?: string }.
 */
export const POST = withOrgRoute<{ id: string }>(async (request, { user, params }) => {
  const orgId = params.id;
  if (!UUID_RE.test(orgId)) {
    return noStore({ error: "not found" }, { status: 404 });
  }

  // Belt: verified membership at admin+ (404 for foreign/missing orgs —
  // indistinguishable; existence never confirmed to non-members).
  const role = await withUserDb({ sub: user.id }, (userDb) =>
    fetchOrgRole(userDb, orgId, user.id),
  );
  if (!role || !roleAtLeast(role, "admin")) {
    return noStore({ error: "not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore({ error: "bad_request" }, { status: 400 });
  }
  const { role: inviteRole, email } = (body ?? {}) as {
    role?: unknown;
    email?: unknown;
  };
  if (inviteRole !== "admin" && inviteRole !== "member") {
    return noStore(
      { error: "bad_request", message: "role must be 'admin' or 'member'" },
      { status: 400 },
    );
  }
  if (
    email !== undefined &&
    email !== null &&
    email !== "" &&
    (typeof email !== "string" || email.length > 320 || !email.includes("@"))
  ) {
    return noStore(
      { error: "bad_request", message: "email must be a valid address" },
      { status: 400 },
    );
  }

  const origin = appOriginFromRequest(request);
  const invite = await withUserDb({ sub: user.id }, (userDb) =>
    createInvite(userDb, {
      orgId,
      role: inviteRole,
      email: typeof email === "string" && email.trim() !== "" ? email : null,
      createdBy: user.id,
    }),
  );

  // The raw token exists in exactly this response. It is never stored,
  // logged, or returned again.
  return noStore(
    {
      url: `${origin}/invite/${invite.token}`,
      expiresAt: invite.expiresAt,
    },
    { status: 201 },
  );
});
