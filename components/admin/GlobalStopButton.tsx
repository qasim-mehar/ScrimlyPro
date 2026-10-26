"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Global stop for any active impersonation row (dashboard). Posts stop
 * with the row id — requireAdminApi enforces the real-admin path.
 * M6: restyled into the light shell — behavior unchanged.
 */
export function GlobalStopButton({ impersonationId }: { impersonationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await fetch("/api/admin/impersonate/stop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: impersonationId }),
      });
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
      className="min-h-8 rounded-full bg-[var(--hq-danger-bg)] px-3 text-xs font-semibold text-[var(--hq-danger-ink)] hover:brightness-95 disabled:opacity-50"
    >
      Stop
    </button>
  );
}
