"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

import { PlusIcon, GridIcon, UsersIcon } from "@/components/dashboard/icons";
import { LogOutIcon } from "@/components/app/icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Light app header for the task surfaces (/sessions, /orgs).
 *
 * UI ONLY: the email comes from the browser session as a non-authoritative
 * display hint; every page/action re-checks auth on the server. The header
 * deliberately returns null outside the app surfaces so the landing page,
 * both dashboards, login and the public share/invite pages keep their own
 * chrome untouched.
 */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/orgs", label: "Organizations", icon: UsersIcon },
] as const;

export function AccountHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  const isAppRoute =
    pathname.startsWith("/sessions") || pathname.startsWith("/orgs");

  useEffect(() => {
    if (!isAppRoute) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
  }, [isAppRoute]);

  if (!isAppRoute) return null;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const hideNewScrim = pathname === "/sessions/new";

  return (
    <header className="sticky top-0 z-30 border-b border-dash-line bg-dash-bg">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-dash-sm"
          aria-label="ScrimlyPro dashboard"
        >
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-dash-ink text-white">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="8" height="8" rx="2.5" />
              <rect x="13" y="3" width="8" height="8" rx="4" />
              <rect x="3" y="13" width="8" height="8" rx="4" />
              <rect x="13" y="13" width="8" height="8" rx="2.5" />
            </svg>
          </span>
          <span className="text-[17px] font-bold tracking-[-0.02em] text-dash-ink">
            ScrimlyPro
          </span>
        </Link>

        <nav
          aria-label="App"
          className="ml-2 hidden items-center gap-1 md:flex"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/orgs"
                ? pathname.startsWith("/orgs")
                : pathname === "/dashboard";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-dash-surface text-dash-ink"
                    : "text-dash-ink2 hover:bg-dash-surface hover:text-dash-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <nav
            aria-label="App"
            className="flex items-center gap-1 md:hidden"
          >
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/orgs"
                  ? pathname.startsWith("/orgs")
                  : pathname === "/dashboard";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex size-10 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-dash-surface text-dash-ink"
                      : "text-dash-ink2 hover:bg-dash-surface hover:text-dash-ink",
                  )}
                >
                  <Icon width="18" height="18" />
                </Link>
              );
            })}
          </nav>

          {hideNewScrim ? null : (
            <>
              <Link
                href="/sessions/new"
                aria-label="New scrim"
                className="hidden min-h-10 items-center gap-1.5 rounded-full bg-dash-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-black sm:flex"
              >
                <PlusIcon width="16" height="16" />
                New scrim
              </Link>
              <Link
                href="/sessions/new"
                aria-label="New scrim"
                className="flex size-10 items-center justify-center rounded-full bg-dash-ink text-white transition-colors hover:bg-black sm:hidden"
              >
                <PlusIcon width="18" height="18" />
              </Link>
            </>
          )}

          {email ? (
            <span className="mx-1 hidden max-w-[190px] truncate text-[13px] text-dash-ink3 lg:inline">
              {email}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="hidden min-h-10 items-center gap-1.5 rounded-full border border-dash-line bg-dash-surface px-4 text-sm font-semibold text-dash-ink2 transition-colors hover:bg-dash-subtle hover:text-dash-ink sm:flex"
          >
            <LogOutIcon width="16" height="16" />
            Sign out
          </button>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            aria-label="Sign out"
            className="flex size-10 items-center justify-center rounded-full border border-dash-line bg-dash-surface text-dash-ink2 transition-colors hover:bg-dash-subtle hover:text-dash-ink sm:hidden"
          >
            <LogOutIcon width="18" height="18" />
          </button>
        </div>
      </div>
    </header>
  );
}
