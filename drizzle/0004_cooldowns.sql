CREATE TABLE `block_log` (
	`id` text PRIMARY KEY NOT NULL,
	`gig_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`account_id` text,
	`rule` text NOT NULL,
	`detail` text,
	`unlock_at` integer,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `block_log_uq` ON `block_log` (`gig_id`,`worker_id`,`rule`);--> statement-breakpoint
CREATE INDEX `block_log_created_idx` ON `block_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `block_log_rule_idx` ON `block_log` (`rule`);--> statement-breakpoint
ALTER TABLE `gig` ADD `client_tag_id` text REFERENCES client_tag(id);