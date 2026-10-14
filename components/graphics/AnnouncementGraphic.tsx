"use client";

import { getTemplate, slotToStyle, type AestheticId } from "@/lib/graphics";
import { announcementCells } from "@/lib/graphics/announcement";
import type { TeamRow } from "@/lib/scoring";

// Component-internal layout constant (C3.2's 44px-row-logo precedent): the
// name block occupies the bottom 34px of each announcement cell; the logo
// centers vertically in the remaining (cellH − NAME_BLOCK_H) space.
const NAME_BLOCK_H = 34;
// Cell card inset + radius: the card is a subtle rounded rect inside the
// grid cell; the logo plate circle sits in the card above the name.
const CARD_INSET = 5;
const CARD_RADIUS = 16;

type AnnouncementGraphicProps = {
  aestheticId: AestheticId;
  title: string; // event/session name
  subtitle: string; // PARTICIPATING_TEAMS
  organizer?: string | null;
  teams: ReadonlyArray<Pick<TeamRow, "id" | "name" | "logoUrl">>;
};

export function AnnouncementGraphic({ aestheticId, title, subtitle, organizer, teams }: AnnouncementGraphicProps) {
  const { header, announcement, palette } = getTemplate(aestheticId);
  const cells = announcementCells(teams.length, announcement);
  // NOTE: at dev geometry (cellW 180 @ nameFont 600 26px) names longer than
  // ~12 chars ellipsize — "Zero Degree Esports" will. Accepted for the dev
  // gradients; the real-template phase recalibrates.
  return (
    <>
      <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
        {title}
      </div>
      <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: palette.accent }}>
        {subtitle}
      </div>
      {organizer ? (
        <div style={{ ...slotToStyle(header.organizer), font: header.organizerFont, color: palette.textMuted }}>
          {organizer}
        </div>
      ) : null}
      {cells.map((cell, i) => {
        const team = teams[i];
        const plateD = announcement.logoSize + 10;
        const cardTop = cell.y + CARD_INSET;
        const nameTop = cell.y + cell.h - CARD_INSET - NAME_BLOCK_H;
        const plateTop = cardTop + (nameTop - cardTop - plateD) / 2;
        const plateLeft = cell.x + (cell.w - plateD) / 2;
        return (
          <div key={team.id}>
            {/* Cell card: subtle rounded rect (plate bg + hairline ring). */}
            <div
              style={{
                position: "absolute",
                left: cell.x + CARD_INSET,
                top: cardTop,
                width: cell.w - CARD_INSET * 2,
                height: cell.h - CARD_INSET * 2,
                borderRadius: CARD_RADIUS,
                background: palette.plateBg,
                border: `1px solid ${palette.plateRing}`,
                boxSizing: "border-box",
              }}
            />
            {/* Logo plate circle above the name (ring keeps it legible on
                the card); the logo ink centers inside it. */}
            <div
              style={{
                position: "absolute",
                left: plateLeft,
                top: plateTop,
                width: plateD,
                height: plateD,
                borderRadius: "50%",
                background: palette.plateBg,
                border: `1px solid ${palette.plateRing}`,
                boxSizing: "border-box",
              }}
            />
            {team.logoUrl ? (
              // Data URLs — no CORS risk in export.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logoUrl}
                alt={team.name}
                style={{
                  position: "absolute",
                  left: plateLeft + (plateD - announcement.logoSize) / 2,
                  top: plateTop + (plateD - announcement.logoSize) / 2,
                  width: announcement.logoSize,
                  height: announcement.logoSize,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                left: cell.x,
                top: nameTop,
                width: cell.w,
                height: NAME_BLOCK_H,
                display: "flex",
                alignItems: "center",
                font: announcement.nameFont,
                color: palette.text,
              }}
            >
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {team.name}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
