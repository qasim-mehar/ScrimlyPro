"use client";

import { Fragment } from "react";

import {
  effectiveAnnouncementSpec,
  getTemplate,
  headerFor,
  hideScrimNameFor,
  slotToStyle,
  type AestheticId,
} from "@/lib/graphics";
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
  const { palette } = config;
  // A template-level `announcementLayout` (onyx-green's 24-row single-column
  // art) wins over the shared announcement spec; every other template —
  // including royal-blue's two-column art — is passed through unchanged.
  const announcement = effectiveAnnouncementSpec(config);
  const rowInk = config.announcementLayout?.rowColors;
  const inkFor = (i: number): string =>
    rowInk ? rowInk[i % 2] : announcement.inkColor ?? palette.text;
  const header = headerFor(config, "announcement");
  const rows = announcementRows(teams.length, announcement);
  const slotLabels = announcementSlotLabels(teams);
  const plateD = announcement.logoSize + PLATE_PAD;

  // Art-backed TWO-column announcement (royal-blue). The art bakes the PUBG
  // MOBILE logo, "TEAM PARTICIPATION" title and the HOME|AWAY|NEUTRAL sub-bar
  // at y0..380, and the soldier/bridge/parachutes at y1180..1620; every row is
  // locked inside the safe window y425..1145. `announcementRowLayout` fills
  // the left column (12 rows at x110) before the right (x560) with a fixed
  // 58px pitch / 44px row box, so text never stretches or drifts off centre.
  // The row wrapper and BOTH cells are flex containers with height:100%, so
  // the slot '#' and the team name share the exact row midline
  // (rowTop + rowH/2). `lineHeight: 1` is ALWAYS declared AFTER `font` — the
  // font shorthand resets line-height to `normal`, which would push glyphs
  // off that midline. No header, strip or plate renders on this art path:
  // the baked title/typography stays unobstructed and the royal-blue field
  // shows through (cardBg transparent).
  if (
    announcement.fixedRowPitch &&
    !announcement.singleColumn &&
    announcement.leftX !== undefined &&
    announcement.rightX !== undefined
  ) {
    const colW = announcement.colWidth ?? announcement.teamX + announcement.teamW - announcement.leftX;
    return (
      <>
        {rows.map((row, i) => {
          const team = teams[i];
          const colX = row.x ?? announcement.leftX!;
          const rowH = row.rowH ?? announcement.rowHeight;
          return (
            <div
              key={team.id}
              style={{
                position: "absolute",
                left: colX,
                top: row.y,
                width: colW,
                height: rowH,
                display: "flex",
                alignItems: "center",
                font: announcement.nameFont,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  width: announcement.slotW,
                  flex: "0 0 auto",
                  font: announcement.rankFont ?? announcement.slotFont,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  color: announcement.accentColor ?? palette.accent,
                }}
              >
                {slotLabels[i]}
              </span>
              {team.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs: raw <img> required for html-to-image capture
                <img
                  src={team.logoUrl}
                  alt=""
                  style={{
                    width: announcement.logoSize,
                    height: announcement.logoSize,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flex: "0 0 auto",
                    marginLeft: 8,
                  }}
                />
              ) : null}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  flex: "1 1 auto",
                  minWidth: 0, // let the flex item shrink so the inner block can ellipsize
                  font: announcement.nameFont,
                  lineHeight: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: announcement.inkColor ?? palette.text,
                }}
              >
                {/* text-overflow needs a BLOCK container — a bare flex text
                    node would hard-clip long names instead of showing '…'. */}
                <div
                  style={{
                    width: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {team.name}
                </div>
              </span>
            </div>
          );
        })}
      </>
    );
  }

  // Art-backed single-column announcement (rundown-orange, onyx-green). The
  // art bakes the header ("TEAM PARTICIPATION") and the horizontal divider
  // lines, so no dynamic header, logo plate or row strip renders here. One
  // flex row per team spans the measured gap between white line i and white
  // line i+1: row.y = line i, row.pitch = line i+1 − line i, so the centre of
  // the row (and of both text spans) is the exact pixel midpoint between the
  // lines — zero drift through all 24 onyx-green rows. `lineHeight: 1` is
  // ALWAYS declared AFTER the `font` shorthand — otherwise `font` resets
  // line-height to `normal` and pushes text off the neon-tick midline.
  // onyx-green's `announcementLayout.rowColors` paints even rows neon green
  // and odd rows pure white (the baked HOME/AWAY legend + reference look).
  if (announcement.singleColumn && announcement.fixedRowPitch) {
    const left = announcement.leftX ?? announcement.slotX;
    const width = announcement.colWidth ?? announcement.teamX + announcement.teamW - left;
    return (
      <>
        {rows.map((row, i) => {
          const team = teams[i];
          return (
            <div
              key={team.id}
              style={{
                position: "absolute",
                left,
                top: row.y,
                width,
                // Bar-backed art (varsity-yellow) returns rowH = rowHeight so
                // the flex box IS the painted bar and the text centre lands
                // dead-on its vertical midpoint. Divider-line arts keep the
                // pitch-height behaviour (no rowH from the layout).
                height: row.rowH ?? row.pitch,
                display: "flex",
                alignItems: "center",
                font: announcement.nameFont,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  width: announcement.slotW,
                  flex: "0 0 auto",
                  font: announcement.rankFont ?? announcement.slotFont,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: announcement.tracking ?? (rowInk ? "0.06em" : "-0.02em"),
                  color: inkFor(i),
                }}
              >
                {slotLabels[i]}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  flex: "1 1 auto",
                  minWidth: 0, // let the flex item shrink so the inner block can ellipsize
                  font: announcement.nameFont,
                  lineHeight: 1,
                  textTransform: announcement.uppercaseNames || rowInk ? "uppercase" : undefined,
                  letterSpacing: announcement.tracking ?? (rowInk ? "0.06em" : "-0.01em"),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: inkFor(i),
                }}
              >
                {/* text-overflow needs a BLOCK container — a bare flex text
                    node would hard-clip long names instead of showing '…'. */}
                <div
                  style={{
                    width: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {team.name}
                </div>
              </span>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      {hideScrimNameFor(config, "announcement") ? null : (
        <div style={{ ...slotToStyle(header.title), font: header.titleFont, color: palette.text }}>
          {title}
        </div>
      )}
      {announcement.subtitleBakedIn ? null : (
        <div style={{ ...slotToStyle(header.subtitle), font: header.subtitleFont, color: header.subtitleColor ?? palette.accent }}>
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
                textAlign: "center",
                font: announcement.slotFont,
                // After the `font` shorthand (which resets line-height).
                lineHeight: `${announcement.rowHeight}px`,
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
