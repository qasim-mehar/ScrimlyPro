import { and, desc, eq, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { orgInvites } from "@/lib/db/schema";
import { generateToken, hashToken } from "./tokens";

/**
 * Org invite lifecycle (pilot: copyable links, NO emails sent — SMTP is a
 * later phase). The raw token is returned exactly ONCE by createInvite; only
 * its SHA-256 hash is stored. Acceptance runs through the SECURITY DEFINER
 * function public.accept_org_invite (migration 0010) because the invitee has
 * no org role yet and the operation must be atomic/single-use.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, per the M2 brief

export type CreateInviteInput = {
  orgId: string;
  role: "admin" | "member";
  email: string | null;
  createdBy: string;
};

export type CreatedInvite = {
  id: string;
  /** Raw token — show once, never store/log. */
  token: string;
  expiresAt: string;
};

export async function createInvite(
  db: Db,
  input: CreateInviteInput,
): Promise<CreatedInvite> {
  const token = generateToken();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  await db.insert(orgInvites).values({
    id,
    orgId: input.orgId,
    role: input.role,
    // Email is optional metadata for the pilot (copyable links); stored in
    // lowercase only as a display hint, never used for delivery.
    email: input.email?.trim().toLowerCase() || null,
    tokenHash: hashToken(token),
    expiresAt,
    createdBy: input.createdBy,
  });
  return { id, token, expiresAt };
}

export type InviteRow = {
  id: string;
  email: string | null;
  role: "admin" | "member";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

/** Admin-facing list. Hashes are never selected. */
export async function listInvites(db: Db, orgId: string): Promise<InviteRow[]> {
  return db
    .select({
      id: orgInvites.id,
      email: orgInvites.email,
      role: orgInvites.role,
      expiresAt: orgInvites.expiresAt,
      acceptedAt: orgInvites.acceptedAt,
      createdAt: orgInvites.createdAt,
    })
    .from(orgInvites)
    .where(eq(orgInvites.orgId, orgId))
    .orderBy(desc(orgInvites.createdAt));
}

/** Revoke = delete the invite row (org admin action, RLS-scoped). */
export async function revokeInvite(
  db: Db,
  orgId: string,
  inviteId: string,
): Promise<void> {
  await db
    .delete(orgInvites)
    .where(and(eq(orgInvites.orgId, orgId), eq(orgInvites.id, inviteId)));
}

export type InvitePreview = {
  orgName: string;
  role: "admin" | "member";
};

/**
 * Token validation for the accept page (GET must not mutate — email/link
 * scanners prefetch). Runs the SECURITY DEFINER preview: zero rows for
 * unknown/expired/already-used tokens, indistinguishably.
 */
export async function previewInvite(
  db: Db,
  rawToken: string,
): Promise<InvitePreview | null> {
  const res = await db.execute(
    sql`select org_name, role from public.org_invite_preview(${hashToken(rawToken)})`,
  );
  const rows =
    (res as unknown as { rows?: Array<{ org_name: string; role: "admin" | "member" }> })
      .rows ??
    (res as unknown as Array<{ org_name: string; role: "admin" | "member" }>);
  const row = rows[0];
  if (!row) return null;
  return { orgName: row.org_name, role: row.role };
}

export type AcceptResult =
  | { ok: true; orgId: string }
  | { ok: false; reason: "invalid_or_used" };

/**
 * Accept an invite for the CURRENT user (server-verified; auth.uid() is read
 * inside the definer function). Single-use: two concurrent accepts race on
 * the UPDATE in accept_org_invite — exactly one wins, the other gets
 * invalid_or_used (same response as unknown/expired: no existence leakage).
 */
export async function acceptInvite(
  db: Db,
  rawToken: string,
): Promise<AcceptResult> {
  const res = await db.execute(
    sql`select public.accept_org_invite(${hashToken(rawToken)}) as org_id`,
  );
  const rows =
    (res as unknown as { rows?: Array<{ org_id: string | null }> }).rows ??
    (res as unknown as Array<{ org_id: string | null }>);
  const orgId = rows[0]?.org_id;
  if (!orgId) return { ok: false, reason: "invalid_or_used" };
  return { ok: true, orgId };
}
