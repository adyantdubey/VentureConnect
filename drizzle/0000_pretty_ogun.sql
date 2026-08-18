CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_profile_id` text,
	`startup_id` text,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_community_posts_created_at` ON `community_posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `engagements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`content` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_engagements_post_action` ON `engagements` (`post_id`,`action`);--> statement-breakpoint
CREATE TABLE `follows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL,
	`startup_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_follows_profile_startup` ON `follows` (`profile_id`,`startup_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`google_subject` text,
	`email` text,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_google_subject` ON `profiles` (`google_subject`);--> statement-breakpoint
CREATE TABLE `startups` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_profile_id` text,
	`name` text NOT NULL,
	`sector` text NOT NULL,
	`stage` text NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_startups_sector_stage` ON `startups` (`sector`,`stage`);