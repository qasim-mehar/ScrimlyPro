export type SlotSeat = { name: string; slotNumber?: number | null };

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
