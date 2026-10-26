"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Per-tenant actions for the console. Each button posts to an audited admin
 * API route (requireAdminApi + audit row). 404 from any route means the
 * caller is not an admin — surfaced as a plain error, no detail.
 * M6: restyled into the light shell — logic unchanged.
 */
export function TenantActions({
  userId,
  disabled,
}: {
  userId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(res.status === 404 ? "Not authorized." : `Failed (${res.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function disable() {
    const reason = window.prompt("Reason for disabling this tenant (audited):");
    if (!reason) return;
    void post("/api/admin/tenants/disable", { userId, reason });
  }

  function enable() {
    void post("/api/admin/tenants/enable", { userId });
  }

  function impersonate() {
    const reason = window.prompt("Reason for impersonating (audited):");
    if (!reason) return;
    void post("/api/admin/impersonate/start", { targetUserId: userId, reason });
  }

  const btn =
    "min-h-8 rounded-full border border-[var(--hq-line)] px-3 text-xs font-semibold text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface-subtle)] hover:text-[var(--hq-ink)] disabled:opacity-50";

  return (
    <span className="flex items-center justify-end gap-2">
      {disabled ? (
        <button type="button" onClick={enable} disabled={busy} className={btn}>
          Enable
        </button>
      ) : (
        <button type="button" onClick={disable} disabled={busy} className={btn}>
          Disable
        </button>
      )}
      <button
        type="button"
        onClick={impersonate}
        disabled={busy || disabled}
        className={btn}
        title={disabled ? "Cannot impersonate a disabled tenant" : undefined}
      >
        Impersonate
      </button>
      {error && <span className="text-xs text-[var(--hq-danger-ink)]">{error}</span>}
    </span>
  );
}
