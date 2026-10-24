"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";
import { withUserDb } from "@/lib/db/user";
import { createOrg } from "@/lib/orgs/orgs";

export type CreateOrgState = { message: string | null };

/**
 * Create an org (verified user becomes the owner; default quota row minted
 * in the same tx) and land on the members page.
 */
export async function createOrgAction(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) {
    return { message: "Name must be 1–80 characters." };
  }

  const user = await requireUser();
  let orgId: string;
  try {
    orgId = await withUserDb({ sub: user.id }, (userDb) =>
      createOrg(userDb, name, user.id),
    );
  } catch (error) {
    console.error("createOrgAction failed:", error);
    return { message: "Could not create the organization. Please try again." };
  }
  redirect(`/orgs/${orgId}`);
}
