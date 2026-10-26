import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireUser } from "@/lib/auth/action-guard";
import { MvpPreview } from "@/components/graphics/MvpPreview";
import {
  MvpEditor,
  type MvpEditorEntry,
  type MvpPlayerOption,
} from "@/components/mvp/MvpEditor";
import { UnlockButton } from "@/components/mvp/UnlockButton";
import { withUserDb } from "@/lib/db/user";
import {
  matchResults,
  matches,
  mvpLists,
  sessions,
  teams,
} from "@/lib/db/schema";
import { orgMemberPredicate } from "@/lib/orgs/orgs";
import { MVP_SUBTITLE, toMvpDisplay } from "@/lib/graphics/mvp";
import { aggregatePlayers, draftMvpTop5 } from "@/lib/mvp";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/app/ui";
import { ArrowUpRightIcon, TrophyIcon } from "@/components/dashboard/icons";
import { LockIcon } from "@/components/app/icons";

export const dynamic = "force-dynamic";

function lockedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Top-5 Fraggers finale (C6.1). Server aggregates per-player kills from
 * CONFIRMED matches only (C2.3); the client editor edits a COPY — editor
 * edits never rewrite match_results (PRD). The MVP graphic renders ONLY
 * from the locked mvp_lists row (ERD §5 iron rule 2).
 *
 * WP6/M2: verified user or /login; every tenant read runs inside withUserDb
 * (RLS + explicit org-membership predicate on the session select). A missing
 * or foreign session is indistinguishable — both render the 404 page.
 */
