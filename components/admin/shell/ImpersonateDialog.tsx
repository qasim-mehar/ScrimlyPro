"use client";

import { useEffect, useRef, useState } from "react";

import { IconPlus, IconX } from "./icons";

/**
 * "+ Impersonate" support dialog (§5/§6): search a user (admin search API),
 * enter a reason (≥10 chars, required — the audited record's why), confirm
 * the target + 30-minute expiry, then POST the EXISTING start endpoint and
 * navigate AWAY to the member surface ("/" resolves the effective identity
 * there). The admin surface is never rendered as the target. An admin who
 * is already impersonating gets the API's 403 surfaced with a stop-first
 * hint.
 */

type Candidate = { id: string; email: string | null };

type Phase = "search" | "confirm" | "starting" | "error";

/**
 * UI-level reason gate (stricter than the API's 1-500: support reasons
 * deserve a sentence). The server independently enforces its own bounds —
 * this is UX, not a security boundary.
 */
export function isValidReason(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 10 && trimmed.length <= 500;
}

export function ImpersonateDialog() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("search");
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [target, setTarget] = useState<Candidate | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close paths run through here so the reset is event-driven (setState
  // must not run synchronously inside effects).
  function close() {
    setOpen(false);
    setPhase("search");
    setQ("");
    setCandidates([]);
    setTarget(null);
    setReason("");
    setError(null);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Debounced user search (same admin API as the palette; users only).
  useEffect(() => {
    if (!open || target) return;
    const needle = q.trim();
    const timer = setTimeout(async () => {
      if (needle.length === 0) {
        setCandidates([]);
        return;
      }
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(needle)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { users: Candidate[] };
        setCandidates(data.users.slice(0, 5));
      } catch {
        setCandidates([]);
      }
    }, needle.length === 0 ? 0 : 200);
    return () => clearTimeout(timer);
  }, [q, open, target]);

  async function start() {
    if (!target) return;
    setPhase("starting");
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: target.id, reason: reason.trim() }),
      });
      if (res.status === 403) {
        setPhase("error");
        setError(
          "An impersonation is already active in this browser. Stop it first (the banner on the member surface) — then start a new one.",
        );
        return;
      }
      if (!res.ok) {
        setPhase("error");
        setError("Impersonation could not be started. Check the reason length (10–500 chars) and try again.");
        return;
      }
      // Success: navigate AWAY from the admin surface with a FULL page
      // load — "/" resolves the effective (target) identity and renders the
      // member surface; a hard reload guarantees no admin client state
      // survives the identity switch (deliberate, hence the disable).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch {
      setPhase("error");
      setError("Network error — try again.");
    }
  }

  const reasonValid = isValidReason(reason);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-1.5 rounded-full bg-[var(--hq-ink)] px-5 text-sm font-semibold text-white hover:bg-black"
      >
        <IconPlus size={16} />
        Impersonate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Impersonate a user"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close impersonation dialog"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[20px] bg-[var(--hq-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-[16px] font-bold text-[var(--hq-ink)]">
                Impersonate a user
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--hq-ink-3)] hover:bg-[var(--hq-surface-subtle)]"
              >
                <IconX size={16} />
              </button>
            </div>

            {phase === "search" && !target && (
              <div className="px-6 pb-6 pt-3">
                <label
                  htmlFor="imp-user-search"
                  className="text-[13px] font-medium text-[var(--hq-ink-2)]"
                >
                  Find the user
                </label>
                <input
                  ref={inputRef}
                  id="imp-user-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by email"
                  className="mt-1.5 h-10 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-[14px] text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-4)] focus:border-[var(--hq-ink-4)]"
                />
                <ul className="mt-2 divide-y divide-[var(--hq-bg)]" aria-label="User results">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setTarget(c)}
                        className="w-full px-2 py-2.5 text-left text-[14px] text-[var(--hq-ink)] hover:bg-[var(--hq-surface-subtle)]"
                      >
                        {c.email ?? "(no email)"}
                      </button>
                    </li>
                  ))}
                  {q.trim().length > 0 && candidates.length === 0 && (
                    <li className="px-2 py-3 text-[13px] text-[var(--hq-ink-4)]">
                      No users match.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {target && (
              <div className="px-6 pb-6 pt-3">
                <p className="text-[13px] font-medium text-[var(--hq-ink-2)]">
                  Impersonating
                </p>
                <p className="mt-1 truncate text-[16px] font-bold text-[var(--hq-ink)]">
                  {target.email ?? "(no email)"}
                </p>
                <label
                  htmlFor="imp-reason"
                  className="mt-4 block text-[13px] font-medium text-[var(--hq-ink-2)]"
                >
                  Reason (required, 10–500 chars — stored in the audit log)
                </label>
                <textarea
                  id="imp-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Support ticket #, what you're investigating…"
                  className="mt-1.5 w-full rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] p-3 text-[14px] text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-4)] focus:border-[var(--hq-ink-4)]"
                />
                <p className="mt-2 text-[12px] text-[var(--hq-ink-4)]">
                  Session expires in 30 minutes · every action is attributed to
                  you · the member surface opens when you start.
                </p>
                {phase === "error" && error && (
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
                    onClick={() => setTarget(null)}
                    className="h-10 rounded-full px-4 text-[14px] font-medium text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface-subtle)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!reasonValid || phase === "starting"}
                    onClick={start}
                    className="h-10 rounded-full bg-[var(--hq-ink)] px-5 text-[14px] font-semibold text-white disabled:opacity-40"
                  >
                    {phase === "starting" ? "Starting…" : "Start impersonation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
