"use client";

import { useState } from "react";

import { CopyField } from "@/components/orgs/CopyField";

export type ShareLink = {
  id: string;
  createdAt: string;
  revokedAt: string | null;
};

/**
 * "Share standings" panel (org member+): POST /api/sessions/[id]/share
 * returns the raw /share/<token> URL EXACTLY once (shown via CopyField);
 * active links can be revoked (DELETE). Hashes never reach the client.
 */
export function SharePanel({
  sessionId,
  links,
}: {
  sessionId: string;
  links: ShareLink[];
}) {
  const [initial] = useState(links);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<Record<string, boolean>>({});

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/share`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Could not create the share link. Please try again.");
        return;
      }
      const body = (await res.json()) as { url: string };
      setCreatedUrl(body.url);
    } catch {
      setError("Could not create the share link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink(linkId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/share`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      if (res.ok) setRevoked((prev) => ({ ...prev, [linkId]: true }));
      else setError("Could not revoke that link.");
    } catch {
      setError("Could not revoke that link.");
    }
  }

  const activeLinks = initial.filter(
    (l) => !l.revokedAt && !revoked[l.id],
  );

  return (
    <section className="flex flex-col gap-3">
      {createdUrl ? (
        <CopyField
          value={createdUrl}
          label="Public standings link — works for anyone with the link. Shown once; revoke anytime:"
        />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void createLink();
          }}
          className="min-h-[44px] rounded-lg border border-line px-4 text-sm font-semibold text-muted disabled:opacity-50"
        >
          {busy ? "Creating…" : "Share standings"}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {activeLinks.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {activeLinks.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <span className="text-xs text-muted">
                created {link.createdAt.slice(0, 10)}
              </span>
              <button
                type="button"
                onClick={() => {
                  void revokeLink(link.id);
                }}
                className="min-h-11 rounded-lg border border-line px-3 text-sm text-muted"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
