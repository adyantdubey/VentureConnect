CREATE TABLE `media_parts` (
	`asset_id` text NOT NULL,
	`part_number` integer NOT NULL,
	`r2_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_parts_asset_part` ON `media_parts` (`asset_id`,`part_number`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_profile_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_bytes` integer DEFAULT 0 NOT NULL,
	`chunk_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_media_assets`("id", "owner_profile_id", "r2_key", "file_name", "content_type", "size_bytes", "uploaded_bytes", "chunk_count", "status", "created_at") SELECT "id", "owner_profile_id", "r2_key", "file_name", "content_type", "size_bytes", 0, 0, "status", "created_at" FROM `media_assets`;--> statement-breakpoint
DROP TABLE `media_assets`;--> statement-breakpoint
ALTER TABLE `__new_media_assets` RENAME TO `media_assets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_assets_r2_key` ON `media_assets` (`r2_key`);--> statement-breakpoint
CREATE INDEX `idx_media_assets_owner_created` ON `media_assets` (`owner_profile_id`,`created_at`);
