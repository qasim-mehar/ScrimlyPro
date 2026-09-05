import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AnnouncementPreview } from "@/components/graphics/AnnouncementPreview";
import { getDb } from "@/lib/db/client";
import { sessions, teams } from "@/lib/db/schema";
import { PARTICIPATING_TEAMS } from "@/lib/graphics/announcement";
import { getTemplate } from "@/lib/graphics";

export const dynamic = "force-dynamic";

const SEED_SESSION_ID = "seed-00000000-0000-4000-8000-000000000001";

// dev-only placeholder — real logos arrive with the C4 wizard. viewBox-relative
// units keep the SVG free of absolute pixel values; render size comes from the
// shared announcement logoSize, color from one fixed dev accent (the placeholder
// is computed server-side while aesthetics toggle client-side).
function placeholderLogo(): string {
  const template = getTemplate("dark-gold");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" ' +
    `width="${template.announcement.logoSize}" height="${template.announcement.logoSize}" ` +
    'viewBox="0 0 100 100">' +
    `<circle cx="50" cy="50" r="38" fill="${template.palette.accent}"/>` +
    "</svg>";
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function DevAnnouncementPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const db = getDb();
  const session = db.select().from(sessions).where(eq(sessions.id, SEED_SESSION_ID)).get();
  if (!session) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="text-lg font-bold tracking-widest text-gold">ANNOUNCEMENT GRAPHIC — SEED SESSION</h1>
        <p className="text-sm text-muted">Seed DB missing — run `npm run db:seed` first.</p>
      </main>
    );
  }

  const teamRows = db
    .select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
    .from(teams)
    .where(eq(teams.sessionId, SEED_SESSION_ID))
    .orderBy(asc(teams.name))
    .all()
    .map((team, i) => ({
      ...team,
      // Every 4th team (index % 4 === 0) carries the placeholder logo; the
      // rest stay logoUrl: null — both cell branches must render in the grid.
      logoUrl: i % 4 === 0 ? placeholderLogo() : null,
    }));

  return (
    <main className="mx-auto max-w-2xl p-4">
      <AnnouncementPreview title={session.name} subtitle={PARTICIPATING_TEAMS} organizer={null} teams={teamRows} />
    </main>
  );
}
