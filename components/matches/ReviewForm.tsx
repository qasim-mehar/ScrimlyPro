"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  confirmMatchAction,
  reparseAction,
} from "@/app/sessions/[id]/matches/[matchNo]/actions";
import {
  validateMapping,
  type SquadRowDraft,
} from "@/lib/matches/mapping";
import type { SuggestionTier } from "@/lib/matching";

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
    <div className="flex flex-col gap-3">
      {lobbyKills > LOBBY_KILLS_WARN_AT ? (
        <p role="alert" className="rounded-lg border border-yellow-500/60 bg-surface p-3 text-sm text-yellow-300">
          Lobby kills {lobbyKills} — check for double-counted squads, or confirm
          Rondo recall match
        </p>
      ) : null}
      {rows.length < teamCount ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
          <p role="alert" className="text-sm text-muted">
            Only {rows.length} of {teamCount} squads — add the missing rows by hand.
          </p>
          <button
            type="button"
            onClick={addSquadRow}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-muted"
          >
            Add squad row
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={acceptAll}
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-muted"
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
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-red-500/60 px-3 text-sm font-semibold text-red-300 disabled:opacity-50"
          >
            {busy ? "Discarding…" : "Confirm re-parse"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReparse(true)}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-muted"
          >
            Re-parse
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
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
          const border = row.teamId === null
            ? "border-red-500/60"
            : row.tier === "weak"
              ? "border-yellow-500/60"
              : "border-line";
          return (
            <li
              key={row.key}
              className={`flex flex-col gap-2 rounded-lg border bg-surface p-3 ${border}`}
            >
              <div className="flex items-center gap-2">
                <label className="flex min-h-[44px] items-center gap-1 text-sm text-muted">
                  #
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
                    className="min-h-[44px] w-14 rounded border border-line bg-bg px-2 text-center text-sm"
                  />
                </label>
                {row.squadTag ? (
                  <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                    [{row.squadTag}]
                  </span>
                ) : null}
                {row.low ? (
                  <span className="rounded border border-yellow-500/60 px-2 py-0.5 text-xs text-yellow-300">
                    low confidence
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Toggle players for placement ${row.placement}`}
                  onClick={() =>
                    patchRow(row.key, (r) => ({ ...r, open: !r.open }))
                  }
                  className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line text-muted"
                >
                  {row.open ? "−" : "+"}
                </button>
              </div>

              <select
                aria-label={`Team for placement ${row.placement}`}
                value={row.teamId ?? ""}
                onChange={(e) =>
                  patchRow(row.key, (r) => ({
                    ...r,
                    teamId: e.target.value === "" ? null : e.target.value,
                  }))
                }
                className="min-h-[44px] w-full rounded-lg border border-line bg-bg px-3 text-sm"
              >
                <option value="">— pick a team —</option>
                {options.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <label className="flex min-h-[44px] items-center gap-2 text-sm text-muted">
                Kills
                <input
                  type="number"
                  min={0}
                  value={rowKills(row)}
                  onChange={(e) => setKillsTotal(row.key, Number(e.target.value))}
                  className="min-h-[44px] w-20 rounded border border-line bg-bg px-2 text-center text-sm"
                />
              </label>

              {row.open ? (
                <ul className="flex flex-col gap-2">
                  {row.players.map((player, pi) => (
                    <li key={player.key} className="flex items-center gap-2">
                      <input
                        aria-label={`Player ${pi + 1} name, placement ${row.placement}`}
                        type="text"
                        value={player.name}
                        onChange={(e) =>
                          patchRow(row.key, (r) => ({
                            ...r,
                            players: r.players.map((p) =>
                              p.key === player.key ? { ...p, name: e.target.value } : p,
                            ),
                          }))
                        }
                        placeholder="Player name"
                        className={`min-h-[44px] min-w-0 flex-1 rounded border bg-bg px-2 text-sm ${
                          player.low ? "border-yellow-500/60" : "border-line"
                        }`}
                      />
                      <input
                        aria-label={`Player ${pi + 1} kills, placement ${row.placement}`}
                        type="number"
                        min={0}
                        value={player.kills}
                        onChange={(e) =>
                          patchRow(row.key, (r) => ({
                            ...r,
                            players: r.players.map((p) =>
                              p.key === player.key
                                ? { ...p, kills: Math.max(0, Math.round(Number(e.target.value))) }
                                : p,
                            ),
                          }))
                        }
                        className={`min-h-[44px] w-16 rounded border bg-bg px-2 text-center text-sm ${
                          player.low ? "border-yellow-500/60" : "border-line"
                        }`}
                      />
                      <button
                        type="button"
                        aria-label={`Remove player ${pi + 1}, placement ${row.placement}`}
                        onClick={() =>
                          patchRow(row.key, (r) => ({
                            ...r,
                            players: r.players.filter((p) => p.key !== player.key),
                          }))
                        }
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line text-lg text-red-300"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                  <li>
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
                      className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-muted disabled:opacity-30"
                    >
                      + Add player
                    </button>
                  </li>
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hasBlankName ? (
        <p role="alert" className="text-sm text-red-400">
          Every player needs a name before confirming.
        </p>
      ) : null}
      {issues.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {issues.map((issue, i) => (
            <li key={i} role="alert" className="text-sm text-red-400">
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-red-500/60 bg-surface p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => {
          void handleConfirm();
        }}
        className="flex min-h-[44px] items-center justify-center rounded-lg bg-gold px-4 font-display text-lg font-semibold text-bg disabled:opacity-50"
      >
        {busy ? "Confirming…" : `Confirm Match ${matchNo}`}
      </button>
    </div>
  );
}
