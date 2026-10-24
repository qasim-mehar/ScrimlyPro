"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { acceptInvite } from "@/lib/orgs/invites";

/**
 * Accept an org invite (POST server action — GET on the page NEVER mutates,
 * so link/email prefetch scanners cannot burn the single-use token).
 * requireUser() redirects anonymous visitors to /login first; acceptance
 * itself runs through the SECURITY DEFINER accept_org_invite (single-use,
 * hash-validated). Failure redirects back with ?used=1 — the friendly
 * "invalid, expired, or already used" state; success lands on the org page.
 */
export async function acceptInviteAction(token: string): Promise<void> {
  const user = await requireUser();
  const result = await withUserDb({ sub: user.id }, (userDb) =>
    acceptInvite(userDb, token),
  );
  if (!result.ok) {
    redirect(`/invite/${encodeURIComponent(token)}?used=1`);
  }
  redirect(`/orgs/${result.orgId}`);
}
