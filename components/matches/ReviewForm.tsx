"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

import {
  confirmMatchAction,
  reparseAction,
} from "@/app/sessions/[id]/matches/[matchNo]/actions";
import {
  validateMapping,
  type SquadRowDraft,
} from "@/lib/matches/mapping";
import type { SuggestionTier } from "@/lib/matching";
import { AlertIcon, PlusIcon } from "@/components/dashboard/icons";
import { CheckIcon, ChevronUpIcon, XIcon } from "@/components/app/icons";
import {
  buttonStyles,
  compactButtonStyles,
  ProgressBar,
  StatusChip,
} from "@/components/app/ui";

export type ReviewSquad = {
  placement: number;
  squadTag: string;
  confidence: "high" | "low";
  players: Array<{ name: string; kills: number; confidence?: "high" | "low" }>;
};

export type ReviewTeam = { id: string; name: string };

export type ReviewSuggestion = { teamId: string | null; tier: SuggestionTier };

type PlayerDraft = { key: string; name: string; kills: number; low: boolean };

type RowState = {
  key: string;
  placement: number;
  squadTag: string;
  teamId: string | null;
  players: PlayerDraft[];
  tier: SuggestionTier;
  low: boolean;
  open: boolean;
};

const LOBBY_KILLS_WARN_AT = 99;

function rowKills(row: RowState): number {
  return row.players.reduce((sum, player) => sum + player.kills, 0);
}

function toDraft(row: RowState): SquadRowDraft {
  return {
    placement: row.placement,
    squadTag: row.squadTag,
    teamId: row.teamId,
    players: row.players.map((player) => ({
      name: player.name.trim(),
      kills: player.kills,
    })),
  };
}

function buildRows(
  squads: ReviewSquad[],
  suggestions: ReviewSuggestion[],
): RowState[] {
  return [...squads]
    .sort((a, b) => a.placement - b.placement)
    .map((squad, i) => {
      const suggestion = suggestions[i];
      const tier = suggestion ? suggestion.tier : "none";
      const preselected =
        tier === "strong" || tier === "weak" ? (suggestion?.teamId ?? null) : null;
      const low =
        squad.confidence === "low" ||
        squad.players.some((p) => p.confidence === "low");
      return {
        key: `sq-${i}`,
        placement: squad.placement,
        squadTag: squad.squadTag,
        teamId: preselected,
        players: squad.players.map((player, j) => ({
          key: `sq-${i}-p-${j}`,
          name: player.name,
          kills: player.kills,
          low: player.confidence === "low",
        })),
        tier,
        low,
        open: preselected === null || low,
      };
    });
}

