"use client";

import { createSessionAction } from "@/app/sessions/new/actions";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";

import {
  CheckIcon,
  ImageIcon,
  LockIcon,
  MinusIcon,
  ShareIcon,
  XIcon,
} from "@/components/app/icons";
import {
  buttonStyles,
  EmptyState,
  fieldStyles,
  StatusChip,
} from "@/components/app/ui";
import { CameraIcon, PlusIcon, SparklesIcon } from "@/components/dashboard/icons";
import { AESTHETICS, type AestheticId } from "@/lib/graphics";
import { SUPER_RULES } from "@/lib/scoring";
import {
  parseTeamInput,
  validateSessionDraft,
  type SessionDraft,
  type ValidationIssue,
} from "@/lib/sessions/input";
import { SAMPLE_TEAM_NAMES } from "@/lib/sessions/samples";
import type { ActiveOrg } from "@/lib/orgs/orgs";
import { resizeLogoFile } from "./resize-logo";

const STEP_LABELS = ["Basics", "Teams", "Confirm"] as const;
const MATCH_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const MIN_TEAMS = 4;
const MAX_TEAMS = 25;

function issueMessage(
  issues: ValidationIssue[],
  field: "name" | "plannedMatches" | "teamCount" | "templateId" | "teams" | "orgId",
): string | undefined {
  return issues.find((issue) => issue.field === field)?.message;
}

function indexedIssueMessage(
  issues: ValidationIssue[],
  field: "teamName" | "logoUrl",
  index: number,
): string | undefined {
  return issues.find((issue) => issue.field === field && issue.index === index)
    ?.message;
}

