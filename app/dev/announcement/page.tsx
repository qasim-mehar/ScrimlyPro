import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/action-guard";

import { AnnouncementPreview } from "@/components/graphics/AnnouncementPreview";
import { getDb } from "@/lib/db/client";
import { sessions, teams } from "@/lib/db/schema";
import { PARTICIPATING_TEAMS } from "@/lib/graphics/announcement";
import { getTemplate } from "@/lib/graphics";
import type { TeamRow } from "@/lib/scoring";

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

/**
 * Varsity-orange 24-team calibration fixture (`?fixture=varsity-orange-24`).
 * Seats 1–12 are explicitly assigned; 13–24 are NULL so the announcement
 * fallback labels (13–24) render with zero collisions. Includes a 25-char name
 * to pin ellipsis handling against the right-hand slot pipe.
 */
const VARSITY_ORANGE_FIXTURE: ReadonlyArray<Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">> =
  [
    "TF Squad",
    "Straight Forward",
    "Bawa Qadra",
    "TRB HANAN",
    "4NM BROKEN X",
    "ROX Gaming",
    "CRUSH Esports",
    "AKM Dasim",
    "Zero Degree Esports",
    "Voltage Esports",
    "NMS TITANIUM",
    "VORTEX ESPORTS",
    "HYDRA OPS PAK",
    "KARACHI KINGS",
    "GODLIKE PAK",
    "NX GAMING",
    "SCARYMONSTA XR",
    "DRAGO KNIGHTS",
    "SRT SHADOW",
    "RAWALPINDI RHINOS",
    "THE LAST RIDERZ",
    "OFFICIAL AGENT 47",
    "TEAM SANSATIONAL",
    "AN EXTREMELY LONG TWENTY FIVE CHAR NAME",
  ].map((name, i) => ({
    id: `vo-fixture-${i + 1}`,
    name,
    logoUrl: null,
    slotNumber: i < 12 ? i + 1 : null,
  }));

export default async function DevAnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  // WP6: authenticated users only (dev pages render fixtures; no tenant reads).
  await requireUser();

  const { fixture } = await searchParams;
  if (fixture === "varsity-orange-24") {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="text-lg font-bold tracking-widest text-gold">
          VARSITY ORANGE — 24-TEAM PIPE CALIBRATION
        </h1>
        <p className="mt-1 text-sm text-muted">
          Two 12-row columns locked to the baked dashed pipes (x464 / x834). Names are
          right-aligned LEFT of each pipe, slot numerals left-aligned RIGHT of it.
          <a className="ml-2 underline" href="/dev/announcement">
            ← seed session
          </a>
        </p>
        <div className="mt-4">
          <AnnouncementPreview
            title="SCRIMLYPRO CALIBRATION"
            subtitle={PARTICIPATING_TEAMS}
            organizer={null}
            teams={VARSITY_ORANGE_FIXTURE}
            initialAestheticId="varsity-orange"
          />
        </div>
      </main>
    );
  }

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
        <h1 className="text-lg font-bold tracking-widest text-gold">ANNOUNCEMENT GRAPHIC — SEED SESSION</h1>
        <p className="text-sm text-muted">Seed DB missing — run `npm run db:seed` first.</p>
      </main>
    );
  }

  const teamRows = (await db
    .select({
      id: teams.id,
      name: teams.name,
      logoUrl: teams.logoUrl,
      slotNumber: teams.slotNumber,
    })
    .from(teams)
    .where(eq(teams.sessionId, SEED_SESSION_ID))
    .orderBy(asc(teams.slotNumber), asc(teams.name)))
    .map((team, i) => ({
      ...team,
      // Every 4th team (index % 4 === 0) carries the placeholder logo; the
      // rest stay logoUrl: null — both cell branches must render in the grid.
      logoUrl: i % 4 === 0 ? placeholderLogo() : null,
    }));

  return (
    <main className="mx-auto max-w-2xl p-4">
      <p className="mb-2 text-sm text-muted">
        <a className="underline" href="/dev/announcement?fixture=varsity-orange-24">
          Varsity-orange 24-team pipe calibration →
        </a>
      </p>
      <AnnouncementPreview title={session.name} subtitle={PARTICIPATING_TEAMS} organizer={null} teams={teamRows} />
    </main>
  );
}
