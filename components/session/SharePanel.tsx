"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CopyIcon, ShareIcon } from "@/components/app/icons";
import { buttonStyles, compactButtonStyles } from "@/components/app/ui";
import { CopyField } from "@/components/orgs/CopyField";

export type ShareLink = {
  id: string;
  createdAt: string;
  revokedAt: string | null;
};

/**
 * "Share standings" panel (org member+): POST /api/sessions/[id]/share
 * returns the raw /share/<token> URL EXACTLY once (shown via CopyField);
 * active links can be revoked after an inline confirm (DELETE — viewers
 * lose access immediately, so it is never a one-click action). Hashes never
 * reach the client. The list follows the server props (router.refresh()
 * after each mutation) so creating a second link needs no reload.
 */
export function SharePanel({
  sessionId,
  links,
}: {
  sessionId: string;
  links: ShareLink[];
}) {
  const router = useRouter();
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
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
      router.refresh();
    } catch {
      setError("Could not create the share link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink(linkId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/share`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      if (res.ok) {
        setRevoked((prev) => ({ ...prev, [linkId]: true }));
        setRevokingId(null);
        router.refresh();
      } else {
        setError("Could not revoke that link.");
      }
    } catch {
      setError("Could not revoke that link.");
    } finally {
      setBusy(false);
    }
  }

  const activeLinks = links.filter((l) => !l.revokedAt && !revoked[l.id]);

  return (
    <section
      id="share"
      aria-labelledby="share-heading"
      className="scroll-mt-24 rounded-dash bg-dash-surface p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-dash-sm bg-dash-lime text-dash-ink">
          <ShareIcon width="18" height="18" />
        </span>
        <div className="min-w-0">
          <h2 id="share-heading" className="text-base font-bold text-dash-ink">
            Share standings
          </h2>
          <p className="mt-0.5 text-[13px] leading-5 text-dash-ink3">
            A public, read-only link to this scrim&apos;s table. No accounts or
            personal data.
          </p>
        </div>
      </div>

      {createdUrl ? (
        <div className="mt-4 rounded-[12px] bg-dash-bg p-3">
          <CopyField
            value={createdUrl}
            label="Shown once — copy it now. You can revoke it anytime."
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void createLink();
            }}
            className={`${compactButtonStyles.quiet} mt-2 w-full`}
          >
            {busy ? "Creating…" : "Create another link"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void createLink();
          }}
          className={`${buttonStyles.primary} mt-4 w-full`}
        >
          <CopyIcon width="16" height="16" />
          {busy ? "Creating…" : "Create public link"}
        </button>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-[13px] font-medium text-dash-danger-ink">
          {error}
        </p>
      ) : null}

      {activeLinks.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
            Active links
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {activeLinks.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between gap-2 rounded-[10px] bg-dash-bg px-3 py-1.5"
              >
                <span className="text-xs text-dash-ink3">
                  Created {link.createdAt.slice(0, 10)}
                </span>
                {revokingId === link.id ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-dash-ink2">
                      Viewers lose access now
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void revokeLink(link.id);
                      }}
                      className={compactButtonStyles.danger}
                    >
                      {busy ? "Revoking…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRevokingId(null)}
                      className={compactButtonStyles.quiet}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRevokingId(link.id)}
                    className={compactButtonStyles.quiet}
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
