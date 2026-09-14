import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { MvpPreview } from "@/components/graphics/MvpPreview";
import {
  MvpEditor,
  type MvpEditorEntry,
  type MvpPlayerOption,
} from "@/components/mvp/MvpEditor";
import { UnlockButton } from "@/components/mvp/UnlockButton";
import { getDb } from "@/lib/db/client";
import {
  matchResults,
  matches,
  mvpLists,
  sessions,
  teams,
} from "@/lib/db/schema";
import { MVP_SUBTITLE, toMvpDisplay } from "@/lib/graphics/mvp";
import { aggregatePlayers, draftMvpTop5 } from "@/lib/mvp";

export const dynamic = "force-dynamic";

/**
 * Top-5 Fraggers finale (C6.1). Server aggregates per-player kills from
 * CONFIRMED matches only (C2.3); the client editor edits a COPY — editor
 * edits never rewrite match_results (PRD). The MVP graphic renders ONLY
 * from the locked mvp_lists row (ERD §5 iron rule 2).
 */
export default async function MvpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) notFound();

  const teamRows = db.select().from(teams).where(eq(teams.sessionId, sessionId)).all();

  const confirmedCount = db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.sessionId, sessionId), eq(matches.status, "confirmed")))
    .all().length;

  if (confirmedCount === 0) {
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

  const sourceRows = db
    .select({
      teamId: matchResults.teamId,
      matchNo: matches.matchNo,
      players: matchResults.players,
    })
    .from(matchResults)
    .innerJoin(matches, eq(matchResults.matchId, matches.id))
    .where(and(eq(matches.sessionId, sessionId), eq(matches.status, "confirmed")))
    .orderBy(asc(matches.matchNo))
    .all();

  const players = aggregatePlayers(sourceRows);
  const draft = draftMvpTop5(players);
  const saved = db.select().from(mvpLists).where(eq(mvpLists.sessionId, sessionId)).get();

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
