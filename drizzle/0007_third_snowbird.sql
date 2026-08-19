CREATE TABLE `usage_counters` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
