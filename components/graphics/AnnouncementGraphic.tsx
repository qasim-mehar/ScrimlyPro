"use client";

import { getTemplate, slotToStyle, type AestheticId } from "@/lib/graphics";
import { announcementCells } from "@/lib/graphics/announcement";
import type { TeamRow } from "@/lib/scoring";

// Component-internal layout constant (C3.2's 44px-row-logo precedent): the
// name block occupies the bottom 34px of each announcement cell; the logo
// centers vertically in the remaining (cellH − NAME_BLOCK_H) space.
const NAME_BLOCK_H = 34;

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
        return (
          <div key={team.id}>
            {team.logoUrl ? (
              // Data URLs — no CORS risk in export.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logoUrl}
                alt={team.name}
                style={{
                  position: "absolute",
                  left: cell.x + (cell.w - announcement.logoSize) / 2,
                  top: cell.y + (cell.h - NAME_BLOCK_H - announcement.logoSize) / 2,
                  width: announcement.logoSize,
                  height: announcement.logoSize,
                  objectFit: "contain",
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                left: cell.x,
                top: cell.y + cell.h - NAME_BLOCK_H,
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
