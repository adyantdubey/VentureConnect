CREATE TABLE `availability_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`investor_profile_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`booked_by_profile_id` text,
	FOREIGN KEY (`investor_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booked_by_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_availability_investor_start` ON `availability_slots` (`investor_profile_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_availability_status_start` ON `availability_slots` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `call_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`candidate_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`call_id`) REFERENCES `call_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_call_candidates_call_created` ON `call_candidates` (`call_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `call_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`caller_profile_id` text NOT NULL,
	`callee_profile_id` text NOT NULL,
	`conversation_id` text,
	`mode` text NOT NULL,
	`status` text DEFAULT 'ringing' NOT NULL,
	`offer_json` text,
	`answer_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`caller_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`callee_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_call_sessions_callee_status` ON `call_sessions` (`callee_profile_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`founder_profile_id` text NOT NULL,
	`investor_profile_id` text NOT NULL,
	`inbox_tier` text DEFAULT 'request' NOT NULL,
	`last_message_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`founder_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`investor_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_conversations_pair` ON `conversations` (`founder_profile_id`,`investor_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_founder_latest` ON `conversations` (`founder_profile_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `idx_conversations_investor_tier_latest` ON `conversations` (`investor_profile_id`,`inbox_tier`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`organizer_profile_id` text NOT NULL,
	`investor_profile_id` text NOT NULL,
	`conversation_id` text,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `availability_slots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizer_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`investor_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meetings_slot` ON `meetings` (`slot_id`);--> statement-breakpoint
CREATE INDEX `idx_meetings_organizer_created` ON `meetings` (`organizer_profile_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_profile_id` text NOT NULL,
	`recipient_profile_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_recipient_read` ON `messages` (`recipient_profile_id`,`read_at`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `avatar_color` text DEFAULT '#5567d8' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `sectors_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `stages_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `locations_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `portfolio_startup_ids_json` text DEFAULT '[]' NOT NULL;