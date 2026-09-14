"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { reopenSessionAction } from "@/app/sessions/[id]/actions";
import type { StandingRow, TeamRow } from "@/lib/scoring";
import type {
  SessionNudge,
  SessionPageData,
  SessionPageMatch,
  SessionPageSession,
} from "@/lib/sessions/queries";

import { CompleteButton } from "./CompleteButton";
import { GraphicsTab } from "./GraphicsTab";
import { MatchesTab } from "./MatchesTab";
import { StandingsTab } from "./StandingsTab";

type SessionViewProps = {
  session: SessionPageSession;
  teams: TeamRow[];
  matches: SessionPageMatch[];
  confirmedCount: number;
  standings: Array<StandingRow & { rank: number }>;
  subtitle: string;
  nextMatch: number | null;
  mvp: SessionPageData["mvp"];
  nudge: SessionNudge;
};

type TabId = "matches" | "standings" | "graphics";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "matches", label: "Matches" },
  { id: "standings", label: "Standings" },
  { id: "graphics", label: "Graphics" },
];

function ReopenButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReopen(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await reopenSessionAction(sessionId);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void handleReopen();
        }}
        className="flex min-h-[44px] items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-muted disabled:opacity-50"
      >
        {busy ? "Reopening…" : "Reopen"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function SessionView({
  session,
  teams,
  matches,
  confirmedCount,
  standings,
  subtitle,
  nextMatch,
  mvp,
  nudge,
}: SessionViewProps) {
  const [tab, setTab] = useState<TabId>("matches");
  const isCompleted = session.status === "completed";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display break-words text-3xl font-bold tracking-wide text-gold">
          {session.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-line px-2 py-1 font-semibold tracking-widest text-muted">
            {isCompleted ? "COMPLETED" : "ACTIVE"}
          </span>
          <span className="rounded-full border border-line px-2 py-1 font-semibold tracking-widest text-muted">
            {confirmedCount}/{session.plannedMatches} MATCHES
          </span>
          <span className="rounded-full border border-line px-2 py-1 tracking-widest text-muted">
            {session.templateId}
          </span>
        </div>
        {isCompleted ? (
          <ReopenButton sessionId={session.id} />
        ) : (
          <CompleteButton
            sessionId={session.id}
            confirmedCount={confirmedCount}
            plannedMatches={session.plannedMatches}
          />
        )}
      </header>

      <nav aria-label="Session sections">
        <div role="tablist" className="grid grid-cols-3 gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "flex min-h-[44px] items-center justify-center rounded-lg border border-gold bg-surface px-2 text-sm font-semibold text-gold"
                  : "flex min-h-[44px] items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm font-semibold text-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "matches" ? (
        <MatchesTab
          session={session}
          matches={matches}
          nextMatch={nextMatch}
          nudge={nudge}
        />
      ) : null}
      {tab === "standings" ? (
        <StandingsTab standings={standings} confirmedCount={confirmedCount} />
      ) : null}
      {tab === "graphics" ? (
        <GraphicsTab
          sessionId={session.id}
          sessionName={session.name}
          teams={teams}
          standings={standings}
          subtitle={subtitle}
          confirmedCount={confirmedCount}
          mvp={mvp}
        />
      ) : null}
    </main>
  );
}
