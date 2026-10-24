import { and, asc, eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { shareLinks } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/orgs/tokens";

/**
 * Share-link lifecycle (RLS-scoped paths; the PUBLIC read projection lives
 * in public-reader.ts on the admin client). Raw tokens: 32 random bytes,
 * returned exactly once by createShareLink; only the SHA-256 hash is stored.
 */

export type CreatedShareLink = {
  id: string;
  /** Raw token — show once, never store/log. */
  token: string;
};

export async function createShareLink(
  db: Db,
  sessionId: string,
  createdBy: string,
): Promise<CreatedShareLink> {
  const token = generateToken();
  const id = crypto.randomUUID();
  await db.insert(shareLinks).values({
    id,
    sessionId,
    tokenHash: hashToken(token),
    createdBy,
    // expiresAt stays NULL for pilot share links — revocation is the control.
  });
  return { id, token };
}

export type ShareLinkRow = {
  id: string;
  createdAt: string;
  revokedAt: string | null;
};

/** Member-facing list — hashes are never selected. */
export async function listShareLinks(
  db: Db,
  sessionId: string,
): Promise<ShareLinkRow[]> {
  return db
    .select({
      id: shareLinks.id,
      createdAt: shareLinks.createdAt,
      revokedAt: shareLinks.revokedAt,
    })
    .from(shareLinks)
    .where(eq(shareLinks.sessionId, sessionId))
    .orderBy(asc(shareLinks.createdAt));
}

/** Revoke (member+; RLS scopes the row). Returns rows actually revoked. */
export async function revokeShareLink(
  db: Db,
  sessionId: string,
  linkId: string,
): Promise<number> {
  const rows = await db
    .update(shareLinks)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(eq(shareLinks.sessionId, sessionId), eq(shareLinks.id, linkId)),
    )
    .returning({ id: shareLinks.id });
  return rows.length;
}
