CREATE TABLE `deal_pipeline` (
	`id` text PRIMARY KEY NOT NULL,
	`investor_profile_id` text NOT NULL,
	`startup_id` text NOT NULL,
	`stage` text DEFAULT 'saved' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deal_pipeline_investor_startup` ON `deal_pipeline` (`investor_profile_id`,`startup_id`);--> statement-breakpoint
CREATE INDEX `idx_deal_pipeline_investor_stage` ON `deal_pipeline` (`investor_profile_id`,`stage`);--> statement-breakpoint
CREATE TABLE `interaction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_profile_id` text NOT NULL,
	`startup_id` text,
	`investor_profile_id` text,
	`event_type` text NOT NULL,
	`value` integer DEFAULT 1 NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interaction_events_actor_created` ON `interaction_events` (`actor_profile_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_interaction_events_startup_type` ON `interaction_events` (`startup_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `market_research_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`sector` text NOT NULL,
	`publisher` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`as_of` text NOT NULL,
	`source_metric` text NOT NULL,
	`data_json` text NOT NULL,
	`accessed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_market_sources_sector` ON `market_research_sources` (`sector`);--> statement-breakpoint
CREATE TABLE `match_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`startup_id` text NOT NULL,
	`investor_profile_id` text NOT NULL,
	`investor_probability` integer NOT NULL,
	`founder_probability` integer NOT NULL,
	`reciprocal_score` integer NOT NULL,
	`confidence` integer NOT NULL,
	`inbox_tier` text NOT NULL,
	`feature_json` text NOT NULL,
	`explanation_json` text NOT NULL,
	`model_version` text NOT NULL,
	`calculated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_match_scores_pair_model` ON `match_scores` (`startup_id`,`investor_profile_id`,`model_version`);--> statement-breakpoint
CREATE INDEX `idx_match_scores_investor_rank` ON `match_scores` (`investor_profile_id`,`reciprocal_score`);--> statement-breakpoint
CREATE INDEX `idx_match_scores_startup_rank` ON `match_scores` (`startup_id`,`reciprocal_score`);--> statement-breakpoint
CREATE TABLE `model_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`algorithm` text NOT NULL,
	`feature_names_json` text NOT NULL,
	`weights_json` text NOT NULL,
	`metrics_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tam_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_profile_id` text NOT NULL,
	`startup_id` text,
	`sector` text NOT NULL,
	`scenario` text NOT NULL,
	`tam_cr` integer NOT NULL,
	`sam_cr` integer NOT NULL,
	`som_cr` integer NOT NULL,
	`assumptions_json` text NOT NULL,
	`source_ids_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tam_analyses_owner_created` ON `tam_analyses` (`owner_profile_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `routing_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `routing_reason_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `routing_model_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `profile_data_json` text DEFAULT '{}' NOT NULL;