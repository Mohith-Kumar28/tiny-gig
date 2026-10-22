ALTER TABLE `gig` ADD `pay_mode` text DEFAULT 'flat' NOT NULL;--> statement-breakpoint
ALTER TABLE `gig` ADD `level_rate_overrides` text;