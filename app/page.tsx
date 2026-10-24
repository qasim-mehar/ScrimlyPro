// entry point — session list/history arrives with C4.2+
import Link from "next/link";

import { requireUser } from "@/lib/auth/action-guard";

/**
 * WP6: authenticated users only (the proxy gates too — this is defense in
 * depth). No tenant data is rendered yet; listRecentSessions lands with
 * C4.2+ and MUST run under withUserDb with an explicit
 * eq(sessions.userId, user.id) predicate when it arrives.
 */
export default async function Home() {
  await requireUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
      <h1 className="font-display text-4xl font-bold tracking-widest text-gold">
        SCRIMLY PRO
      </h1>
      <p className="text-center text-sm text-muted">
        Scrim results, standings &amp; MVP graphics — in minutes.
      </p>
      <Link
        href="/sessions/new"
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
      >
        Create a Scrim
      </Link>
    </main>
  );
}