export default async function MvpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: sessionId } = await params;

  const data = await withUserDb({ sub: user.id }, async (userDb) => {
    const session =
      (
        await userDb
          .select()
          .from(sessions)
          .where(and(eq(sessions.id, sessionId), orgMemberPredicate(user.id)))
          .limit(1)
      )[0] ?? null;
    if (!session) return null;

    const teamRows = await userDb
      .select()
      .from(teams)
      .where(eq(teams.sessionId, sessionId));

    const confirmedCount = (
      await userDb
        .select({ id: matches.id })
        .from(matches)
        .where(and(eq(matches.sessionId, sessionId), eq(matches.status, "confirmed")))
    ).length;

    if (confirmedCount === 0) {
      return { kind: "no-results" as const, session, teamRows, confirmedCount };
    }

    const sourceRows = await userDb
      .select({
        teamId: matchResults.teamId,
        matchNo: matches.matchNo,
        players: matchResults.players,
      })
      .from(matchResults)
      .innerJoin(matches, eq(matchResults.matchId, matches.id))
      .where(and(eq(matches.sessionId, sessionId), eq(matches.status, "confirmed")))
      .orderBy(asc(matches.matchNo));

    const players = aggregatePlayers(sourceRows);
    const draft = draftMvpTop5(players);
    const saved =
      (
        await userDb
          .select()
          .from(mvpLists)
          .where(eq(mvpLists.sessionId, sessionId))
          .limit(1)
      )[0] ?? null;

    return {
      kind: "ready" as const,
      session,
      teamRows,
      confirmedCount,
      players,
      draft,
      saved,
    };
  });

  if (!data) notFound();
  const { session, teamRows, confirmedCount } = data;

  if (data.kind === "no-results") {
    return (
      <main className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader
          backHref={`/sessions/${sessionId}`}
          backLabel={session.name}
          title="Top 5 Fraggers"
          description="The finale graphic comes from confirmed match results."
          badges={<StatusChip tone="neutral">Waiting for results</StatusChip>}
        />
        <EmptyState
          icon={<TrophyIcon width="22" height="22" />}
          title="Confirm a match first"
          description="The MVP draft builds from confirmed match results. Upload and confirm at least one match, then come back to rank the top five."
          action={
            <ButtonLink href={`/sessions/${sessionId}`}>
              Back to the session
            </ButtonLink>
          }
          className="mt-6 bg-dash-surface py-12"
        />
      </main>
    );
  }

  const { players, draft, saved } = data;
  if (saved && saved.locked) {
    const lockedEntries = toMvpDisplay(saved.entries, teamRows);

    return (
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader
          backHref={`/sessions/${sessionId}`}
          backLabel={session.name}
          title="Top 5 Fraggers"
          description="The locked list is final. The graphic below renders from it only."
          badges={
            <>
              <StatusChip tone="complete">Locked</StatusChip>
              <StatusChip tone="neutral">Session finale</StatusChip>
            </>
          }
          actions={<UnlockButton sessionId={sessionId} />}
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="rounded-dash-lg bg-dash-surface p-4 sm:p-6">
            <MvpPreview
              title={session.name}
              subtitle={MVP_SUBTITLE}
              organizer={null}
              entries={lockedEntries}
            />
          </section>

          <aside className="flex flex-col gap-4">
            <section className="relative overflow-hidden rounded-dash-lg bg-dash-ink p-5 text-white">
              <div aria-hidden="true" className="app-grid absolute inset-0" />
              <div className="relative">
                <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-dash-lime uppercase">
                  <TrophyIcon width="15" height="15" />
                  Locked top five
                </p>
                <ol className="mt-3 flex flex-col gap-1.5">
                  {lockedEntries.map((entry) => (
                    <li
                      key={`${entry.rank}-${entry.name}`}
                      className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.07] px-3 py-2"
                    >
                      <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-dash-lime">
                        {entry.rank}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {entry.name}
                        </span>
                        <span className="block truncate text-[11px] text-white/50">
                          {entry.teamName}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-dash-lime">
                        {entry.kills}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[12px] leading-5 text-white/55">
                  <LockIcon width="14" height="14" className="shrink-0" />
                  {saved.lockedAt
                    ? `Locked ${lockedDate(saved.lockedAt)} · editing requires Unlock`
                    : "Locked · editing requires Unlock"}
                </div>
              </div>
            </section>

            <section className="rounded-dash bg-dash-surface p-5">
              <h2 className="text-base font-bold text-dash-ink">
                How this list is built
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-5 text-dash-ink3">
                <li>
                  Kills aggregate across every confirmed match in the session.
                </li>
                <li>
                  Editor changes never rewrite match results — they only shape
                  this list.
                </li>
                <li>
                  Unlocking keeps the names and kills, so you can make a small
                  correction and lock again.
                </li>
              </ul>
              <Link
                href={`/sessions/${sessionId}`}
                className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-dash-ink2 hover:text-dash-ink"
              >
                Back to the session
                <ArrowUpRightIcon width="14" height="14" />
              </Link>
            </section>
          </aside>
        </div>
      </main>
    );
  }

  // Not locked: re-open the editor pre-filled — previously locked entries
  // first (unlock preserves manual work), else the C2.3 draft top-5.
  const aggregateByName = new Map(
    players.map((player) => [`${player.teamId}|${player.displayName}`, player]),
  );
  const base: MvpEditorEntry[] =
    saved && saved.entries.length > 0
      ? saved.entries.map((entry) => {
          const aggregate =
            aggregateByName.get(`${entry.teamId}|${entry.name}`) ??
            players.find(
              (player) =>
                player.teamId === entry.teamId && player.variants.includes(entry.name),
            );
          return {
            name: entry.name,
            teamId: entry.teamId,
            kills: entry.kills,
            variants: aggregate ? [...aggregate.variants] : [],
          };
        })
      : draft.map((player) => ({
          name: player.displayName,
          teamId: player.teamId,
          kills: player.kills,
          variants: [...player.variants],
        }));

  const allPlayers: MvpPlayerOption[] = players.map((player) => ({
    displayName: player.displayName,
    teamId: player.teamId,
    kills: player.kills,
    variants: [...player.variants],
  }));

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        backHref={`/sessions/${sessionId}`}
        backLabel={session.name}
        title="Top 5 Fraggers"
        description={`Drafted from ${confirmedCount} confirmed ${
          confirmedCount === 1 ? "match" : "matches"
        }. Edit freely, then lock exactly five.`}
        badges={
          <>
            <StatusChip tone="draft">Draft</StatusChip>
            <StatusChip tone="neutral">
              {base.length === 5 ? "5 entries ready" : `${base.length} entries`}
            </StatusChip>
          </>
        }
      />
      <div className="mt-6">
        <MvpEditor
          sessionId={sessionId}
          initialList={base}
          allPlayers={allPlayers}
          teams={teamRows.map((team) => ({
            id: team.id,
            name: team.name,
            logoUrl: team.logoUrl,
          }))}
        />
      </div>
    </main>
  );
}
