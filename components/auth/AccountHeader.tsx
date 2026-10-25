"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Account header hint — UI ONLY. The email comes from the browser session as
 * a non-authoritative display hint; the server re-checks auth independently
 * on every page/route (getSession is never an authorization basis).
 *
 * M2: the "Orgs" chip is a plain navigation link — /orgs re-checks auth and
 * scopes every query server-side.
 */
export function AccountHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
  }, []);

  if (!email) return null;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs text-muted">{email}</span>
        <Link
          href="/orgs"
          className="min-h-9 shrink-0 rounded-md border border-line px-3 py-1 text-xs font-semibold tracking-widest text-muted"
        >
          ORGS
        </Link>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="min-h-9 shrink-0 rounded-md border border-line px-3 text-xs font-semibold text-muted"
      >
        Sign out
      </button>
    </div>
  );
}
