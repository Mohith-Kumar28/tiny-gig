CREATE TABLE `warmup_completion` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`done_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `warmup_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warmup_completion_uq` ON `warmup_completion` (`item_id`,`worker_id`);--> statement-breakpoint
CREATE TABLE `warmup_item` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`instructions` text NOT NULL,
	`links` text NOT NULL,
	`audience` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `warmup_item_created_idx` ON `warmup_item` (`created_at`);