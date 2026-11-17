export type SlotSeat = { name: string; slotNumber?: number | null };

/**
 * First in-game room slot offered to Team 1 in the creation wizard. PUBG
 * Mobile custom-lobby conventions skip the early numbers, so a fresh scratch
 * starts at 5 and counts up (5, 6, 7, …). With team_count bounded to 4–25 the
 * whole default range (5–29) stays comfortably inside the DB's 1–99 domain.
 */
export const DEFAULT_STARTING_SLOT = 5;

const MIN_SLOT = 1;
const MAX_SLOT = 99;

/**
 * Sequential default slot for a zero-based team index. Pure math only —
 * clamped/validated to the DB's 1..99 integer domain so even a bad index or
 * start value can never produce a slot the schema would reject.
 */
export function defaultSlotForIndex(
  index: number,
  startSlot: number = DEFAULT_STARTING_SLOT,
): number {
  const slot = startSlot + index;
  if (!Number.isFinite(slot)) return MIN_SLOT;
  return Math.min(MAX_SLOT, Math.max(MIN_SLOT, Math.trunc(slot)));
}

/**
 * Parse a wizard slot input. Empty/blank/`0` mean "unassigned" (null) —
 * the DB stores NULL for a cleared seat. Every other number is returned
 * as-typed (including decimals and out-of-range values) so
 * `validateSessionDraft` can surface the precise "whole number 1–99" error
 * instead of silently clamping or rounding the user's input away.
 */
export function parseSlotInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value === 0 ? null : value;
}

/**
 * A wizard row after slot reconciliation. `manual` marks a deliberate user
 * choice (a number OR an explicit clear) so it can be told apart from an
 * auto-assigned default.
 */
export type TeamSlotAssignment = {
  name: string;
  slotNumber: number | null;
  manual: boolean;
};

/**
 * Resolve the slot inputs for the current bulk-pasted team list.
 *
 * Overrides are keyed by ROW INDEX (not name): a typo fix on a name keeps its
 * manual slot because the line number did not change, and appending a line
 * falls back to `defaultSlotForIndex(index)`. Untouched rows always re-number
 * from DEFAULT_STARTING_SLOT against their current position, so editing the
 * textarea can never strand a row on a stale default.
 */
export function assignDefaultTeamSlots(
  names: readonly string[],
  overrides: Readonly<Record<number, number | null>> = {},
): TeamSlotAssignment[] {
  return names.map((name, index) => {
    if (Object.prototype.hasOwnProperty.call(overrides, index)) {
      return {
        name,
        slotNumber: overrides[index] ?? null,
        manual: true,
      };
    }
    return {
      name,
      slotNumber: defaultSlotForIndex(index),
      manual: false,
    };
  });
}

/**
 * Slot values used by more than one row (non-null only). The wizard uses this
 * to highlight collided rows inline, before submission, without duplicating
 * the authoritative range/uniqueness rules in `validateSessionDraft`.
 */
export function findDuplicateSlots(
  slotNumbers: ReadonlyArray<number | null | undefined>,
): Set<number> {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const slot of slotNumbers) {
    if (slot === null || slot === undefined) continue;
    if (seen.has(slot)) duplicates.add(slot);
    else seen.add(slot);
  }
  return duplicates;
}

/**
 * Same ordering as `getSessionPageData`: assigned slots first (ascending),
 * then unassigned teams by name. Duplicate assigned slots are impossible after
 * validation, but name is still the deterministic tiebreaker.
 */
export function compareTeamsBySlot(a: SlotSeat, b: SlotSeat): number {
  const aSlot = a.slotNumber ?? null;
  const bSlot = b.slotNumber ?? null;
  if (aSlot !== bSlot) {
    if (aSlot === null) return 1;
    if (bSlot === null) return -1;
    return aSlot - bSlot;
  }
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function orderTeamsBySlot<T extends SlotSeat>(teams: readonly T[]): T[] {
  return [...teams].sort(compareTeamsBySlot);
}

/**
 * Zero-padded labels for the announcement list.
 *
 * Assigned slots always win. An unassigned team falls back to its row number,
 * skipping numbers already used by an assigned slot or an earlier fallback, so
 * a partially assigned line-up can never render two teams on the same slot.
 * An all-null legacy list still renders 01, 02, 03… exactly as before.
 */
export function announcementSlotLabels(
  teams: ReadonlyArray<SlotSeat>,
): string[] {
  const used = new Set<number>();
  for (const team of teams) {
    if (team.slotNumber !== null && team.slotNumber !== undefined) {
      used.add(team.slotNumber);
    }
  }

  return teams.map((team, index) => {
    let slot = team.slotNumber;
    if (slot === null || slot === undefined) {
      slot = index + 1;
      while (used.has(slot)) slot += 1;
    }
    used.add(slot);
    return String(slot).padStart(2, "0");
  });
}
