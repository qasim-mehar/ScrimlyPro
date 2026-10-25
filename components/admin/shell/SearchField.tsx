"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { IconSearch } from "./icons";

/**
 * Search field + ⌘K palette (§4.4/§5): opens on click or ⌘K/Ctrl-K, fuzzy
 * prefix search through /api/admin/search (admin-guarded, no-store),
 * keyboard-navigable (↑ ↓ Enter Escape). Users navigate to the tenant
 * console pre-filtered; org rows navigate to /admin/orgs.
 */

type SearchResponse = {
  users: Array<{ id: string; email: string | null }>;
  orgs: Array<{ id: string; name: string }>;
};

type Item =
  | { kind: "user"; id: string; label: string }
  | { kind: "org"; id: string; label: string };

export function SearchField() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setItems([]);
    setActive(0);
  }, []);

  // ⌘K / Ctrl-K opens; Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced search against the admin API.
  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    const timer = setTimeout(async () => {
      if (needle.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(needle)}`,
        );
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = (await res.json()) as SearchResponse;
        setItems([
          ...data.users.map((u): Item => ({
            kind: "user",
            id: u.id,
            label: u.email ?? "(no email)",
          })),
          ...data.orgs.map((o): Item => ({ kind: "org", id: o.id, label: o.name })),
        ]);
        setActive(0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, needle.length === 0 ? 0 : 200);
    return () => clearTimeout(timer);
  }, [q, open]);

  function go(item: Item) {
    close();
    if (item.kind === "user") {
      router.push(`/admin/tenants?q=${encodeURIComponent(item.label)}`);
    } else {
      router.push(`/admin/orgs?q=${encodeURIComponent(item.label)}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search users and organizations"
        className="flex h-10 w-full max-w-[320px] items-center gap-2 rounded-[12px] border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 text-left text-sm text-[var(--hq-ink-3)] hover:border-[var(--hq-ink-4)]"
      >
        <IconSearch size={16} />
        <span className="truncate">Search users, organizations</span>
        <span className="ml-auto rounded-[6px] bg-[var(--hq-lime)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--hq-ink)]">
          ⌘K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close search"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[20px] bg-[var(--hq-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 border-b border-[var(--hq-line)] px-4">
              <span className="text-[var(--hq-ink-3)]">
                <IconSearch size={16} />
              </span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search users, organizations"
                aria-label="Search query"
                className="h-12 w-full bg-transparent text-[14px] text-[var(--hq-ink)] outline-none placeholder:text-[var(--hq-ink-3)]"
              />
              <kbd className="rounded-[6px] bg-[var(--hq-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--hq-ink-3)]">
                esc
              </kbd>
            </div>
            <ul
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto py-2"
              aria-label="Search results"
            >
              {items.length === 0 ? (
                <li className="px-4 py-6 text-center text-[13px] text-[var(--hq-ink-3)]">
                  {loading
                    ? "Searching…"
                    : q.trim().length === 0
                      ? "Type to search users and organizations"
                      : "No results"}
                </li>
              ) : (
                items.map((item, i) => (
                  <li key={`${item.kind}:${item.id}`}>
                    <button
                      type="button"
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(i)}
                      className={
                        i === active
                          ? "flex w-full items-center gap-3 bg-[var(--hq-surface-subtle)] px-4 py-2.5 text-left"
                          : "flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      }
                    >
                      <span className="hq-chip bg-[var(--hq-bg)] text-[var(--hq-ink-3)]">
                        {item.kind === "user" ? "User" : "Org"}
                      </span>
                      <span className="truncate text-[14px] text-[var(--hq-ink)]">
                        {item.label}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
