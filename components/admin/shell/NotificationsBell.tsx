"use client";

import { useEffect, useRef, useState } from "react";

import { IconBell, IconInbox } from "./icons";

/**
 * Notification bell (§5): latest audit_log rows humanized by the server
 * ("N started impersonating X", "Y signed in", …). The red dot appears when
 * an event is newer than the admin's last seen marker; the read state lives
 * in localStorage ONLY (per spec — no server write, no audit noise).
 */

export type BellEvent = { id: string; createdAt: string; text: string };

const SEEN_KEY = "m6.admin.bellSeenAt";

function relTime(iso: string, now: number | null): string {
  if (now == null) return "—";
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationsBell({ events }: { events: BellEvent[] }) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // One frame later — setState must not run synchronously inside effects
    // (react-hooks/set-state-in-effect) and SSR renders with no clock.
    const id = requestAnimationFrame(() => {
      try {
        setSeenAt(window.localStorage.getItem(SEEN_KEY));
      } catch {
        setSeenAt(null);
      }
      setNow(Date.now());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const newest = events[0]?.createdAt ?? null;
  const hasUnseen =
    newest != null && (seenAt == null || new Date(newest) > new Date(seenAt));

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      setSeenAt(now);
      try {
        window.localStorage.setItem(SEEN_KEY, now);
      } catch {
        // storage unavailable — dot state simply stays session-local
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Platform notifications${hasUnseen ? " (unseen events)" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface)]"
      >
        <IconBell />
        {hasUnseen && (
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white"
            style={{ backgroundColor: "var(--hq-danger-dot)" }}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-[340px] overflow-hidden rounded-[20px] bg-[var(--hq-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="border-b border-[var(--hq-line)] px-5 py-3 text-[14px] font-bold text-[var(--hq-ink)]">
            Platform activity
          </p>
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-[var(--hq-ink-3)]">
              <IconInbox size={20} />
              <p className="text-[13px]">No platform events yet.</p>
            </div>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="border-b border-[var(--hq-bg)] px-5 py-3 last:border-b-0"
                >
                  <p className="text-[13px] leading-snug text-[var(--hq-ink-2)]">
                    {ev.text}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--hq-ink-3)]">
                    {relTime(ev.createdAt, now)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