/** Small inline alert used for row-level validation state. */
function InlineAlert({
  children,
  tone = "danger",
}: {
  children: ReactNode;
  tone?: "danger" | "warning";
}) {
  return (
    <p
      role="alert"
      className={clsx(
        "flex items-start gap-2 rounded-dash-sm px-3 py-2.5 text-[13px] leading-5",
        tone === "danger"
          ? "bg-dash-danger-bg text-dash-danger-ink"
          : "bg-dash-amber-bg text-dash-amber-ink",
      )}
    >
      <AlertIcon width="16" height="16" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ReviewForm({
  sessionId,
  matchNo,
  teamCount,
  teams,
  initialSquads,
  suggestions,
}: {
  sessionId: string;
  matchNo: number;
  teamCount: number;
  teams: ReviewTeam[];
  initialSquads: ReviewSquad[];
  suggestions: ReviewSuggestion[];
}) {
  const router = useRouter();
  // Runtime-added keys live far above the `sq-*` initial namespace.
  const keySeq = useRef(100000);
  const makeKey = (): string => {
    keySeq.current += 1;
    return `r${keySeq.current}`;
  };
  const [rows, setRows] = useState<RowState[]>(() =>
    buildRows(initialSquads, suggestions),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReparse, setConfirmingReparse] = useState(false);

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  const drafts = useMemo(() => rows.map(toDraft), [rows]);
  const issues = useMemo(
    () => validateMapping(drafts, teamCount, teamNameById),
    [drafts, teamCount, teamNameById],
  );
  const hasBlankName = useMemo(
    () => rows.some((row) => row.players.some((p) => p.name.trim() === "")),
    [rows],
  );
  const lobbyKills = useMemo(
    () => rows.reduce((sum, row) => sum + rowKills(row), 0),
    [rows],
  );
  const mappedCount = useMemo(
    () => rows.filter((row) => row.teamId !== null).length,
    [rows],
  );
  const unmappedCount = rows.length - mappedCount;
  // Unmapped rows pin to the top; the rest stay in placement order.
  const ordered = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if ((a.teamId === null) !== (b.teamId === null)) {
          return a.teamId === null ? -1 : 1;
        }
        return a.placement - b.placement;
      }),
    [rows],
  );

  const blockerCount = issues.length + (hasBlankName ? 1 : 0);
  const canConfirm = issues.length === 0 && !hasBlankName && !busy;

  function patchRow(key: string, patch: (row: RowState) => RowState): void {
    setRows((prev) => prev.map((row) => (row.key === key ? patch(row) : row)));
  }

  /** Kills-total edits redistribute onto the last player (confirm stores the player sum). */
  function setKillsTotal(key: string, total: number): void {
    if (!Number.isFinite(total) || total < 0) return;
    patchRow(key, (row) => {
      const delta = Math.round(total) - rowKills(row);
      if (row.players.length === 0) {
        return {
          ...row,
          players: [
            { key: makeKey(), name: "", kills: Math.round(total), low: false },
          ],
        };
      }
      const players = row.players.map((player) => ({ ...player }));
      const last = players[players.length - 1];
      if (!last) return row;
      last.kills = Math.max(0, last.kills + delta);
      return { ...row, players };
    });
  }

  function acceptAll(): void {
    setRows((prev) => {
      const taken = new Set(
        prev.map((row) => row.teamId).filter((id) => id !== null),
      );
      return prev.map((row, i) => {
        if (row.teamId !== null) return row;
        // Rows keep creation order (add-row only appends), so index i still
        // aligns with the server's suggestion list; added rows have none.
        const suggested = suggestions[i]?.teamId ?? null;
        if (suggested && !taken.has(suggested)) {
          taken.add(suggested);
          return { ...row, teamId: suggested };
        }
        const free = teams.find((team) => !taken.has(team.id));
        if (free) {
          taken.add(free.id);
          return { ...row, teamId: free.id };
        }
        return row;
      });
    });
  }

  function addSquadRow(): void {
    const maxPlacement = rows.reduce((m, row) => Math.max(m, row.placement), 0);
    setRows((prev) => [
      ...prev,
      {
        key: makeKey(),
        placement: maxPlacement + 1,
        squadTag: "",
        teamId: null,
        players: [{ key: makeKey(), name: "", kills: 0, low: false }],
        tier: "none",
        low: false,
        open: true,
      },
    ]);
  }

  async function handleConfirm(): Promise<void> {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    const result = await confirmMatchAction(sessionId, matchNo, drafts);
    if (result.ok) {
      router.push(`/sessions/${sessionId}`);
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  async function handleReparse(): Promise<void> {
    setBusy(true);
    const result = await reparseAction(sessionId, matchNo);
    setBusy(false);
    if (result.ok) {
      setConfirmingReparse(false);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mapping summary + bulk actions */}
      <section className="rounded-dash bg-dash-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
              Squad mapping
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold tracking-[-0.02em] text-dash-ink">
              {mappedCount} of {rows.length}
              <span className="text-sm font-semibold text-dash-ink3">
                squads mapped
              </span>
            </p>
            <p className="mt-1 text-[13px] leading-5 text-dash-ink3">
              {unmappedCount > 0
                ? `${unmappedCount} read squad${unmappedCount === 1 ? "" : "s"} still need a team.`
                : "Every squad has a team. Confirm when the numbers look right."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className={compactButtonStyles.secondary}
            >
              Accept all suggestions
            </button>
            {confirmingReparse ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void handleReparse();
                }}
                className={compactButtonStyles.danger}
              >
                {busy ? "Discarding…" : "Confirm re-parse"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReparse(true)}
                className={compactButtonStyles.quiet}
              >
                Re-parse
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar
            value={rows.length === 0 ? 0 : (mappedCount / rows.length) * 100}
            label={`${mappedCount} of ${rows.length} squads mapped`}
            className="flex-1"
          />
          <span className="shrink-0 text-xs font-bold tabular-nums text-dash-ink2">
            {mappedCount}/{rows.length}
          </span>
        </div>

        {confirmingReparse ? (
          <p className="mt-3 rounded-dash-sm bg-dash-amber-bg px-3 py-2 text-[13px] leading-5 text-dash-amber-ink">
            Re-parsing discards your current mapping and reads the screenshots
            again. Confirm re-parse above only if you mean it.
          </p>
        ) : null}
      </section>

      {lobbyKills > LOBBY_KILLS_WARN_AT ? (
        <InlineAlert tone="warning">
          Lobby kills total {lobbyKills} — check for double-counted squads
          before confirming. If this is a Rondo recall match, the total can be
          legitimately higher.
        </InlineAlert>
      ) : null}

      {rows.length < teamCount ? (
        <section className="rounded-dash border border-dash-amber/40 bg-dash-amber-bg/60 p-4">
          <div className="flex items-start gap-2.5">
            <AlertIcon
              width="18"
              height="18"
              className="mt-0.5 shrink-0 text-dash-amber-ink"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-dash-amber-ink">
                Only {rows.length} of {teamCount} squads were read
              </p>
              <p className="mt-0.5 text-[13px] leading-5 text-dash-amber-ink/85">
                Add the missing rows by hand so every team gets a result.
              </p>
            </div>
            <button
              type="button"
              onClick={addSquadRow}
              className={compactButtonStyles.primary}
            >
              Add squad row
            </button>
          </div>
        </section>
      ) : null}

      <ul className="flex flex-col gap-3">
        {ordered.map((row) => {
          const takenElsewhere = new Set(
            rows
              .filter((r) => r.key !== row.key)
              .map((r) => r.teamId)
              .filter((id) => id !== null),
          );
          const options = teams.filter(
            (team) => team.id === row.teamId || !takenElsewhere.has(team.id),
          );
          const isUnmapped = row.teamId === null;
          const isWeak = !isUnmapped && row.tier === "weak";
          const rowKillTotal = rowKills(row);
          const playersPanelId = `players-${row.key}`;

          return (
            <li
              key={row.key}
              className={clsx(
                "rounded-dash bg-dash-surface p-4 transition-colors sm:p-5",
                isUnmapped
                  ? "border border-dash-danger-dot/35"
                  : isWeak
                    ? "border border-dash-amber/45"
                    : "border border-transparent",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  <span className="sr-only">
                    Placement for this squad
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={row.placement}
                    onChange={(e) =>
                      patchRow(row.key, (r) => ({
                        ...r,
                        placement: Number(e.target.value),
                      }))
                    }
                    className="min-h-9 w-14 rounded-[10px] border border-dash-line bg-dash-bg px-2 text-center text-sm font-bold tabular-nums text-dash-ink outline-none focus:border-dash-ink focus:ring-2 focus:ring-dash-lime"
                  />
                </label>

                {row.squadTag ? (
                  <span className="rounded-dash-chip bg-dash-bg px-2 py-1 font-mono text-[11px] font-medium text-dash-ink3">
                    {row.squadTag}
                  </span>
                ) : null}

                {isUnmapped ? (
                  <StatusChip tone="danger">Needs a team</StatusChip>
                ) : isWeak ? (
                  <StatusChip tone="draft">Possible match</StatusChip>
                ) : row.tier === "strong" ? (
                  <StatusChip tone="live">Suggested</StatusChip>
                ) : (
                  <StatusChip>Mapped</StatusChip>
                )}

                {row.low ? (
                  <StatusChip tone="draft">Low-confidence read</StatusChip>
                ) : null}

                <button
                  type="button"
                  aria-expanded={row.open}
                  aria-controls={playersPanelId}
                  aria-label={`${row.open ? "Hide" : "Show"} players for placement ${row.placement}`}
                  onClick={() =>
                    patchRow(row.key, (r) => ({ ...r, open: !r.open }))
                  }
                  className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-dash-ink2 hover:bg-dash-bg hover:text-dash-ink"
                >
                  {row.open ? "Hide players" : "Edit players"}
                  <ChevronUpIcon
                    width="15"
                    height="15"
                    className={clsx("transition-transform", !row.open && "rotate-180")}
                  />
                </button>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_128px]">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                    Team
                  </span>
                  <select
                    aria-label={`Team for placement ${row.placement}`}
                    value={row.teamId ?? ""}
                    onChange={(e) =>
                      patchRow(row.key, (r) => ({
                        ...r,
                        teamId: e.target.value === "" ? null : e.target.value,
                      }))
                    }
                    className={clsx(
                      "min-h-11 w-full rounded-[12px] border bg-dash-surface px-3.5 text-base font-semibold outline-none transition-colors focus:border-dash-ink focus:ring-2 focus:ring-dash-lime",
                      isUnmapped
                        ? "border-dash-danger-dot/50 text-dash-danger-ink"
                        : "border-dash-line text-dash-ink",
                    )}
                  >
                    <option value="">— pick a team —</option>
                    {options.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                    Squad kills
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={rowKillTotal}
                    onChange={(e) => setKillsTotal(row.key, Number(e.target.value))}
                    className="min-h-11 w-full rounded-[12px] border border-dash-line bg-dash-bg px-3 text-center text-base font-bold tabular-nums text-dash-ink outline-none transition-colors hover:border-dash-ink4 focus:border-dash-ink focus:ring-2 focus:ring-dash-lime"
                  />
                </label>
              </div>

              <div id={playersPanelId}>
                {row.open ? (
                  <div className="mt-4 border-t border-dash-bg pt-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                        Players
                      </p>
                      <p className="text-[12px] text-dash-ink3">
                        {row.players.length}/4 · {rowKillTotal} kills
                      </p>
                    </div>

                    {row.players.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {row.players.map((player, pi) => (
                          <li
                            key={player.key}
                            className="grid grid-cols-[minmax(0,1fr)_72px_44px] items-center gap-2"
                          >
                            <div className="min-w-0">
                              <label className="sr-only" htmlFor={`player-name-${player.key}`}>
                                Player {pi + 1} name, placement {row.placement}
                              </label>
                              <input
                                id={`player-name-${player.key}`}
                                type="text"
                                value={player.name}
                                onChange={(e) =>
                                  patchRow(row.key, (r) => ({
                                    ...r,
                                    players: r.players.map((p) =>
                                      p.key === player.key
                                        ? { ...p, name: e.target.value }
                                        : p,
                                    ),
                                  }))
                                }
                                placeholder={
                                  player.low ? "Check the spelling" : "Player name"
                                }
                                className={clsx(
                                  "min-h-11 w-full rounded-[10px] border bg-dash-surface px-3 text-sm text-dash-ink outline-none transition-colors placeholder:text-dash-ink4 focus:border-dash-ink focus:ring-2 focus:ring-dash-lime",
                                  player.low
                                    ? "border-dash-amber/60"
                                    : "border-dash-line",
                                )}
                              />
                            </div>
                            <div>
                              <label className="sr-only" htmlFor={`player-kills-${player.key}`}>
                                Player {pi + 1} kills, placement {row.placement}
                              </label>
                              <input
                                id={`player-kills-${player.key}`}
                                type="number"
                                min={0}
                                value={player.kills}
                                onChange={(e) =>
                                  patchRow(row.key, (r) => ({
                                    ...r,
                                    players: r.players.map((p) =>
                                      p.key === player.key
                                        ? {
                                            ...p,
                                            kills: Math.max(
                                              0,
                                              Math.round(Number(e.target.value)),
                                            ),
                                          }
                                        : p,
                                    ),
                                  }))
                                }
                                className={clsx(
                                  "min-h-11 w-full rounded-[10px] border bg-dash-bg px-2 text-center text-sm font-semibold tabular-nums text-dash-ink outline-none focus:border-dash-ink focus:ring-2 focus:ring-dash-lime",
                                  player.low
                                    ? "border-dash-amber/60"
                                    : "border-dash-line",
                                )}
                              />
                            </div>
                            <button
                              type="button"
                              aria-label={`Remove player ${pi + 1}, placement ${row.placement}`}
                              onClick={() =>
                                patchRow(row.key, (r) => ({
                                  ...r,
                                  players: r.players.filter(
                                    (p) => p.key !== player.key,
                                  ),
                                }))
                              }
                              className="inline-flex size-11 items-center justify-center rounded-full text-dash-ink4 transition-colors hover:bg-dash-danger-bg hover:text-dash-danger-ink"
                            >
                              <XIcon width="16" height="16" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-dash-sm bg-dash-bg px-3 py-3 text-[13px] text-dash-ink3">
                        No players on this squad yet.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={row.players.length >= 4}
                      onClick={() =>
                        patchRow(row.key, (r) => ({
                          ...r,
                          players: [
                            ...r.players,
                            { key: makeKey(), name: "", kills: 0, low: false },
                          ],
                        }))
                      }
                      className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-dash-line px-3 text-[13px] font-semibold text-dash-ink2 transition-colors hover:border-dash-ink4 hover:bg-dash-subtle disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <PlusIcon width="15" height="15" />
                      Add player
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {hasBlankName ? (
        <InlineAlert>Every player needs a name before confirming.</InlineAlert>
      ) : null}

      {issues.length > 0 ? (
        <section
          aria-label="Mapping issues"
          className="rounded-dash border border-dash-line bg-dash-surface p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-dash-danger-ink">
            <AlertIcon width="18" height="18" />
            {issues.length} thing{issues.length === 1 ? "" : "s"} to fix before
            confirm
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {issues.map((issue, i) => (
              <li key={i} className="text-[13px] leading-5 text-dash-ink2">
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      {/* Sticky confirm bar: the last decision on the page stays reachable. */}
      <div className="sticky bottom-3 z-10 mt-1 rounded-dash-lg border border-dash-line bg-dash-surface/95 p-3 shadow-[0_12px_40px_-16px_rgba(17,24,39,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-dash-ink">
              {canConfirm ? (
                <>
                  <CheckIcon
                    width="16"
                    height="16"
                    className="text-dash-lime-ink"
                  />
                  Ready to confirm match {matchNo}
                </>
              ) : (
                <>
                  <AlertIcon
                    width="16"
                    height="16"
                    className="text-dash-amber-ink"
                  />
                  {blockerCount} blocker{blockerCount === 1 ? "" : "s"} left
                </>
              )}
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-dash-ink3">
              {lobbyKills} lobby kills · {mappedCount}/{teamCount} teams mapped
            </p>
          </div>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              void handleConfirm();
            }}
            className={clsx(buttonStyles.primary, "w-full sm:w-auto sm:min-w-[220px]")}
          >
            {busy ? "Confirming…" : `Confirm Match ${matchNo}`}
          </button>
        </div>
      </div>
    </div>
  );
}
