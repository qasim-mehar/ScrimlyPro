"use client";

import { useState } from "react";

import { acceptInviteAction } from "@/app/invite/[token]/actions";

/**
 * Accept button for the invite page. The action redirects on both outcomes
 * (org page on success, ?used=1 back here on failure), so this only needs
 * busy state — 44px target per the app aesthetic.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void acceptInviteAction(token).finally(() => setBusy(false));
      }}
      className="min-h-11 w-full rounded-lg bg-gold font-display text-lg font-semibold text-bg disabled:opacity-50"
    >
      {busy ? "Joining…" : "Accept invite"}
    </button>
  );
}
