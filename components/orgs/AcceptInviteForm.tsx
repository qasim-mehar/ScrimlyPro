"use client";

import { useState } from "react";

import { acceptInviteAction } from "@/app/invite/[token]/actions";
import { buttonStyles } from "@/components/app/ui";

/**
 * Accept button for the invite page. The action redirects on both outcomes
 * (org page on success, ?used=1 back here on failure), so this only needs
 * busy state.
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
      className={`${buttonStyles.primary} w-full`}
    >
      {busy ? "Joining…" : "Accept invite"}
    </button>
  );
}
