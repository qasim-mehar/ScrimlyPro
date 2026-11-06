"use client";

import { Fragment } from "react";

import { getTemplate, headerFor, slotToStyle, type AestheticId } from "@/lib/graphics";
import { announcementRows } from "@/lib/graphics/announcement";
import { announcementSlotLabels } from "@/lib/sessions/slots";
import type { TeamRow } from "@/lib/scoring";

// Logo plate = logo ink + a 10px ring band (the standings-plate precedent);
// the plate diameter never exceeds the row pitch for the supported 4–25 teams.
const PLATE_PAD = 10;

type AnnouncementGraphicProps = {
  aestheticId: AestheticId;
  title: string; // event/session name
  subtitle: string; // PARTICIPATING_TEAMS
  organizer?: string | null;
  teams: ReadonlyArray<Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">>;
};

export function AnnouncementGraphic({ aestheticId, title, subtitle, organizer, teams }: AnnouncementGraphicProps) {
  const config = getTemplate(aestheticId);
  const { announcement, palette } = config;
  const header = headerFor(config, "announcement");
  const rows = announcementRows(teams.length, announcement);
  const slotLabels = announcementSlotLabels(teams);
  const plateD = announcement.logoSize + PLATE_PAD;
  return (
    <>
      {config.hideScrimName ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
          {title}
        </div>
      )}
      {announcement.subtitleBakedIn ? null : (
        <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: palette.accent }}>
          {subtitle}
        </div>
      )}
      {organizer ? (
        <div style={{ ...slotToStyle(header.organizer), font: header.organizerFont, color: palette.textMuted }}>
          {organizer}
        </div>
      ) : null}
      {rows.map((row, i) => {
        const team = teams[i];
        const contentY = row.y + (row.pitch - announcement.rowHeight) / 2;
        const isRankOne = i === 0;
        return (
          <Fragment key={team.id}>
            {/* Row band: rank-1 accent tint; alternating subtle stripes fill
                the whole pitch slot so the list reads as a table. */}
            {isRankOne ? (
              <div
                style={{
                  position: "absolute",
                  left: announcement.slotX,
                  top: row.y,
                  width: announcement.teamX + announcement.teamW - announcement.slotX,
                  height: row.pitch,
                  background: palette.wwcdBg,
                }}
              />
            ) : i % 2 === 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: announcement.slotX,
                  top: row.y,
                  width: announcement.teamX + announcement.teamW - announcement.slotX,
                  height: row.pitch,
                  background: palette.rowAlt,
                  opacity: palette.rowAltOpacity,
                }}
              />
            ) : null}
            {/* Slot number: the organizer-assigned seat when present,
                otherwise the legacy sequential index (zero-padded). */}
            <div
              style={{
                position: "absolute",
                left: announcement.slotX,
                top: contentY,
                width: announcement.slotW,
                height: announcement.rowHeight,
                lineHeight: `${announcement.rowHeight}px`,
                textAlign: "center",
                font: announcement.slotFont,
                color: isRankOne ? palette.accent : palette.textMuted,
              }}
            >
              {slotLabels[i]}
            </div>
            {team.logoUrl ? (
              <>
                {/* Logo plate circle behind the logo ink (data URLs — no
                    CORS risk in export). */}
                <div
                  style={{
                    position: "absolute",
                    left: announcement.logoX,
                    top: contentY + (announcement.rowHeight - plateD) / 2,
                    width: plateD,
                    height: plateD,
                    borderRadius: "50%",
                    background: palette.plateBg,
                    border: `1px solid ${palette.plateRing}`,
                    boxSizing: "border-box",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- data URLs: raw <img> required for html-to-image capture */}
                <img
                  src={team.logoUrl}
                  alt=""
                  style={{
                    position: "absolute",
                    left: announcement.logoX + PLATE_PAD / 2,
                    top: contentY + (announcement.rowHeight - announcement.logoSize) / 2,
                    width: announcement.logoSize,
                    height: announcement.logoSize,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              </>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: announcement.teamX,
                top: contentY,
                width: announcement.teamW,
                height: announcement.rowHeight,
                display: "flex",
                alignItems: "center",
                font: announcement.nameFont,
                color: isRankOne ? palette.wwcdText : palette.text,
              }}
            >
              <div
                style={{
                  width: "100%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {team.name}
              </div>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
