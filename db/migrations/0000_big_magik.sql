CREATE TABLE `match_results` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`team_id` text NOT NULL,
	`placement` integer NOT NULL,
	`kills` integer NOT NULL,
	`placement_points` integer NOT NULL,
	`players` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `match_results_match_idx` ON `match_results` (`match_id`);--> statement-breakpoint
CREATE INDEX `match_results_team_idx` ON `match_results` (`team_id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`match_no` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`raw_squad_data` text,
	`created_at` text NOT NULL,
	`confirmed_at` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matches_session_no_uq` ON `matches` (`session_id`,`match_no`);--> statement-breakpoint
CREATE INDEX `matches_session_idx` ON `matches` (`session_id`);--> statement-breakpoint
CREATE TABLE `mvp_lists` (
	`session_id` text PRIMARY KEY NOT NULL,
	`entries` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`locked_at` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rosters` (
	`team_id` text NOT NULL,
	`player_norm` text NOT NULL,
	`display_name` text NOT NULL,
	PRIMARY KEY(`team_id`, `player_norm`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`planned_matches` integer NOT NULL,
	`team_count` integer NOT NULL,
	`template_id` text DEFAULT 'dev-dark-gold' NOT NULL,
	`scoring_rules` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_session_name_uq` ON `teams` (`session_id`,`name`);--> statement-breakpoint
CREATE INDEX `teams_session_idx` ON `teams` (`session_id`);