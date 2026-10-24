import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { MvpPreview } from "@/components/graphics/MvpPreview";
import { getDb } from "@/lib/db/client";
import { matchResults, matches, sessions, teams, type MvpEntry } from "@/lib/db/schema";
import { MVP_SUBTITLE, toMvpDisplay } from "@/lib/graphics/mvp";
import { aggregatePlayers, draftMvpTop5 } from "@/lib/mvp";

export const dynamic = "force-dynamic";

const SEED_SESSION_ID = "seed-00000000-0000-4000-8000-000000000001";

export default async function DevMvpPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const db = getDb();
  const session =
    (
      await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, SEED_SESSION_ID))
        .limit(1)
    )[0] ?? null;
  if (!session) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="text-lg font-bold tracking-widest text-gold">MVP GRAPHIC — SEED SESSION</h1>
        <p className="text-sm text-muted">Seed DB missing — run `npm run db:seed` first.</p>
      </main>
    );
  }

  // Confirmed matches only, matchNo ASC — the MVP aggregate is a whole-session
  // view over every ingested match (ERD §5: no aggregate columns, always derived).
  const rows = await db
    .select({ teamId: matchResults.teamId, matchNo: matches.matchNo, players: matchResults.players })
    .from(matchResults)
    .innerJoin(matches, eq(matchResults.matchId, matches.id))
    .where(and(eq(matches.sessionId, SEED_SESSION_ID), eq(matches.status, "confirmed")))
    .orderBy(asc(matches.matchNo));

  const top5 = draftMvpTop5(aggregatePlayers(rows));
  // DEV SIMULATION of a locked list — the real lock flow is C6.1; the graphic
  // component cannot tell the difference (by design).
  const entries: MvpEntry[] = top5.map((p, i) => ({
    rank: i + 1,
    name: p.displayName,
    teamId: p.teamId,
    kills: p.kills,
  }));

  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.sessionId, SEED_SESSION_ID));

  return (
    <main className="mx-auto max-w-2xl p-4">
      <MvpPreview
        title={session.name}
        subtitle={MVP_SUBTITLE}
        organizer={null}
        entries={toMvpDisplay(entries, teamRows)}
      />
    </main>
  );
}
