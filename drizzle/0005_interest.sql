CREATE TABLE `gig_interest` (
	`id` text PRIMARY KEY NOT NULL,
	`gig_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`account_ids` text NOT NULL,
	`status` text DEFAULT 'interested' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gig_id`) REFERENCES `gig`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gig_interest_uq` ON `gig_interest` (`gig_id`,`worker_id`);--> statement-breakpoint
CREATE INDEX `gig_interest_gig_idx` ON `gig_interest` (`gig_id`,`status`);--> statement-breakpoint
ALTER TABLE `gig` ADD `interest_window_minutes` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `gig` ADD `interest_closes_at` integer;