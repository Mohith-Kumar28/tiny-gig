CREATE TABLE `broadcast` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`doc` text NOT NULL,
	`html` text NOT NULL,
	`audience` text NOT NULL,
	`channels` text NOT NULL,
	`recipient_count` integer NOT NULL,
	`pinned_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `broadcast_created_idx` ON `broadcast` (`created_at`);--> statement-breakpoint
ALTER TABLE `notification` ADD `broadcast_id` text REFERENCES broadcast(id) ON DELETE cascade;--> statement-breakpoint
CREATE INDEX `notification_broadcast_idx` ON `notification` (`broadcast_id`);