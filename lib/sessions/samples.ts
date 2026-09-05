/**
 * LOCAL duplicate of lib/fixtures/sampleMatches SAMPLE_TEAM_NAMES.
 * Duplicated so the client bundle never imports the fixtures module
 * (which is type-linked to the DB schema). tests/session-input.test.ts
 * asserts deep-equality — the sync guard. Keep in sync.
 */
export const SAMPLE_TEAM_NAMES: string[] = [
  "Straight Forward",
  "TF Squad",
  "TRB Gaming",
  "4NM Esports",
  "FMA Esports",
  "Zero Degree Esports",
  "Team Invaders",
  "ROX Gaming",
  "Bawa Squad",
  "CRUSH Gaming",
  "AKM Esports",
  "Shadow Syndicate",
  "Karachi Snipers",
  "Lahore Lions",
  "Voltage Esports",
  "Nova Legends",
];
