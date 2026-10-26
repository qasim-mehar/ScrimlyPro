"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Per-tenant actions for the console. Each button opens an in-app dialog
 * (no raw window.prompt) and posts to an audited admin API route
 * (requireAdminApi + audit row). 404 from any route means the caller is not
 * an admin — surfaced as a plain error, no detail. Impersonate start
 * navigates AWAY with a full page load on success ("/" resolves the
 * effective identity there), mirroring the header ImpersonateDialog.
 */

type Mode = "disable" | "impersonate";

/** UI-level gate; the server enforces its own 1–500 bound independently. */
function isValidReason(value: string, min: number): boolean {
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= 500;
}

export function TenantActions({
  userId,
  email,
  disabled,
}: {
  userId: string;
  email: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  function close() {
    setMode(null);
    setReason("");
    setError(null);
  }

  useEffect(() => {
    if (mode) reasonRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode]);

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
        return false;
      }
      return true;
    } catch {
      setError("Request failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!mode) return;
    const min = mode === "impersonate" ? 10 : 1;
    if (!isValidReason(reason, min)) return;
    if (mode === "disable") {
      const ok = await post("/api/admin/tenants/disable", { userId, reason: reason.trim() });
      if (ok) {
        close();
        router.refresh();
      }
    } else {
      const ok = await post("/api/admin/impersonate/start", {
        targetUserId: userId,
        reason: reason.trim(),
      });
      if (ok) {
        // Full page load on purpose: "/" resolves the effective (target)
        // identity and no admin client state may survive the switch.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      }
    }
  }

  const btn =
    "min-h-8 rounded-full border border-[var(--hq-line)] px-3 text-xs font-semibold text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface-subtle)] hover:text-[var(--hq-ink)] disabled:opacity-50";

  return (
    <>
      <span className="flex items-center justify-end gap-2">
        {disabled ? (
          <button
            type="button"
            onClick={() => {
              void (async () => {
                if (await post("/api/admin/tenants/enable", { userId })) router.refresh();
              })();
            }}
            disabled={busy}
            className={btn}
          >
            Enable
          </button>
        ) : (
          <button type="button" onClick={() => setMode("disable")} disabled={busy} className={btn}>
            Disable
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("impersonate")}
          disabled={busy || disabled}
          className={btn}
          title={disabled ? "Cannot impersonate a disabled tenant" : undefined}
        >
          Impersonate
        </button>
        {error && !mode && (
          <span className="text-xs text-[var(--hq-danger-ink)]">{error}</span>
        )}
      </span>

      {mode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={mode === "disable" ? "Disable tenant" : "Impersonate tenant"}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close dialog"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[20px] bg-[var(--hq-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="px-6 pb-6 pt-5">
              <h2 className="text-[16px] font-bold text-[var(--hq-ink)]">
                {mode === "disable" ? "Disable this tenant?" : "Impersonate this user?"}
              </h2>
              <p className="mt-1 truncate text-[14px] font-semibold text-[var(--hq-ink)]">
                {email ?? "(no email)"}
              </p>
              {mode === "disable" ? (
                <>
                  <p className="mt-2 text-[13px] leading-5 text-[var(--hq-ink-2)]">
                    The account is locked out of every signed-in surface at its
                    next request. You can re-enable it here anytime.
                  </p>
                  <label
                    htmlFor="tenant-reason"
                    className="mt-4 block text-[13px] font-medium text-[var(--hq-ink-2)]"
                  >
                    Reason (required, stored in the audit log)
                  </label>
                  <textarea
                    id="tenant-reason"
                    ref={reasonRef}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Support ticket #, reported abuse…"
                    className="mt-1.5 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] p-3 text-[14px] text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)]"
                  />
                </>
              ) : (
                <>
                  <p className="mt-2 text-[13px] leading-5 text-[var(--hq-ink-2)]">
                    You will browse as this user for up to 30 minutes; the
                    member surface opens when you start.
                  </p>
                  <label
                    htmlFor="tenant-reason"
                    className="mt-4 block text-[13px] font-medium text-[var(--hq-ink-2)]"
                  >
                    Reason (required, 10–500 chars — stored in the audit log)
                  </label>
                  <textarea
                    id="tenant-reason"
                    ref={reasonRef}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Support ticket #, what you're investigating…"
                    className="mt-1.5 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] p-3 text-[14px] text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)] focus:border-[var(--hq-ink-4)]"
                  />
                </>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-[8px] bg-[var(--hq-danger-bg)] px-3 py-2 text-[13px] text-[var(--hq-danger-ink)]"
                >
                  {error}
                </p>
              )}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="h-10 rounded-full px-4 text-[14px] font-medium text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface-subtle)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !isValidReason(reason, mode === "impersonate" ? 10 : 1)}
                  onClick={() => {
                    void confirmAction();
                  }}
                  className={`h-10 rounded-full px-5 text-[14px] font-semibold text-white disabled:opacity-40 ${
                    mode === "disable" ? "bg-[var(--hq-danger-ink)]" : "bg-[var(--hq-ink)]"
                  }`}
                >
                  {busy
                    ? mode === "disable"
                      ? "Disabling…"
                      : "Starting…"
                    : mode === "disable"
                      ? "Disable tenant"
                      : "Start impersonation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
