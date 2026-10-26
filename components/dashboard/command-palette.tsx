"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { SearchIcon } from "@/components/dashboard/icons";

/**
 * ⌘K command palette (M5 §4.4/§10): fuzzy server search over sessions +
 * matches via /api/dashboard/search, keyboard-navigable (↑ ↓ ⏎ ⎋), Enter
 * navigates to the real route (session detail / match review). Results are
 * org-scoped server-side; the palette is pure presentation.
 */

type SearchResults = {
  sessions: Array<{ id: string; name: string; code: string; status: string }>;
  matches: Array<{
    sessionId: string;
    sessionName: string;
    matchNo: number;
    status: string;
  }>;
};

const EMPTY: SearchResults = { sessions: [], matches: [] };

export function CommandPalette({ orgParam }: { orgParam?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Empty-query display state is DERIVED (open && q non-empty), never set
  // in the fetch effect below.
  const shown =
    open && q.trim().length > 0 ? results : { sessions: [], matches: [] };

  const flat = [
    ...shown.sessions.map((s) => ({
      href: `/sessions/${s.id}`,
      label: s.name,
      meta: `${s.code} · ${s.status}`,
    })),
    ...shown.matches.map((m) => ({
      href: `/sessions/${m.sessionId}/matches/${m.matchNo}`,
      label: `Match ${m.matchNo} · ${m.sessionName}`,
      meta: m.status === "confirmed" ? "scored" : "draft",
    })),
  ];

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setResults(EMPTY);
    setActive(0);
  }, []);

  // Global ⌘K / Ctrl+K opens.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced fetch (200ms) — only for non-empty queries.
  useEffect(() => {
    if (!open || q.trim().length === 0) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q });
        if (orgParam) params.set("org", orgParam);
        const res = await fetch(`/api/dashboard/search?${params}`);
        if (res.ok) setResults((await res.json()) as SearchResults);
        else setResults(EMPTY);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
        setActive(0);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, orgParam]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      close();
      router.push(flat[active].href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search sessions, matches, team (Command K)"
        className="flex h-11 w-full max-w-[340px] items-center gap-3 rounded-dash-sm border border-dash-line bg-dash-surface px-4 text-sm text-dash-ink3 hover:bg-dash-subtle"
      >
        <SearchIcon width="18" height="18" />
        <span className="flex-1 text-left">Search sessions, matches, team</span>
        <kbd className="rounded-md bg-dash-lime px-1.5 py-0.5 font-sans text-xs font-semibold text-dash-ink">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[12vh]"
          onMouseDown={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-dash bg-dash-surface shadow-lg"
          >
            <div className="flex items-center gap-3 border-b border-dash-line px-4">
              <SearchIcon width="18" height="18" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search sessions, matches…"
                aria-label="Search sessions, matches"
                className="h-12 flex-1 bg-transparent text-sm text-dash-ink outline-none placeholder:text-dash-ink3"
              />
              <kbd className="rounded-md border border-dash-line px-1.5 py-0.5 text-xs text-dash-ink3">
                esc
              </kbd>
            </div>

            <ul role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
              {q.trim().length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-dash-ink3">
                  Type to search
                </li>
              )}
              {q.trim().length > 0 && !loading && flat.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-dash-ink3">
                  No results
                </li>
              )}
              {flat.map((item, i) => (
                <li key={item.href} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      close();
                      router.push(item.href);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-dash-sm px-3 py-2.5 text-left text-sm ${
                      i === active ? "bg-dash-ink text-white" : "text-dash-ink2"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span
                      className={`shrink-0 text-xs ${
                        i === active ? "text-white/60" : "text-dash-ink3"
                      }`}
                    >
                      {item.meta}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
