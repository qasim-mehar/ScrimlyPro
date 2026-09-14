"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { lockMvpAction } from "@/app/sessions/[id]/mvp/actions";
import { validateMvpEntries } from "@/lib/mvp/lock";

export type MvpEditorEntry = {
  name: string;
  teamId: string;
  kills: number;
  variants: string[];
  manualMerge?: boolean;
};

export type MvpPlayerOption = {
  displayName: string;
  teamId: string;
  kills: number;
  variants: string[];
};

export type MvpTeamOption = {
  id: string;
  name: string;
  logoUrl: string | null;
};

type MvpEditorProps = {
  sessionId: string;
  initialList: MvpEditorEntry[];
  allPlayers: MvpPlayerOption[];
  teams: MvpTeamOption[];
};

type Row = MvpEditorEntry & { uid: string };

const SEARCH_LIMIT = 8;

function toRow(entry: MvpEditorEntry, uid: string): Row {
  return {
    name: entry.name,
    teamId: entry.teamId,
    kills: entry.kills,
    variants: [...entry.variants],
    manualMerge: entry.manualMerge,
    uid,
  };
}

/**
 * The MVP editor (C6.1) — the heart of the finale. All edits are
 * client-only state until Lock: editor edits NEVER rewrite match_results
 * (PRD). Heavy OCR drift deliberately stays split in aggregation (C2.3);
 * the organizer finishes that job here via the merge-two-entries flow.
 */
