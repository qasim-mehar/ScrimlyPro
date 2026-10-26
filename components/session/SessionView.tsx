"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";

import {
  ArrowUpRightIcon,
  SparklesIcon,
  TrophyIcon,
} from "@/components/dashboard/icons";
import { ArrowLeftIcon, CheckIcon, ShareIcon } from "@/components/app/icons";
import {
  ButtonLink,
  buttonStyles,
  PageHeader,
  ProgressBar,
  StatusChip,
} from "@/components/app/ui";
import { reopenSessionAction } from "@/app/sessions/[id]/actions";
import { getTemplate, type AestheticId } from "@/lib/graphics";
import type { StandingRow, TeamRow } from "@/lib/scoring";
import type {
  SessionNudge,
  SessionPageData,
  SessionPageMatch,
  SessionPageSession,
} from "@/lib/sessions/queries";

import { SharePanel, type ShareLink } from "./SharePanel";
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
  shareLinks: ShareLink[];
};

type TabId = "matches" | "standings" | "graphics";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "matches", label: "Matches" },
  { id: "standings", label: "Standings" },
  { id: "graphics", label: "Graphics" },
];

function createdDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function templateName(id: string): string {
  return getTemplate(id as AestheticId).name;
}

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
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void handleReopen();
        }}
        className={buttonStyles.secondary}
      >
        {busy ? "Reopening…" : "Reopen session"}
      </button>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-danger-ink">
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
  shareLinks,
}: SessionViewProps) {
  const [tab, setTab] = useState<TabId>("matches");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isCompleted = session.status === "completed";
  const draftMatch = matches.find((match) => match.status === "draft") ?? null;
  const top = standings.slice(0, 3);
  const progress =
    session.plannedMatches > 0
      ? Math.round((confirmedCount / session.plannedMatches) * 100)
      : 0;
  const date = createdDate(session.createdAt);
  const format = templateName(session.templateId);
  const heroSubtitle =
    confirmedCount === 0
      ? "Not started"
      : isCompleted && confirmedCount >= session.plannedMatches
        ? "Final results"
        : `After match ${confirmedCount}`;

  function onTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    let target = index;
    if (event.key === "ArrowRight") target = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      target = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = TABS.length - 1;
    else return;
    event.preventDefault();
    const next = TABS[target];
    if (!next) return;
    setTab(next.id);
    tabRefs.current[target]?.focus();
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title={session.name}
        description={`${session.teamCount} teams · ${format} · Created ${date}`}
        badges={
          <>
            <StatusChip tone={isCompleted ? "complete" : "live"}>
              {isCompleted ? "Completed" : "Active"}
            </StatusChip>
            <StatusChip>
              {confirmedCount}/{session.plannedMatches} matches
            </StatusChip>
            {mvp.locked ? <StatusChip tone="neutral">Top 5 locked</StatusChip> : null}
          </>
        }
        actions={
          <>
            <a href="#share" className={buttonStyles.secondary}>
              <ShareIcon width="16" height="16" />
              Share
            </a>
            {!isCompleted && draftMatch && nextMatch !== null ? (
              <ButtonLink
                href={`/sessions/${session.id}/matches/${nextMatch}`}
                variant="quiet"
              >
                Add match {nextMatch}
              </ButtonLink>
            ) : null}
            {isCompleted ? (
              <ReopenButton sessionId={session.id} />
            ) : draftMatch ? (
              <ButtonLink
                href={`/sessions/${session.id}/matches/${draftMatch.matchNo}`}
              >
                Review match {draftMatch.matchNo}
              </ButtonLink>
            ) : nextMatch !== null ? (
              <ButtonLink href={`/sessions/${session.id}/matches/${nextMatch}`}>
                Add match {nextMatch}
              </ButtonLink>
            ) : (
              <CompleteButton
                sessionId={session.id}
                confirmedCount={confirmedCount}
                plannedMatches={session.plannedMatches}
              />
            )}
          </>
        }
      />

      {/* Dark standings snapshot — the member dashboard hero language. */}
      <section className="relative mt-6 overflow-hidden rounded-dash-lg bg-dash-ink text-white">
        <div aria-hidden="true" className="app-grid absolute inset-0" />
        <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white/70">
                <SparklesIcon width="16" height="16" className="text-dash-lime" />
                Standings snapshot
              </h2>
              <span className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">
                {heroSubtitle}
              </span>
            </div>

            {top.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {top.map((row) => (
                  <li
                    key={row.teamId}
                    className="flex items-center gap-3 rounded-dash-sm bg-white/[0.07] px-3 py-2.5"
                  >
                    <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-dash-lime">
                      {row.rank}
                    </span>
                    {row.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL logo
                      <img
                        src={row.logoUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 rounded-[6px] object-contain"
                      />
                    ) : (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-white/10 text-[11px] font-bold text-white/70">
                        {row.teamName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {row.teamName}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-dash-lime">
                      {row.total} pts
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 flex flex-col gap-1 rounded-dash-sm bg-white/[0.07] px-4 py-5">
                <p className="text-sm font-semibold text-white">
                  Waiting for the first confirmed result
                </p>
                <p className="text-[13px] text-white/55">
                  The table builds itself after you upload and confirm match
                  screenshots.
                </p>
              </div>
            )}

            <a
              href="#session-tabs"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-dash-lime hover:underline"
            >
              Open the full table
              <ArrowUpRightIcon width="14" height="14" />
            </a>
          </div>

          <div className="rounded-dash bg-white/[0.06] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">
                  Match progress
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums leading-none">
                  {confirmedCount}
                  <span className="text-lg font-semibold text-white/35">
                    /{session.plannedMatches}
                  </span>
                </p>
              </div>
              <p className="text-right text-[13px] font-semibold text-dash-lime">
                {progress}%
              </p>
            </div>
            <ProgressBar
              value={progress}
              label={`${confirmedCount} of ${session.plannedMatches} matches confirmed`}
              invert
              className="mt-4"
            />
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: session.plannedMatches }, (_, i) => i + 1).map(
                (n) => {
                  const match = matches.find((m) => m.matchNo === n);
                  const state = match?.status ?? "upcoming";
                  return (
                    <li key={n}>
                      <span
                        aria-label={`Match ${n}: ${state}`}
                        title={`Match ${n} · ${state}`}
                        className={clsx(
                          "flex size-8 items-center justify-center rounded-[8px] text-xs font-bold tabular-nums",
                          state === "confirmed"
                            ? "bg-dash-lime text-dash-ink"
                            : state === "draft"
                              ? "bg-dash-amber text-white"
                              : "bg-white/10 text-white/40",
                        )}
                      >
                        {n}
                      </span>
                    </li>
                  );
                },
              )}
            </ul>
            <p className="mt-3 text-[12px] leading-5 text-white/55">
              {draftMatch
                ? `Match ${draftMatch.matchNo} is read — review it before it counts.`
                : nextMatch !== null
                  ? `Next up: match ${nextMatch}.`
                  : isCompleted
                    ? "Every planned match is in the books."
                    : "All planned matches are confirmed."}
            </p>
          </div>
        </div>
      </section>

      {/* Tabs + action rail */}
      <div
        id="session-tabs"
        className="mt-6 grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
      >
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Session sections"
            className="flex w-fit gap-1 rounded-full bg-dash-surface p-1"
          >
            {TABS.map((t, index) => (
              <button
                key={t.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={clsx(
                  "min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                  tab === t.id
                    ? "bg-dash-ink text-white"
                    : "text-dash-ink2 hover:bg-dash-bg hover:text-dash-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="mt-3 rounded-dash-lg bg-dash-surface p-5 sm:p-6"
          >
            {tab === "matches" ? (
              <MatchesTab
                session={session}
                matches={matches}
                nextMatch={nextMatch}
                nudge={nudge}
              />
            ) : null}
            {tab === "standings" ? (
              <StandingsTab
                standings={standings}
                confirmedCount={confirmedCount}
              />
            ) : null}
            {tab === "graphics" ? (
              <GraphicsTab
                sessionId={session.id}
                sessionName={session.name}
                teams={teams}
                standings={standings}
                subtitle={subtitle}
                confirmedCount={confirmedCount}
                isFinal={isCompleted}
                mvp={mvp}
              />
            ) : null}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <SharePanel sessionId={session.id} links={shareLinks} />

          <section className="rounded-dash bg-dash-surface p-5">
            <div className="flex items-start gap-3">
              <span
                className={clsx(
                  "flex size-10 shrink-0 items-center justify-center rounded-dash-sm",
                  mvp.locked
                    ? "bg-dash-lime text-dash-ink"
                    : "bg-dash-bg text-dash-ink2",
                )}
              >
                <TrophyIcon width="18" height="18" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-dash-ink">
                    Top 5 fraggers
                  </h2>
                  <StatusChip tone={mvp.locked ? "live" : "neutral"}>
                    {mvp.locked ? "Locked" : "Open"}
                  </StatusChip>
                </div>
                {mvp.locked && mvp.entries && mvp.entries.length > 0 ? (
                  <>
                    <ol className="mt-2 flex flex-col gap-1">
                      {mvp.entries.slice(0, 5).map((entry, index) => (
                        <li
                          key={`${entry.teamId}-${entry.name}`}
                          className="flex items-baseline gap-2 text-[13px]"
                        >
                          <span className="w-3 shrink-0 font-bold tabular-nums text-dash-ink3">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-dash-ink">
                            {entry.name}
                          </span>
                          <span className="shrink-0 font-bold tabular-nums text-dash-ink2">
                            {entry.kills}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <Link
                      href={`/sessions/${session.id}/mvp`}
                      className="mt-3 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-dash-ink hover:underline"
                    >
                      View the graphic
                      <ArrowUpRightIcon width="14" height="14" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-[13px] leading-5 text-dash-ink3">
                      {confirmedCount === 0
                        ? "Available once the first match is confirmed."
                        : "Review the auto-draft and lock exactly five players."}
                    </p>
                    {confirmedCount > 0 ? (
                      <Link
                        href={`/sessions/${session.id}/mvp`}
                        className="mt-3 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-dash-ink hover:underline"
                      >
                        Review top 5
                        <ArrowUpRightIcon width="14" height="14" />
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-dash bg-dash-surface p-5">
            <h2 className="text-base font-bold text-dash-ink">Session</h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-dash-ink3">Format</dt>
                <dd className="text-right font-semibold text-dash-ink">
                  {format}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-dash-ink3">Teams</dt>
                <dd className="font-semibold tabular-nums text-dash-ink">
                  {session.teamCount}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-dash-ink3">Planned matches</dt>
                <dd className="font-semibold tabular-nums text-dash-ink">
                  {session.plannedMatches}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-dash-ink3">Created</dt>
                <dd className="text-right font-semibold text-dash-ink">
                  {date}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-2 border-t border-dash-bg pt-3 text-[12px] leading-5 text-dash-ink3">
              <CheckIcon width="14" height="14" className="shrink-0" />
              Only confirmed results feed the table.
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-dash bg-dash-surface px-5 py-4">
        <p className="flex items-center gap-2 text-[13px] text-dash-ink3">
          <TrophyIcon width="16" height="16" className="text-dash-ink4" />
          {confirmedCount} confirmed · {matches.length} uploaded ·{" "}
          {session.plannedMatches} planned
        </p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-dash-ink2 hover:text-dash-ink"
        >
          <ArrowLeftIcon width="14" height="14" />
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