function ordinal(n: number): string {
  const suffix = ["th", "st", "nd", "rd"][n % 10] ?? "th";
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${suffix}`;
}

export default function CreateSessionWizard({ orgs }: { orgs: ActiveOrg[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [plannedMatches, setPlannedMatches] = useState("4");
  const [teamCount, setTeamCount] = useState("16");
  const [templateId, setTemplateId] = useState<AestheticId>("dark-gold");
  // Default to the user's first org (oldest membership); server re-verifies.
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [rawTeams, setRawTeams] = useState("");
  // Logos are keyed by NAME so re-parsing the textarea doesn't orphan
  // uploads — editing a name after uploading loses that association
  // (documented, acceptable for v1: re-upload).
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [logoErrors, setLogoErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resultIssues, setResultIssues] = useState<ValidationIssue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsed = useMemo(() => parseTeamInput(rawTeams), [rawTeams]);

  const draft: SessionDraft = useMemo(
    () => ({
      name,
      plannedMatches: Number(plannedMatches),
      teamCount: Number(teamCount),
      templateId,
      teams: parsed.map((teamName) => ({
        name: teamName,
        logoUrl: logos[teamName] ?? null,
      })),
      orgId,
    }),
    [name, plannedMatches, teamCount, templateId, parsed, logos, orgId],
  );

  const allIssues = useMemo(() => validateSessionDraft(draft), [draft]);
  const basicsIssues = useMemo(
    () =>
      validateSessionDraft({ ...draft, teams: [] }).filter(
        (issue) => issue.field !== "teams",
      ),
    [draft],
  );
  const teamsIssues = useMemo(
    () =>
      allIssues.filter(
        (issue) =>
          issue.field === "teams" ||
          issue.field === "teamName" ||
          issue.field === "logoUrl",
      ),
    [allIssues],
  );

  const step1Valid = basicsIssues.length === 0;
  const step2Valid = allIssues.length === 0;
  const countMatch = parsed.length === draft.teamCount;
  const selectedOrg = orgs.find((org) => org.id === orgId);
  const aesthetic = AESTHETICS[templateId];
  const loggedInTeamCount = parsed.length;

  function changeTeamCount(delta: -1 | 1): void {
    const current = Number(teamCount);
    const base = Number.isFinite(current) ? current : MIN_TEAMS;
    setTeamCount(String(Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, base + delta))));
  }

  async function handleLogoFile(teamName: string, file: File | undefined) {
    if (!file) return;
    setLogoErrors((prev) => {
      const next = { ...prev };
      delete next[teamName];
      return next;
    });
    try {
      const dataUrl = await resizeLogoFile(file);
      setLogos((prev) => ({ ...prev, [teamName]: dataUrl }));
    } catch (error) {
      setLogoErrors((prev) => ({
        ...prev,
        [teamName]:
          error instanceof Error
            ? error.message
            : "Could not process that image.",
      }));
    }
  }

  function removeLogo(teamName: string) {
    setLogos((prev) => {
      const next = { ...prev };
      delete next[teamName];
      return next;
    });
  }

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    setResultIssues([]);
    setErrorMessage(null);
    // One submit path, one handler: await the action, then navigate.
    const result = await createSessionAction(draft);
    if (result.ok) {
      router.push(`/sessions/${result.sessionId}`);
      return;
    }
    if ("issues" in result) setResultIssues(result.issues);
    else setErrorMessage(result.message);
    setBusy(false);
  }

  return (
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)] lg:gap-6">
      <div className="min-w-0 overflow-hidden rounded-dash-lg bg-dash-surface">
        {/* Step indicator */}
        <div className="border-b border-dash-bg px-5 py-4 sm:px-7">
          <ol className="flex items-center gap-2" aria-label="Create scrim steps">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const done = step > n;
              const active = step === n;
              return (
                <li
                  key={label}
                  aria-current={active ? "step" : undefined}
                  className={clsx(
                    "flex items-center gap-2",
                    i < STEP_LABELS.length - 1 && "flex-1",
                  )}
                >
                  <span
                    className={clsx(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      done
                        ? "bg-dash-lime text-dash-lime-ink"
                        : active
                          ? "bg-dash-ink text-white"
                          : "bg-dash-bg text-dash-ink3",
                    )}
                  >
                    {done ? <CheckIcon width="14" height="14" /> : n}
                  </span>
                  <span
                    className={clsx(
                      "text-[13px] font-semibold whitespace-nowrap",
                      active || done ? "text-dash-ink" : "text-dash-ink3",
                    )}
                  >
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "mx-1 hidden h-px flex-1 sm:block",
                        done ? "bg-dash-lime-ink/30" : "bg-dash-line",
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="p-5 sm:p-7">
          {step === 1 && (
            <section className="flex flex-col gap-6">
              <div>
                <p className="text-xl font-bold tracking-[-0.015em] text-dash-ink">
                  Set the scrim up
                </p>
                <p className="mt-1 text-sm leading-6 text-dash-ink3">
                  Name it, choose the format, and pick the look of the graphics
                  you&apos;ll share.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="scrim-org" className={fieldStyles.label}>
                    Organization
                  </label>
                  <select
                    id="scrim-org"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className={fieldStyles.input}
                  >
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {issueMessage(basicsIssues, "orgId") && (
                    <p className={fieldStyles.error}>
                      {issueMessage(basicsIssues, "orgId")}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="scrim-name" className={fieldStyles.label}>
                    Scrim name
                  </label>
                  <input
                    id="scrim-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    placeholder="e.g. Wassup Open Scrims"
                    className={fieldStyles.input}
                  />
                  {nameTouched && issueMessage(basicsIssues, "name") ? (
                    <p className={fieldStyles.error}>
                      {issueMessage(basicsIssues, "name")}
                    </p>
                  ) : (
                    <p className={fieldStyles.help}>
                      This is the title on every standings and MVP graphic.
                    </p>
                  )}
                </div>
              </div>

              <fieldset>
                <legend className={fieldStyles.label}>Planned matches</legend>
                <div className="grid grid-cols-6 gap-1.5">
                  {MATCH_OPTIONS.map((n) => {
                    const selected = plannedMatches === String(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${n} match${n === 1 ? "" : "es"}`}
                        onClick={() => setPlannedMatches(String(n))}
                        className={clsx(
                          "flex min-h-11 items-center justify-center rounded-[12px] border text-sm font-semibold transition-colors",
                          selected
                            ? "border-dash-ink bg-dash-ink text-white"
                            : "border-dash-line bg-dash-surface text-dash-ink2 hover:border-dash-ink4 hover:text-dash-ink",
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                {issueMessage(basicsIssues, "plannedMatches") ? (
                  <p className={fieldStyles.error}>
                    {issueMessage(basicsIssues, "plannedMatches")}
                  </p>
                ) : (
                  <p className={fieldStyles.help}>
                    The number of matches you expect to score.
                  </p>
                )}
              </fieldset>

              <div>
                <span className={fieldStyles.label} id="team-count-label">
                  Team count
                </span>
                <div
                  className="inline-flex items-stretch overflow-hidden rounded-[12px] border border-dash-line bg-dash-surface"
                  role="group"
                  aria-labelledby="team-count-label"
                >
                  <button
                    type="button"
                    onClick={() => changeTeamCount(-1)}
                    disabled={Number(teamCount) <= MIN_TEAMS}
                    aria-label="Decrease team count"
                    className="flex size-11 items-center justify-center text-dash-ink2 transition-colors hover:bg-dash-bg disabled:opacity-30"
                  >
                    <MinusIcon width="18" height="18" />
                  </button>
                  <input
                    id="team-count"
                    type="number"
                    inputMode="numeric"
                    min={MIN_TEAMS}
                    max={MAX_TEAMS}
                    value={teamCount}
                    onChange={(e) => setTeamCount(e.target.value)}
                    aria-labelledby="team-count-label"
                    className="min-h-11 w-16 border-x border-dash-line bg-dash-surface text-center text-base font-bold tabular-nums text-dash-ink outline-none [appearance:textfield] focus:ring-2 focus:ring-inset focus:ring-dash-lime [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => changeTeamCount(1)}
                    disabled={Number(teamCount) >= MAX_TEAMS}
                    aria-label="Increase team count"
                    className="flex size-11 items-center justify-center text-dash-ink2 transition-colors hover:bg-dash-bg disabled:opacity-30"
                  >
                    <PlusIcon width="18" height="18" />
                  </button>
                </div>
                {issueMessage(basicsIssues, "teamCount") ? (
                  <p className={fieldStyles.error}>
                    {issueMessage(basicsIssues, "teamCount")}
                  </p>
                ) : (
                  <p className={fieldStyles.help}>
                    Between {MIN_TEAMS} and {MAX_TEAMS} teams. You&apos;ll paste
                    the roster list next.
                  </p>
                )}
              </div>

              <fieldset>
                <legend className={fieldStyles.label}>Graphic aesthetic</legend>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {(Object.keys(AESTHETICS) as AestheticId[]).map((id) => {
                    const config = AESTHETICS[id];
                    const selected = templateId === id;
                    const backgrounds = Object.values(config.backgrounds);
                    const tag = backgrounds.every((bg) => bg.type === "gradient")
                      ? "Placeholder"
                      : backgrounds.some((bg) => bg.type === "gradient")
                        ? "Partial art"
                        : null;
                    const standingBackground = config.backgrounds.standings;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setTemplateId(id)}
                        className={clsx(
                          "group rounded-dash border p-1.5 text-left transition-colors",
                          selected
                            ? "border-dash-ink ring-2 ring-dash-ink"
                            : "border-dash-line hover:border-dash-ink4",
                        )}
                      >
                        <span
                          className="relative block aspect-[3/4] w-full overflow-hidden rounded-[12px]"
                          style={
                            standingBackground.type === "gradient"
                              ? { background: standingBackground.css }
                              : undefined
                          }
                        >
                          {standingBackground.type === "image" ? (
                            <span className="flex h-full items-center justify-center bg-dash-bg text-xs font-semibold text-dash-ink3">
                              Art-backed
                            </span>
                          ) : null}
                          {selected ? (
                            <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-dash-ink text-white">
                              <CheckIcon width="14" height="14" />
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-2 flex items-start justify-between gap-1 px-0.5 pb-0.5">
                          <span className="text-[13px] leading-4 font-semibold text-dash-ink">
                            {config.name}
                          </span>
                          {tag ? (
                            <span className="hidden shrink-0 text-[10px] font-semibold tracking-wide text-dash-ink3 uppercase sm:inline">
                              {tag}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {issueMessage(basicsIssues, "templateId") && (
                  <p className={fieldStyles.error}>
                    {issueMessage(basicsIssues, "templateId")}
                  </p>
                )}
              </fieldset>
            </section>
          )}

          {step === 2 && (
            <section className="flex flex-col gap-4">
              <div>
                <p className="text-xl font-bold tracking-[-0.015em] text-dash-ink">
                  Add the teams
                </p>
                <p className="mt-1 text-sm leading-6 text-dash-ink3">
                  Paste one team per line. Logos are optional, but they make the
                  shared graphics recognisable.
                </p>
              </div>

              <div>
                <label htmlFor="team-list" className={fieldStyles.label}>
                  Team names
                </label>
                <textarea
                  id="team-list"
                  rows={8}
                  value={rawTeams}
                  onChange={(e) => setRawTeams(e.target.value)}
                  placeholder={"One team per line\nWassup Esports\nTF Squad\n4NM Esports"}
                  className={fieldStyles.textarea}
                />
                <p className={fieldStyles.help}>
                  Duplicate names are ignored. Order doesn&apos;t matter yet.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2" aria-live="polite">
                  <StatusChip tone={countMatch ? "live" : "draft"}>
                    {parsed.length} / {teamCount} teams
                  </StatusChip>
                  <span className="text-[13px] text-dash-ink3">
                    {loggedInTeamCount === 0
                      ? "Nothing pasted yet"
                      : countMatch
                        ? "Matches the plan"
                        : "Add or remove names to match"}
                  </span>
                </div>
                {process.env.NODE_ENV === "development" && (
                  <button
                    type="button"
                    onClick={() => setRawTeams(SAMPLE_TEAM_NAMES.join("\n"))}
                    className="min-h-9 rounded-full border border-dash-line px-3 text-xs font-semibold text-dash-ink2 transition-colors hover:bg-dash-bg"
                  >
                    Load 16 sample teams
                  </button>
                )}
              </div>

              {teamsIssues.length > 0 && (
                <ul
                  className="rounded-[12px] border border-dash-amber-bg bg-dash-amber-bg/40 p-3"
                  role="alert"
                >
                  {teamsIssues.map((issue, i) => (
                    <li
                      key={i}
                      className="text-[13px] leading-5 font-medium text-dash-amber-ink"
                    >
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}

              {parsed.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon width="22" height="22" />}
                  title="No teams yet"
                  description="Paste your list above and the line-up will appear here, ready for logos."
                  className="bg-dash-bg"
                />
              ) : (
                <ul className="overflow-hidden rounded-dash border border-dash-line">
                  {parsed.map((teamName, index) => {
                    const logo = logos[teamName];
                    const issue = indexedIssueMessage(
                      allIssues,
                      "teamName",
                      index,
                    );
                    return (
                      <li
                        key={`${index}-${teamName}`}
                        className="flex items-center gap-2.5 border-b border-dash-bg bg-dash-surface px-3 py-2 last:border-b-0"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-dash-bg text-[11px] font-bold tabular-nums text-dash-ink3">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-dash-ink">
                            {teamName}
                          </span>
                          {issue ? (
                            <span className="block truncate text-[11px] font-medium text-dash-danger-ink">
                              {issue}
                            </span>
                          ) : null}
                        </span>
                        {logo ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                            <img
                              src={logo}
                              alt={`${teamName} logo`}
                              className="size-10 rounded-[10px] bg-dash-bg object-contain"
                            />
                            <button
                              type="button"
                              aria-label={`Remove logo for ${teamName}`}
                              onClick={() => removeLogo(teamName)}
                              className="flex size-11 items-center justify-center rounded-full text-dash-ink3 transition-colors hover:bg-dash-bg hover:text-dash-ink"
                            >
                              <XIcon width="18" height="18" />
                            </button>
                          </>
                        ) : (
                          <label className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-dash-line bg-dash-surface px-3 text-xs font-semibold text-dash-ink2 transition-colors hover:bg-dash-bg">
                            <ImageIcon width="14" height="14" />
                            Logo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                void handleLogoFile(
                                  teamName,
                                  e.target.files?.[0],
                                );
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {Object.entries(logoErrors).map(([teamName, message]) => (
                <p key={teamName} className={fieldStyles.error} role="alert">
                  {teamName}: {message}
                </p>
              ))}
            </section>
          )}

          {step === 3 && (
            <section className="flex flex-col gap-5">
              <div>
                <p className="text-xl font-bold tracking-[-0.015em] text-dash-ink">
                  Check it, then create
                </p>
                <p className="mt-1 text-sm leading-6 text-dash-ink3">
                  Everything below is what the scrim will start with. You can
                  upload the first match right after.
                </p>
              </div>

              {resultIssues.length > 0 && (
                <div
                  role="alert"
                  className="rounded-[12px] border border-dash-danger-bg bg-dash-danger-bg/40 p-3"
                >
                  <p className="text-sm font-semibold text-dash-danger-ink">
                    Fix these before creating the scrim:
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {resultIssues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-[13px] leading-5 text-dash-danger-ink"
                      >
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-[12px] border border-dash-danger-bg bg-dash-danger-bg/40 p-3 text-sm text-dash-danger-ink"
                >
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-4 rounded-dash bg-dash-bg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold tracking-[-0.01em] text-dash-ink">
                    {name.trim() || "Untitled scrim"}
                  </p>
                  <p className="mt-1 text-sm text-dash-ink3">
                    {selectedOrg?.name ?? "No organization"} ·{" "}
                    {draft.plannedMatches} match
                    {draft.plannedMatches === 1 ? "" : "es"} ·{" "}
                    {draft.teamCount} teams
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusChip>{aesthetic.name}</StatusChip>
                    <StatusChip tone="neutral">
                      {parsed.length} teams listed
                    </StatusChip>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="hidden h-20 w-16 shrink-0 rounded-[10px] sm:block"
                  style={
                    aesthetic.backgrounds.standings.type === "gradient"
                      ? {
                          background:
                            aesthetic.backgrounds.standings.css,
                        }
                      : undefined
                  }
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-dash-ink">
                  Scoring rules
                </h2>
                <div className="mt-2 overflow-hidden rounded-[12px] border border-dash-line">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Superseding scoring rules for this scrim
                    </caption>
                    <thead>
                      <tr className="bg-dash-bg text-left text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Place
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(SUPER_RULES.placement_points)
                        .map(([place, points]) => ({
                          place: Number(place),
                          points,
                        }))
                        .sort((a, b) => a.place - b.place)
                        .map(({ place, points }) => (
                          <tr key={place} className="border-t border-dash-bg">
                            <td className="px-3 py-2 tabular-nums text-dash-ink2">
                              {ordinal(place)}
                            </td>
                            <td className="px-3 py-2 font-semibold tabular-nums text-dash-ink">
                              {points}
                            </td>
                          </tr>
                        ))}
                      {draft.teamCount >
                        Object.keys(SUPER_RULES.placement_points).length && (
                        <tr className="border-t border-dash-bg">
                          <td className="px-3 py-2 tabular-nums text-dash-ink2">
                            {ordinal(
                              Object.keys(SUPER_RULES.placement_points).length +
                                1,
                            )}
                            –{ordinal(draft.teamCount)}
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums text-dash-ink">
                            {SUPER_RULES.default_placement_points}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-dash-bg">
                        <td className="px-3 py-2 text-dash-ink2">
                          Each elimination
                        </td>
                        <td className="px-3 py-2 font-semibold tabular-nums text-dash-ink">
                          {SUPER_RULES.kill_points} point
                          {SUPER_RULES.kill_points === 1 ? "" : "s"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-dash-ink">
                  Team line-up
                </h2>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {parsed.map((teamName, index) => (
                    <li
                      key={`${index}-${teamName}`}
                      className="flex min-h-12 items-center gap-2.5 rounded-[12px] bg-dash-bg px-3 py-1.5"
                    >
                      <span className="w-4 shrink-0 text-right text-[11px] font-bold tabular-nums text-dash-ink3">
                        {index + 1}
                      </span>
                      {logos[teamName] ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                          <img
                            src={logos[teamName]}
                            alt=""
                            className="size-8 shrink-0 rounded-[8px] object-contain"
                          />
                        </>
                      ) : (
                        <span className="size-8 shrink-0 rounded-[8px] bg-dash-line/70" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-dash-ink">
                        {teamName}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-dash-bg px-5 py-4 sm:px-7">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className={buttonStyles.secondary}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 ? !step1Valid : !step2Valid}
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              className={clsx(buttonStyles.primary, "ml-auto min-w-28")}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !step2Valid}
              onClick={() => {
                void handleSubmit();
              }}
              className={clsx(buttonStyles.primary, "ml-auto")}
            >
              {busy ? "Creating…" : "Create scrim"}
            </button>
          )}
        </div>
      </div>

      {/* Live summary rail */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <section className="rounded-dash-lg bg-dash-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-dash-ink3 uppercase">
                Scrim summary
              </p>
              <p className="mt-1.5 break-words text-lg leading-6 font-bold tracking-[-0.01em] text-dash-ink">
                {name.trim() || "Untitled scrim"}
              </p>
              <p className="mt-1 text-[13px] text-dash-ink3">
                {selectedOrg?.name ?? "Choose an organization"}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="h-16 w-12 shrink-0 rounded-[8px]"
              style={
                aesthetic.backgrounds.standings.type === "gradient"
                  ? { background: aesthetic.backgrounds.standings.css }
                  : undefined
              }
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[12px] bg-dash-bg p-3">
              <dt className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                Matches
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-dash-ink">
                {plannedMatches || "—"}
              </dd>
            </div>
            <div className="rounded-[12px] bg-dash-bg p-3">
              <dt className="text-[11px] font-semibold tracking-wide text-dash-ink3 uppercase">
                Teams
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-dash-ink">
                {parsed.length}
                <span className="ml-1 text-xs font-medium text-dash-ink3">
                  / {teamCount}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-dash-line px-3 py-2">
            <span
              className={clsx(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                step2Valid
                  ? "bg-dash-lime text-dash-lime-ink"
                  : "bg-dash-bg text-dash-ink3",
              )}
            >
              <CheckIcon width="13" height="13" />
            </span>
            <span className="text-[13px] font-medium text-dash-ink2">
              {step2Valid
                ? "Ready to create"
                : step1Valid
                  ? `${parsed.length} of ${teamCount} teams added`
                  : "Finish the basics"}
            </span>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-dash-lg bg-dash-ink p-5 text-white">
          <div aria-hidden="true" className="app-grid absolute inset-0" />
          <div className="relative">
            <span className="flex size-9 items-center justify-center rounded-full bg-dash-lime text-dash-ink">
              <SparklesIcon width="18" height="18" />
            </span>
            <p className="mt-3 text-base font-bold">From screenshot to share</p>
            <ol className="mt-3 flex flex-col gap-2.5">
              {[
                { icon: CameraIcon, label: "Upload match screenshots" },
                { icon: LockIcon, label: "Confirm the auto-read results" },
                { icon: ShareIcon, label: "Share the standings graphic" },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-2.5 text-[13px] text-white/80"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-dash-lime">
                      <Icon width="14" height="14" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[11px] font-semibold tabular-nums text-white/40">
                      0{index + 1}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 border-t border-white/10 pt-3 text-[12px] leading-5 text-white/55">
              The AI reads placements and kills. You review before anything is
              confirmed.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
