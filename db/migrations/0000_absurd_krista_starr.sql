CREATE TABLE "match_results" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"team_id" text NOT NULL,
	"placement" integer NOT NULL,
	"kills" integer NOT NULL,
	"placement_points" integer NOT NULL,
	"players" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"match_no" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"raw_squad_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mvp_lists" (
	"session_id" text PRIMARY KEY NOT NULL,
	"entries" jsonb NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"team_id" text NOT NULL,
	"player_norm" text NOT NULL,
	"display_name" text NOT NULL,
	CONSTRAINT "rosters_team_id_player_norm_pk" PRIMARY KEY("team_id","player_norm")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"planned_matches" integer NOT NULL,
	"team_count" integer NOT NULL,
	"template_id" text DEFAULT 'dev-dark-gold' NOT NULL,
	"scoring_rules" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text
);
--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mvp_lists" ADD CONSTRAINT "mvp_lists_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_results_match_idx" ON "match_results" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_results_team_idx" ON "match_results" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_session_no_uq" ON "matches" USING btree ("session_id","match_no");--> statement-breakpoint
CREATE INDEX "matches_session_idx" ON "matches" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_session_name_uq" ON "teams" USING btree ("session_id","name");--> statement-breakpoint
CREATE INDEX "teams_session_idx" ON "teams" USING btree ("session_id");