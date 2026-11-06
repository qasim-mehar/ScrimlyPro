import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ============================================================
   ScrimlyPro schema — EXACTLY per ERD.md §1–2 (Postgres port per ERD §6).
   Iron rule: do not change without updating ERD.md first.

   - ids: TEXT uuid v4, generated in app code (crypto.randomUUID)
   - timestamps: timestamptz (app passes ISO-8601 strings, read back as
     PG-rendered strings via mode "string")
   - JSON columns: jsonb, typed via $type<>
   - range constraints (planned_matches 1–6 etc.) are app-layer
     per ERD §2 — deliberately NOT SQL CHECKs.
   ============================================================ */

export type ScoringRules = {
  kill_points: number;
  placement_points: Record<string, number>;
  default_placement_points: number;
};

export type PlayerKill = { name: string; kills: number };

export type RawSquad = {
  placement: number;
  squadTag: string;
  confidence: "high" | "low";
  players: Array<PlayerKill & { confidence?: "high" | "low" }>;
};

export type MvpEntry = {
  rank: number;
  name: string;
  teamId: string;
  kills: number;
};

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  // Tenant owner (ERD §6). NOT NULL per migration 0003; legacy rows are
  // backfilled by scripts/migrate-local-to-supabase.mjs before it applies.
  userId: uuid("user_id").notNull(),
  // M2 org tenancy: the owning organization. NOT NULL per migration 0012
  // (backfilled in 0011 with one "Personal" org per existing user); RLS keys
  // on org membership via public.org_role(). user_id is kept as an audit
  // trail of the creator.
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, {
      onDelete: "cascade",
    }),
  name: text("name").notNull(),
  plannedMatches: integer("planned_matches").notNull(),
  teamCount: integer("team_count").notNull(),
  templateId: text("template_id").notNull().default("dev-dark-gold"),
  scoringRules: jsonb("scoring_rules").$type<ScoringRules>().notNull(),
  status: text("status")
    .$type<"active" | "completed">()
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    // In-game room seat assigned by the organizer (ERD §1–2). Nullable for
    // pre-feature teams; the announcement graphic falls back to list order.
    slotNumber: integer("slot_number"),
  },
  (t) => [
    uniqueIndex("teams_session_name_uq").on(t.sessionId, t.name),
    // Partial unique: NULL slots are allowed (legacy/unassigned teams) but two
    // teams in one session may not share an assigned slot.
    uniqueIndex("teams_session_slot_uq")
      .on(t.sessionId, t.slotNumber)
      .where(sql`${t.slotNumber} IS NOT NULL`),
    index("teams_session_idx").on(t.sessionId),
  ],
);

// ERD's rosters(team_id) index is covered by the composite PK prefix.
export const rosters = pgTable(
  "rosters",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerNorm: text("player_norm").notNull(),
    displayName: text("display_name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.playerNorm] })],
);

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    matchNo: integer("match_no").notNull(),
    status: text("status")
      .$type<"draft" | "confirmed">()
      .notNull()
      .default("draft"),
    rawSquadData: jsonb("raw_squad_data").$type<RawSquad[]>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    uniqueIndex("matches_session_no_uq").on(t.sessionId, t.matchNo),
    index("matches_session_idx").on(t.sessionId),
  ],
);

export const matchResults = pgTable(
  "match_results",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    placement: integer("placement").notNull(),
    kills: integer("kills").notNull(),
    placementPoints: integer("placement_points").notNull(),
    players: jsonb("players").$type<PlayerKill[]>().notNull(),
  },
  (t) => [
    index("match_results_match_idx").on(t.matchId),
    index("match_results_team_idx").on(t.teamId),
  ],
);

export const mvpLists = pgTable("mvp_lists", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  entries: jsonb("entries").$type<MvpEntry[]>().notNull(),
  locked: boolean("locked").notNull().default(false),
  lockedAt: timestamp("locked_at", { withTimezone: true, mode: "string" }),
});

/* ============================================================
   M2 organizations (Lane B, migrations 0010–0012). RLS: member-scoped
   via public.org_role() — see 0010_orgs-schema.sql for the policy set.

   FK note: auth.users references are added in the SQL migrations (auth is
   a separate Supabase schema, not part of this drizzle schema — same
   convention as sessions.user_id above).
   ============================================================ */

export type OrgRole = "owner" | "admin" | "member";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  // `u-<8 hex>` collision-avoidance handle, minted app-side.
  slug: text("slug").notNull().unique(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/* ============================================================
   M3 admin panel (Lane C, migrations 0020 block).

   - audit_log: append-only security event log. RLS grants NO
     update/delete policy to anyone — rows are immutable at the
     policy level; only the service-role client (migrations,
     admin routes) may ever rewrite them, and nothing does.
   - feature_flags: kill switch + feature toggles per subject.
     The `disabled` flag on a user is RESERVED (kill switch):
     presence of the row = account locked out, value carries
     metadata only. RLS: admin-only read/write.
   - impersonation_sessions: support impersonation ledger. The
     signed cookie references a row here; expiry/revocation is
     enforced server-side from this row, never from the cookie.
   ============================================================ */

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey(),
  actorUserId: uuid("actor_user_id"),
  effectiveUserId: uuid("effective_user_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey(),
    // 'user' | 'org' | 'global' (org arrives with M2 — M3-INT hook).
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    flag: text("flag").notNull(),
    value: jsonb("value")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("feature_flags_subject_flag_uq").on(t.subjectType, t.subjectId, t.flag)],
);

export const impersonationSessions = pgTable("impersonation_sessions", {
  id: uuid("id").primaryKey(),
  adminUserId: uuid("admin_user_id").notNull(),
  targetUserId: uuid("target_user_id").notNull(),
  // Email snapshot taken at start — the banner must render the target
  // identity without a cross-tenant profiles read (profiles RLS is
  // self-rows-only) and must not change if the target later renames.
  targetEmail: text("target_email").notNull(),
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
    .notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role").$type<OrgRole>().notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const orgInvites = pgTable("org_invites", {
  id: uuid("id").primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email"),
  role: text("role").$type<"admin" | "member">().notNull(),
  // SHA-256 of the raw invite token — the raw token NEVER lands in the DB.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const orgQuotas = pgTable("org_quotas", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  maxSessions: integer("max_sessions").notNull().default(100),
  monthlyOcrCalls: integer("monthly_ocr_calls").notNull().default(300),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  // SHA-256 of the raw share token — raw shown once, never stored.
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: uuid("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

// OCR quota meter: one row per /api/ocr invocation (append-only, RLS
// default-deny on update/delete). Chosen over counting matches because
// re-OCR of the same match re-invokes the paid API while Rondo lobby
// exports inflate matches without OCR calls — see M2 report §6.
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    kind: text("kind").notNull().default("ocr"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("usage_events_org_month_idx").on(t.orgId, t.createdAt)],
);
