DROP INDEX `submission_verify_idx`;--> statement-breakpoint
ALTER TABLE `submission` DROP COLUMN `verify_state`;--> statement-breakpoint
ALTER TABLE `submission` DROP COLUMN `verify_checked_at`;--> statement-breakpoint
ALTER TABLE `submission` DROP COLUMN `verify_detail`;--> statement-breakpoint
ALTER TABLE `submission` DROP COLUMN `verify_flagged_at`;--> statement-breakpoint
ALTER TABLE `submission` DROP COLUMN `verify_live_at`;--> statement-breakpoint
ALTER TABLE `social_account` DROP COLUMN `reddit_status`;--> statement-breakpoint
ALTER TABLE `social_account` DROP COLUMN `reddit_checked_at`;