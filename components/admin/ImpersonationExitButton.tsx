"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Exit control for the impersonation banner. Posts the stop endpoint
 * (cookie-holder mode — the admin's own session revokes the row) and
 * returns the admin to their console.
 */
export function ImpersonationExitButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await fetch("/api/admin/impersonate/stop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      router.push("/admin/tenants");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={stop}
      disabled={busy}
      className="min-h-9 shrink-0 rounded-full bg-dash-ink px-4 text-xs font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
    >
      Exit impersonation
    </button>
  );
}