export function MvpEditor({ sessionId, initialList, allPlayers, teams }: MvpEditorProps) {
  const router = useRouter();
  const uidRef = useRef(initialList.length);
  const [rows, setRows] = useState<Row[]>(() =>
    initialList.map((entry, index) => toRow(entry, `row-${index}`)),
  );
  const [query, setQuery] = useState("");
  const [mergeUids, setMergeUids] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  const issues = useMemo(
    () =>
      validateMvpEntries(
        rows.map((row) => ({ name: row.name, teamId: row.teamId, kills: row.kills })),
        teams,
      ),
    [rows, teams],
  );
  const canLock = rows.length === 5 && issues.length === 0 && !busy;

  const nextUid = () => {
    uidRef.current += 1;
    return `row-${uidRef.current}`;
  };

  function updateRow(uid: string, patch: Partial<Pick<Row, "name" | "kills">>) {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
  }

  function move(uid: string, direction: -1 | 1) {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.uid === uid);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  }

  function removeRow(uid: string) {
    setRows((prev) => prev.filter((row) => row.uid !== uid));
    setMergeUids((prev) => prev.filter((selected) => selected !== uid));
  }

  function toggleMergeSelect(uid: string) {
    setMergeUids((prev) =>
      prev.includes(uid) ? prev.filter((selected) => selected !== uid) : [...prev, uid].slice(-2),
    );
  }

  const mergePair = useMemo(() => {
    if (mergeUids.length !== 2) return null;
    const pair = rows.filter((row) => mergeUids.includes(row.uid));
    if (pair.length !== 2) return null;
    return pair as [Row, Row];
  }, [mergeUids, rows]);

  function mergeRows(keepUid: string) {
    if (!mergePair) return;
    const [first, second] = mergePair;
    const keep = first.uid === keepUid ? first : second;
    const merged: Row = {
      uid: first.uid,
      name: keep.name,
      // The kept name decides the team — in practice both rows share one.
      teamId: keep.teamId,
      kills: first.kills + second.kills,
      variants: [...new Set([...first.variants, ...second.variants, first.name, second.name])],
      manualMerge: true,
    };
    setRows((prev) =>
      prev
        .map((row) => (row.uid === first.uid ? merged : row))
        .filter((row) => row.uid !== second.uid),
    );
    setMergeUids([]);
  }

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return [];
    return allPlayers
      .filter(
        (player) =>
          player.displayName.toLowerCase().includes(needle) &&
          !rows.some(
            (row) => row.teamId === player.teamId && row.name.trim() === player.displayName,
          ),
      )
      .slice(0, SEARCH_LIMIT);
  }, [query, allPlayers, rows]);

  function addPlayer(player: MvpPlayerOption) {
    setRows((prev) => [
      ...prev,
      toRow(
        {
          name: player.displayName,
          teamId: player.teamId,
          kills: player.kills,
          variants: [...player.variants],
        },
        nextUid(),
      ),
    ]);
    setQuery("");
  }

  async function onLock() {
    setBusy(true);
    setError(null);
    try {
      const result = await lockMvpAction(
        sessionId,
        rows.map((row) => ({ name: row.name, teamId: row.teamId, kills: row.kills })),
      );
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.issues.join(" "));
      }
    } catch {
      setError("Lock failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.uid}
            className="rounded-lg border border-line bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <span
                aria-label={`Rank ${index + 1}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-surface-2 text-lg font-bold text-gold"
              >
                {index + 1}
              </span>
              <input
                value={row.name}
                onChange={(event) => updateRow(row.uid, { name: event.target.value })}
                aria-label={`Player name, rank ${index + 1}`}
                maxLength={60}
                className="min-h-[44px] w-full min-w-0 rounded-md border border-line bg-surface-2 px-3 text-base text-white"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="min-h-[44px] flex-1 items-center rounded-md px-1 text-sm text-muted">
                {teamNames.get(row.teamId) ?? "Unknown team"}
              </span>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-muted">
                Kills
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={row.kills}
                  onChange={(event) =>
                    updateRow(row.uid, {
                      kills: Number.isNaN(event.target.valueAsNumber)
                        ? 0
                        : Math.trunc(event.target.valueAsNumber),
                    })
                  }
                  aria-label={`Kills, rank ${index + 1}`}
                  className="min-h-[44px] w-20 rounded-md border border-line bg-surface-2 px-2 text-base text-white"
                />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => move(row.uid, -1)}
                disabled={index === 0}
                aria-label={`Move rank ${index + 1} up`}
                className="min-h-[44px] min-w-[44px] rounded-md border border-line bg-surface-2 px-3 text-lg text-white disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(row.uid, 1)}
                disabled={index === rows.length - 1}
                aria-label={`Move rank ${index + 1} down`}
                className="min-h-[44px] min-w-[44px] rounded-md border border-line bg-surface-2 px-3 text-lg text-white disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeRow(row.uid)}
                aria-label={`Remove rank ${index + 1}`}
                className="min-h-[44px] min-w-[44px] rounded-md border border-line bg-surface-2 px-3 text-lg text-white"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => toggleMergeSelect(row.uid)}
                aria-pressed={mergeUids.includes(row.uid)}
                aria-label={`Select rank ${index + 1} for merge`}
                title="Select for merge"
                className={
                  mergeUids.includes(row.uid)
                    ? "min-h-[44px] rounded-md border border-gold bg-surface-2 px-3 text-sm font-semibold text-gold"
                    : "min-h-[44px] rounded-md border border-line bg-surface-2 px-3 text-sm font-semibold text-muted"
                }
              >
                Merge
              </button>
              {row.manualMerge ? (
                <span className="rounded-md border border-gold px-2 py-1 text-xs font-semibold text-gold">
                  merged by hand
                </span>
              ) : null}
            </div>
            {row.variants.length > 1 ? (
              <details className="mt-2 text-xs text-muted">
                <summary className="min-h-[44px] cursor-pointer py-3">
                  {row.variants.length} spellings merged: {row.variants.join(" · ")}
                </summary>
              </details>
            ) : null}
          </li>
        ))}
      </ol>

      {mergePair ? (
        <div className="rounded-lg border border-gold bg-surface p-3">
          <p className="text-sm font-semibold text-gold">
            Merge {mergePair[0].name} + {mergePair[1].name} — keep which name?
          </p>
          <p className="mt-1 text-xs text-muted">
            Kills sum ({mergePair[0].kills} + {mergePair[1].kills}); spellings
            combine into one entry.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mergePair.map((row) => (
              <button
                key={row.uid}
                type="button"
                onClick={() => mergeRows(row.uid)}
                className="min-h-[44px] flex-1 rounded-md border border-gold bg-surface-2 px-4 text-sm font-semibold text-white"
              >
                {row.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMergeUids([])}
              className="min-h-[44px] rounded-md border border-line bg-surface-2 px-4 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-surface p-3">
        <label
          htmlFor="mvp-player-search"
          className="text-sm font-semibold text-white"
        >
          Add via search
        </label>
        <input
          id="mvp-player-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a player name…"
          className="mt-2 min-h-[44px] w-full rounded-md border border-line bg-surface-2 px-3 text-base text-white"
        />
        {query.trim() !== "" && searchResults.length === 0 ? (
          <p className="mt-2 text-xs text-muted">
            No matching players — try a different spelling.
          </p>
        ) : null}
        <ul className="mt-2 flex flex-col gap-2">
          {searchResults.map((player) => (
            <li
              key={`${player.teamId}|${player.displayName}`}
              className="flex items-center gap-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {player.displayName}{" "}
                <span className="text-muted">
                  · {teamNames.get(player.teamId) ?? "Unknown team"} · {player.kills} kills
                </span>
              </span>
              <button
                type="button"
                onClick={() => addPlayer(player)}
                aria-label={`Add ${player.displayName}`}
                className="min-h-[44px] min-w-[44px] rounded-md border border-gold bg-surface-2 px-3 text-lg font-bold text-gold"
              >
                +
              </button>
            </li>
          ))}
        </ul>
      </div>

      {issues.length > 0 ? (
        <ul className="rounded-lg border border-line bg-surface p-3 text-sm text-gold">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-line bg-surface p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onLock}
        disabled={!canLock}
        className="min-h-[44px] rounded-md bg-gold px-4 text-base font-bold text-black disabled:opacity-30"
      >
        {busy ? "Locking…" : "Lock Top-5"}
      </button>
      {!busy && rows.length !== 5 ? (
        <p className="text-xs text-muted">
          Lock needs exactly 5 entries (currently {rows.length}).
        </p>
      ) : null}
    </section>
  );
}
