/**
 * Normalize an in-game player name for matching & MVP aggregation.
 * Pipeline (PLAN.md C2.2, decision recorded in C1.2 review):
 *   NFKD → strip combining marks → remove zero-width chars → lowercase →
 *   every run of chars outside [\p{L}\p{N}] becomes ONE space → trim.
 * NO tag-prefix stripping: separator classes are ambiguous on single
 * strings ("Bawa·Qadra" would lose its first token as a "tag" while
 * "Bawa Qadra" keeps it). Tag drift is rare; the MVP editor resolves it.
 * MUST stay byte-identical wherever created (C2.2 and C2.3 both own it).
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
