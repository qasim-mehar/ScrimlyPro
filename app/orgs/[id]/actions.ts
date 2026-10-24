"use server";

import { revalidatePath } from "next/cache";

import { requireOrgRole } from "@/lib/orgs/roles";
import { withUserDb } from "@/lib/db/user";
import { createInvite, revokeInvite } from "@/lib/orgs/invites";
import { removeMember, LastOwnerError } from "@/lib/orgs/roles";
import type { InviteFormState } from "@/components/orgs/InviteForm";
import type { MemberActionState } from "@/components/orgs/MemberActions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Org management server actions. Every action re-derives the caller's role
 * server-side (requireOrgRole — verified identity + DB membership); form
 * input is only ever the target of the operation, never the authority.
 */

function badState(message: string): InviteFormState {
  return { kind: "error", message };
}

export async function createInviteAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const orgId = String(formData.get("orgId") ?? "");
  const role = String(formData.get("role") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!UUID_RE.test(orgId)) return badState("Unknown organization.");
  if (role !== "admin" && role !== "member") {
    return badState("Pick a role for the invite.");
  }
  if (email && (!email.includes("@") || email.length > 320)) {
    return badState("That email doesn't look valid.");
  }

  try {
    // 404s for foreign/missing orgs (existence never confirmed).
    const { user } = await requireOrgRole(orgId, "admin");
    const invite = await withUserDb({ sub: user.id }, (userDb) =>
      createInvite(userDb, {
        orgId,
        role,
        email: email || null,
        createdBy: user.id,
      }),
    );
    const origin = process.env.APP_ORIGIN?.replace(/\/$/, "") ?? "";
    // No APP_ORIGIN in dev: relative link still copyable and correct.
    const url = origin
      ? `${origin}/invite/${invite.token}`
      : `/invite/${invite.token}`;
    void formData;
    return { kind: "link", url, expiresAt: invite.expiresAt };
  } catch (error) {
    if (isNotFoundRedirect(error)) {
      return badState("You don't have access to that organization.");
    }
    console.error("createInviteAction failed:", error);
    return badState("Could not create the invite. Please try again.");
  }
}

export async function revokeInviteAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const orgId = String(formData.get("orgId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!UUID_RE.test(orgId) || !UUID_RE.test(inviteId)) {
    return { message: "Unknown invite." };
  }
  try {
    const { user } = await requireOrgRole(orgId, "admin");
    await withUserDb({ sub: user.id }, (userDb) =>
      revokeInvite(userDb, orgId, inviteId),
    );
    revalidatePath(`/orgs/${orgId}`);
    return { message: null };
  } catch (error) {
    if (isNotFoundRedirect(error)) {
      return { message: "You don't have access to that organization." };
    }
    console.error("revokeInviteAction failed:", error);
    return { message: "Could not revoke the invite. Please try again." };
  }
}

export async function removeMemberAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const orgId = String(formData.get("orgId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!UUID_RE.test(orgId) || !UUID_RE.test(userId)) {
    return { message: "Unknown member." };
  }
  try {
    const { user } = await requireOrgRole(orgId, "admin");
    await withUserDb({ sub: user.id }, (userDb) =>
      removeMember(userDb, orgId, userId),
    );
    revalidatePath(`/orgs/${orgId}`);
    return { message: null };
  } catch (error) {
    if (error instanceof LastOwnerError) {
      return {
        message: "An organization needs at least one owner — promote another owner first.",
      };
    }
    if (isNotFoundRedirect(error)) {
      return { message: "You don't have access to that organization." };
    }
    console.error("removeMemberAction failed:", error);
    return { message: "Could not remove the member. Please try again." };
  }
}

/** next/navigation control-flow throws must bubble, not become error copy. */
function isNotFoundRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND") ||
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"))
  );
}
