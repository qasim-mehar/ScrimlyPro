"use client";

import { createSessionAction } from "@/app/sessions/new/actions";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AESTHETICS, type AestheticId } from "@/lib/graphics";
import { SUPER_RULES } from "@/lib/scoring";
import {
  parseTeamInput,
  validateSessionDraft,
  type SessionDraft,
  type ValidationIssue,
} from "@/lib/sessions/input";
import { SAMPLE_TEAM_NAMES } from "@/lib/sessions/samples";
import { resizeLogoFile } from "./resize-logo";

const STEP_LABELS = ["Basics", "Teams", "Confirm"] as const;

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base focus:border-gold focus:outline-none";
const LABEL_CLASS = "mb-1 block text-sm text-muted";
const ERROR_CLASS = "mt-1 text-sm text-red-400";

function issueMessage(
  issues: ValidationIssue[],
  field: "name" | "plannedMatches" | "teamCount" | "templateId" | "teams",
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

export default function CreateSessionWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [plannedMatches, setPlannedMatches] = useState("4");
  const [teamCount, setTeamCount] = useState("16");
  const [templateId, setTemplateId] = useState<AestheticId>("dark-gold");
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
    }),
    [name, plannedMatches, teamCount, templateId, parsed, logos],
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
      // Target page lands with C4.2 — 404 until then is the expected interim.
      router.push(`/sessions/${result.sessionId}`);
      return;
    }
    if ("issues" in result) setResultIssues(result.issues);
    else setErrorMessage(result.message);
    setBusy(false);
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <ol className="flex items-center gap-2 text-sm">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <li
              key={label}
              aria-current={step === n ? "step" : undefined}
              className={
                step === n ? "font-semibold text-gold" : "text-muted"
              }
            >
              {n} {label}
              {n < 3 ? " ·" : ""}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <section className="flex flex-col gap-4">
          <div>
            <label htmlFor="scrim-name" className={LABEL_CLASS}>
              Scrim name
            </label>
            <input
              id="scrim-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wassup Open Scrims"
              className={INPUT_CLASS}
            />
            {issueMessage(basicsIssues, "name") && (
              <p className={ERROR_CLASS}>{issueMessage(basicsIssues, "name")}</p>
            )}
          </div>

          <div>
            <label htmlFor="planned-matches" className={LABEL_CLASS}>
              Planned matches (1–6)
            </label>
            <input
              id="planned-matches"
              type="number"
              inputMode="numeric"
              min={1}
              max={6}
              value={plannedMatches}
              onChange={(e) => setPlannedMatches(e.target.value)}
              className={INPUT_CLASS}
            />
            {issueMessage(basicsIssues, "plannedMatches") && (
              <p className={ERROR_CLASS}>
                {issueMessage(basicsIssues, "plannedMatches")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="team-count" className={LABEL_CLASS}>
              Team count (4–25)
            </label>
            <input
              id="team-count"
              type="number"
              inputMode="numeric"
              min={4}
              max={25}
              value={teamCount}
              onChange={(e) => setTeamCount(e.target.value)}
              className={INPUT_CLASS}
            />
            {issueMessage(basicsIssues, "teamCount") && (
              <p className={ERROR_CLASS}>
                {issueMessage(basicsIssues, "teamCount")}
              </p>
            )}
          </div>

          <fieldset>
            <legend className={LABEL_CLASS}>Aesthetic</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AESTHETICS) as AestheticId[]).map((id) => {
                const config = AESTHETICS[id];
                const selected = templateId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTemplateId(id)}
                    className={`rounded-lg border p-2 ${
                      selected ? "border-gold ring-2 ring-gold" : "border-line"
                    }`}
                  >
                    <span
                      className="block aspect-[2/3] w-full rounded"
                      style={
                        config.backgrounds.standings.type === "gradient"
                          ? { background: config.backgrounds.standings.css }
                          : undefined
                      }
                    >
                      {config.backgrounds.standings.type === "image" ? (
                        <span className="flex h-full items-center justify-center bg-surface-2 text-xs text-muted">
                          Preview
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {config.name}
                      {config.backgrounds.standings.type === "gradient" ? " (placeholder)" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {issueMessage(basicsIssues, "templateId") && (
              <p className={ERROR_CLASS}>
                {issueMessage(basicsIssues, "templateId")}
              </p>
            )}
          </fieldset>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3">
          <div>
            <label htmlFor="team-list" className={LABEL_CLASS}>
              Team names
            </label>
            <textarea
              id="team-list"
              rows={8}
              value={rawTeams}
              onChange={(e) => setRawTeams(e.target.value)}
              placeholder="One team per line — paste your list from WhatsApp"
              className="w-full rounded-lg border border-line bg-surface p-3 text-base focus:border-gold focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm font-semibold ${
                countMatch ? "text-emerald-400" : "text-red-400"
              }`}
              aria-live="polite"
            >
              {parsed.length} / {teamCount} teams
            </p>
            {process.env.NODE_ENV === "development" && (
              <button
                type="button"
                onClick={() => setRawTeams(SAMPLE_TEAM_NAMES.join("\n"))}
                className="min-h-11 rounded-lg border border-line px-3 text-sm text-muted"
              >
                Load 16 sample teams
              </button>
            )}
          </div>

          {teamsIssues.length > 0 && (
            <ul className="flex flex-col gap-1" role="alert">
              {teamsIssues.map((issue, i) => (
                <li key={i} className={ERROR_CLASS}>
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          <ul className="flex flex-col gap-1">
            {parsed.map((teamName, index) => {
              const logo = logos[teamName];
              return (
                <li
                  key={`${index}-${teamName}`}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1"
                >
                  <span className="w-6 shrink-0 text-right text-xs text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {teamName}
                  </span>
                  {indexedIssueMessage(allIssues, "teamName", index) && (
                    <span
                      className="text-xs text-red-400"
                      title={indexedIssueMessage(allIssues, "teamName", index)}
                    >
                      !
                    </span>
                  )}
                  {logo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                      <img
                        src={logo}
                        alt={`${teamName} logo`}
                        className="h-11 w-11 rounded object-contain"
                      />
                      <button
                        type="button"
                        aria-label={`Remove logo for ${teamName}`}
                        onClick={() => removeLogo(teamName)}
                        className="min-h-11 min-w-11 text-lg text-muted"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <label className="flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-lg border border-line px-2 text-sm text-muted">
                      Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void handleLogoFile(teamName, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>

          {Object.entries(logoErrors).map(([teamName, message]) => (
            <p key={teamName} className={ERROR_CLASS} role="alert">
              {teamName}: {message}
            </p>
          ))}
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-4">
          {resultIssues.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-400/40 bg-surface p-3">
              <p className="text-sm font-semibold text-red-400">
                Fix these before creating the scrim:
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {resultIssues.map((issue, i) => (
                  <li key={i} className="text-sm text-red-400">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errorMessage && (
            <div role="alert" className="rounded-lg border border-red-400/40 bg-surface p-3">
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}

          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="font-display text-2xl font-semibold text-gold">
              {name.trim()}
            </p>
            <p className="mt-1 text-sm text-muted">
              {draft.plannedMatches} matches · {draft.teamCount} teams ·{" "}
              {AESTHETICS[templateId].name}
            </p>

            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">Scoring rules</caption>
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="py-1 pr-2 font-medium">
                    Place
                  </th>
                  <th scope="col" className="py-1 font-medium">
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
                    <tr key={place} className="border-b border-line/50">
                      <td className="py-1 pr-2">{ordinal(place)}</td>
                      <td className="py-1">{points}</td>
                    </tr>
                  ))}
                {draft.teamCount >
                  Object.keys(SUPER_RULES.placement_points).length && (
                    <tr className="border-b border-line/50">
                      <td className="py-1 pr-2">
                        {ordinal(
                          Object.keys(SUPER_RULES.placement_points).length + 1,
                        )}
                        –{ordinal(draft.teamCount)}
                      </td>
                      <td className="py-1">
                        {SUPER_RULES.default_placement_points}
                      </td>
                    </tr>
                  )}
                <tr>
                  <td className="py-1 pr-2">Each elimination</td>
                  <td className="py-1">
                    {SUPER_RULES.kill_points} point
                    {SUPER_RULES.kill_points === 1 ? "" : "s"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-1">
            {parsed.map((teamName, index) => (
              <li
                key={`${index}-${teamName}`}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1"
              >
                <span className="w-6 shrink-0 text-right text-xs text-muted">
                  {index + 1}
                </span>
                {logos[teamName] ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                    <img
                      src={logos[teamName]}
                      alt=""
                      className="h-8 w-8 rounded object-contain"
                    />
                  </>
                ) : (
                  <span className="h-8 w-8 shrink-0 rounded bg-surface-2" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {teamName}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void handleSubmit();
            }}
            className="min-h-11 w-full rounded-lg bg-gold font-display text-lg font-semibold text-bg disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Scrim"}
          </button>
        </section>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            className="min-h-11 flex-1 rounded-lg border border-line text-muted"
          >
            Back
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            disabled={step === 1 ? !step1Valid : !step2Valid}
            onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
            className="min-h-11 flex-1 rounded-lg bg-gold font-semibold text-bg disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
