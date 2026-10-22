ALTER TABLE `submission` ADD `verify_state` text;--> statement-breakpoint
ALTER TABLE `submission` ADD `verify_checked_at` integer;--> statement-breakpoint
ALTER TABLE `submission` ADD `verify_detail` text;--> statement-breakpoint
ALTER TABLE `submission` ADD `verify_flagged_at` integer;--> statement-breakpoint
ALTER TABLE `submission` ADD `verify_live_at` integer;--> statement-breakpoint
CREATE INDEX `submission_verify_idx` ON `submission` (`verify_checked_at`);--> statement-breakpoint
ALTER TABLE `social_account` ADD `reddit_status` text;--> statement-breakpoint
ALTER TABLE `social_account` ADD `reddit_checked_at` integer;