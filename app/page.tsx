import Link from "next/link";

import { getDb } from "@/lib/db/client";
import { listRecentSessions } from "@/lib/sessions/queries";

export const dynamic = "force-dynamic";

function chipClass(status: string): string {
  return status === "completed"
    ? "rounded-full border border-gold/60 px-2 py-0.5 text-xs font-semibold tracking-widest text-gold"
    : "rounded-full border border-line px-2 py-0.5 text-xs font-semibold tracking-widest text-muted";
}

export default function Home() {
  const recent = listRecentSessions(getDb(), 8);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-4xl font-bold tracking-widest text-gold">
          SCRIMLY PRO
        </h1>
        <p className="text-sm text-muted">
          Scrim results, standings &amp; MVP graphics — in minutes.
        </p>
      </div>

      <Link
        href="/sessions/new"
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gold font-display text-lg font-semibold text-bg"
      >
        Create a Scrim
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-widest text-muted">
          RECENT SCRIMS
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-muted">
            No scrims yet — create your first one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex min-h-[44px] flex-col gap-1 rounded-lg border border-line bg-surface p-3 hover:border-gold/60"
                >
                  <span className="min-w-0 break-words text-sm font-semibold text-white">
                    {session.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={chipClass(session.status)}>
                      {session.status === "completed" ? "COMPLETED" : "ACTIVE"}
                    </span>
                    <span className="text-xs text-muted">
                      {session.confirmedCount}/{session.plannedMatches} matches
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
