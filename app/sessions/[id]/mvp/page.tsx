import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

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

export const dynamic = "force-dynamic";

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
      <main className="mx-auto w-full max-w-2xl p-4">
        <p className="text-xs font-semibold tracking-widest text-muted">
          {session.name}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
          Top-5 Fraggers
        </h1>
        <p className="mt-4 rounded-md border border-line bg-surface p-4 text-sm text-muted">
          Confirm matches first — the MVP draft builds from confirmed match
          results.
        </p>
      </main>
    );
  }

  const { players, draft, saved } = data;
  if (saved && saved.locked) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted">
              {session.name}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
              Top-5 Fraggers
            </h1>
            <p className="mt-1 text-xs text-muted">
              Locked{saved.lockedAt ? ` · ${saved.lockedAt}` : ""} — the graphic
              below renders from this locked list only.
            </p>
          </div>
          <UnlockButton sessionId={sessionId} />
        </div>
        <MvpPreview
          title={session.name}
          subtitle={MVP_SUBTITLE}
          organizer={null}
          entries={toMvpDisplay(saved.entries, teamRows)}
        />
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
    <main className="mx-auto w-full max-w-2xl p-4">
      <p className="text-xs font-semibold tracking-widest text-muted">{session.name}</p>
      <h1 className="font-display text-3xl font-bold tracking-widest text-gold">
        Top-5 Fraggers
      </h1>
      <p className="mt-1 text-sm text-muted">
        Drafted from {confirmedCount} confirmed{" "}
        {confirmedCount === 1 ? "match" : "matches"} — edit freely, then lock
        exactly 5.
      </p>
      <div className="mt-4">
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
