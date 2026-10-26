"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

import { lockMvpAction } from "@/app/sessions/[id]/mvp/actions";
import { validateMvpEntries } from "@/lib/mvp/lock";
import { AlertIcon, LinkIcon, SearchIcon, TrophyIcon } from "@/components/dashboard/icons";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronUpIcon,
  XIcon,
} from "@/components/app/icons";
import { buttonStyles, compactButtonStyles } from "@/components/app/ui";

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
  const namedCount = rows.filter((row) => row.name.trim() !== "").length;

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
    <section className="flex flex-col gap-5">
      {/* Finale checklist: the graphic renders this list, nothing else. */}
      <div className="relative overflow-hidden rounded-dash-lg bg-dash-ink p-5 text-white sm:p-6">
        <div aria-hidden="true" className="app-grid absolute inset-0" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-dash-lime uppercase">
              <TrophyIcon width="15" height="15" />
              Finale checklist
            </p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-[-0.025em] sm:text-[28px]">
              Five names, then lock the list.
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-6 text-white/60">
              Locked entries are the only thing the graphic renders. Reorder
              with the arrows until the ranks read correctly.
            </p>

            <ol className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:max-w-xl">
              {Array.from({ length: 5 }, (_, index) => {
                const row = rows[index];
                return (
                  <li
                    key={index}
                    className={clsx(
                      "flex min-h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px]",
                      row ? "bg-white/[0.07]" : "bg-white/[0.035]",
                    )}
                  >
                    <span
                      className={clsx(
                        "w-4 shrink-0 text-xs font-bold tabular-nums",
                        row ? "text-dash-lime" : "text-white/30",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={clsx(
                        "min-w-0 flex-1 truncate",
                        row ? "font-semibold text-white" : "text-white/35",
                      )}
                    >
                      {row ? row.name.trim() || "Unnamed entry" : "Empty slot"}
                    </span>
                    {row ? (
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-white/55">
                        {row.kills}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="w-full shrink-0 rounded-dash bg-white/[0.06] p-4 lg:w-64">
            <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">
              Readiness
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {[
                { ok: rows.length === 5, label: `${rows.length}/5 entries` },
                { ok: namedCount === 5 && rows.length === 5, label: "Every entry named" },
                {
                  ok: rows.length > 0 && rows.every((row) => row.name.trim() !== "" && row.kills >= 0),
                  label: "Valid kill counts",
                },
                { ok: issues.length === 0, label: "No duplicates or bad teams" },
              ].map((check) => (
                <li
                  key={check.label}
                  className="flex items-center gap-2 text-[13px] text-white/80"
                >
                  <span
                    className={clsx(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      check.ok
                        ? "bg-dash-lime text-dash-ink"
                        : "bg-white/10 text-white/30",
                    )}
                  >
                    {check.ok ? (
                      <CheckIcon width="12" height="12" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.uid}
            className="rounded-dash bg-dash-surface p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={clsx(
                  "flex size-10 shrink-0 items-center justify-center rounded-[12px] text-base font-bold tabular-nums",
                  index === 0
                    ? "bg-dash-lime text-dash-ink"
                    : "bg-dash-bg text-dash-ink2",
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`mvp-name-${row.uid}`}>
                  Player name, rank {index + 1}
                </label>
                <input
                  id={`mvp-name-${row.uid}`}
                  value={row.name}
                  onChange={(event) => updateRow(row.uid, { name: event.target.value })}
                  maxLength={60}
                  placeholder="Player name"
                  className="min-h-10 w-full border-0 bg-transparent p-0 text-base font-bold text-dash-ink outline-none placeholder:font-medium placeholder:text-dash-ink4 focus:ring-0"
                />
                <p className="mt-0.5 truncate text-[13px] text-dash-ink3">
                  {teamNames.get(row.teamId) ?? "Unknown team"}
                  {row.manualMerge ? (
                    <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-semibold text-dash-ink2">
                      <span className="rounded-[4px] bg-dash-bg px-1.5 py-0.5">
                        merged by hand
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>

              <label className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[10px] font-semibold tracking-wide text-dash-ink3 uppercase">
                  Kills
                </span>
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
                  className="min-h-10 w-20 rounded-[10px] border border-dash-line bg-dash-bg px-2 text-center text-base font-bold tabular-nums text-dash-ink outline-none focus:border-dash-ink focus:ring-2 focus:ring-dash-lime"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dash-bg pt-3">
              <button
                type="button"
                onClick={() => move(row.uid, -1)}
                disabled={index === 0}
                aria-label={`Move rank ${index + 1} up`}
                className="inline-flex size-9 items-center justify-center rounded-full text-dash-ink2 transition-colors hover:bg-dash-bg hover:text-dash-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUpIcon width="16" height="16" />
              </button>
              <button
                type="button"
                onClick={() => move(row.uid, 1)}
                disabled={index === rows.length - 1}
                aria-label={`Move rank ${index + 1} down`}
                className="inline-flex size-9 items-center justify-center rounded-full text-dash-ink2 transition-colors hover:bg-dash-bg hover:text-dash-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDownIcon width="16" height="16" />
              </button>
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-dash-line" />
              <button
                type="button"
                onClick={() => toggleMergeSelect(row.uid)}
                aria-pressed={mergeUids.includes(row.uid)}
                aria-label={`Select rank ${index + 1} for merge`}
                title="Select for merge"
                className={clsx(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                  mergeUids.includes(row.uid)
                    ? "bg-dash-ink text-white"
                    : "text-dash-ink2 hover:bg-dash-bg hover:text-dash-ink",
                )}
              >
                <LinkIcon width="14" height="14" />
                {mergeUids.includes(row.uid) ? "Selected" : "Merge"}
              </button>
              <button
                type="button"
                onClick={() => removeRow(row.uid)}
                aria-label={`Remove rank ${index + 1}`}
                className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-dash-ink3 transition-colors hover:bg-dash-danger-bg hover:text-dash-danger-ink"
              >
                <XIcon width="14" height="14" />
                Remove
              </button>
            </div>

            {row.variants.length > 1 ? (
              <details className="group mt-2 border-t border-dash-bg pt-2 text-xs text-dash-ink3">
                <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 py-1.5 font-medium">
                  <ChevronUpIcon
                    width="14"
                    height="14"
                    className="transition-transform group-open:rotate-180"
                  />
                  {row.variants.length} spellings merged
                </summary>
                <p className="pb-1 leading-5">{row.variants.join(" · ")}</p>
              </details>
            ) : null}
          </li>
        ))}
      </ol>

      {mergePair ? (
        <div className="rounded-dash border border-dash-ink bg-dash-ink p-4 text-white">
          <p className="text-sm font-semibold">
            Merge {mergePair[0].name} + {mergePair[1].name} — keep which name?
          </p>
          <p className="mt-1 text-[12px] leading-5 text-white/55">
            Kills sum ({mergePair[0].kills} + {mergePair[1].kills}); spellings
            combine into one entry.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {mergePair.map((row) => (
              <button
                key={row.uid}
                type="button"
                onClick={() => mergeRows(row.uid)}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-dash-lime px-4 text-sm font-semibold text-dash-ink transition-colors hover:bg-[#cdf67f]"
              >
                Keep “{row.name}”
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMergeUids([])}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : mergeUids.length === 1 ? (
        <p className="rounded-dash-sm bg-dash-amber-bg px-3 py-2 text-[13px] text-dash-amber-ink">
          Select one more entry to merge with this one. Kills are summed and
          spellings combine.
        </p>
      ) : null}

      <div className="rounded-dash bg-dash-surface p-4 sm:p-5">
        <label
          htmlFor="mvp-player-search"
          className="text-sm font-bold text-dash-ink"
        >
          Add a missing player
        </label>
        <p className="mt-0.5 text-[13px] text-dash-ink3">
          Search every confirmed player in this session.
        </p>
        <div className="relative mt-3">
          <SearchIcon
            width="17"
            height="17"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-dash-ink4"
          />
          <input
            id="mvp-player-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a player name…"
            className="min-h-11 w-full rounded-[12px] border border-dash-line bg-dash-surface pr-3.5 pl-10 text-base text-dash-ink outline-none transition-colors placeholder:text-dash-ink4 hover:border-dash-ink4 focus:border-dash-ink focus:ring-2 focus:ring-dash-lime"
          />
        </div>
        {query.trim() !== "" && searchResults.length === 0 ? (
          <p className="mt-2.5 rounded-dash-sm bg-dash-bg px-3 py-2.5 text-[13px] text-dash-ink3">
            No matching players — try a different spelling, or merge two
            existing entries above.
          </p>
        ) : null}
        <ul className="mt-2 flex flex-col gap-1.5">
          {searchResults.map((player) => (
            <li
              key={`${player.teamId}|${player.displayName}`}
              className="flex items-center gap-2 rounded-dash-sm bg-dash-bg px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-dash-ink">
                {player.displayName}{" "}
                <span className="font-normal text-dash-ink3">
                  · {teamNames.get(player.teamId) ?? "Unknown team"} ·{" "}
                  {player.kills} kills
                </span>
              </span>
              <button
                type="button"
                onClick={() => addPlayer(player)}
                aria-label={`Add ${player.displayName}`}
                className={compactButtonStyles.primary}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>

      {issues.length > 0 ? (
        <ul className="rounded-dash border border-dash-line bg-dash-surface p-4 text-[13px] leading-5 text-dash-ink2">
          {issues.map((issue) => (
            <li key={issue} className="flex items-start gap-2">
              <AlertIcon
                width="15"
                height="15"
                className="mt-0.5 shrink-0 text-dash-amber-ink"
              />
              {issue}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-dash-sm bg-dash-danger-bg px-3 py-2.5 text-[13px] leading-5 text-dash-danger-ink"
        >
          <AlertIcon width="15" height="15" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 rounded-dash-lg border border-dash-line bg-dash-surface/95 p-3 shadow-[0_12px_40px_-16px_rgba(17,24,39,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dash-ink">
              {canLock
                ? "The list is ready to lock"
                : rows.length !== 5
                  ? `Lock needs exactly 5 entries (${rows.length} now)`
                  : `${issues.length} thing${issues.length === 1 ? "" : "s"} to fix`}
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-dash-ink3">
              Locking freezes this exact order for the graphic.
            </p>
          </div>
          <button
            type="button"
            onClick={onLock}
            disabled={!canLock}
            className={clsx(buttonStyles.primary, "w-full sm:w-auto sm:min-w-[200px]")}
          >
            <TrophyIcon width="16" height="16" />
            {busy ? "Locking…" : "Lock Top 5"}
          </button>
        </div>
      </div>
    </section>
  );
}
