CREATE TABLE `app_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`meta` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`template` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_log_created_idx` ON `email_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_log_template_idx` ON `email_log` (`template`);--> statement-breakpoint
CREATE TABLE `gig` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`platform` text NOT NULL,
	`task_type` text NOT NULL,
	`brief` text NOT NULL,
	`target_url` text,
	`community` text,
	`content_guidelines` text,
	`sample_content` text,
	`review_checklist` text NOT NULL,
	`min_karma` integer DEFAULT 0 NOT NULL,
	`min_account_age_months` integer DEFAULT 0 NOT NULL,
	`allowed_states` text NOT NULL,
	`payout_amount` integer NOT NULL,
	`total_slots` integer NOT NULL,
	`claimed_slots` integer DEFAULT 0 NOT NULL,
	`claim_window_hours` integer DEFAULT 24 NOT NULL,
	`live_hold_hours` integer DEFAULT 24 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gig_slug_unique` ON `gig` (`slug`);--> statement-breakpoint
CREATE INDEX `gig_status_idx` ON `gig` (`status`);--> statement-breakpoint
CREATE INDEX `gig_platform_idx` ON `gig` (`platform`);--> statement-breakpoint
CREATE INDEX `gig_created_idx` ON `gig` (`created_at`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`href` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `notification` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payout` (
	`id` text PRIMARY KEY NOT NULL,
	`worker_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`upi_id` text NOT NULL,
	`utr_reference` text,
	`note` text,
	`paid_at` integer,
	`paid_by` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payout_worker_idx` ON `payout` (`worker_id`);--> statement-breakpoint
CREATE INDEX `payout_status_idx` ON `payout` (`status`);--> statement-breakpoint
CREATE INDEX `payout_created_idx` ON `payout` (`created_at`);--> statement-breakpoint
CREATE TABLE `review_template` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`id` text PRIMARY KEY NOT NULL,
	`gig_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`status` text DEFAULT 'claimed' NOT NULL,
	`proof_url` text,
	`screenshot_keys` text NOT NULL,
	`worker_note` text,
	`payout_amount` integer NOT NULL,
	`claimed_at` integer NOT NULL,
	`due_at` integer NOT NULL,
	`reminder_sent_at` integer,
	`submitted_at` integer,
	`live_check_at` integer,
	`decided_at` integer,
	`decided_by` text,
	`payout_id` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gig_id`) REFERENCES `gig`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_gig_worker_uq` ON `submission` (`gig_id`,`worker_id`);--> statement-breakpoint
CREATE INDEX `submission_status_idx` ON `submission` (`status`);--> statement-breakpoint
CREATE INDEX `submission_worker_idx` ON `submission` (`worker_id`);--> statement-breakpoint
CREATE INDEX `submission_gig_idx` ON `submission` (`gig_id`);--> statement-breakpoint
CREATE INDEX `submission_due_idx` ON `submission` (`due_at`);--> statement-breakpoint
CREATE INDEX `submission_live_check_idx` ON `submission` (`live_check_at`);--> statement-breakpoint
CREATE INDEX `submission_submitted_idx` ON `submission` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `submission_payout_idx` ON `submission` (`payout_id`);--> statement-breakpoint
CREATE TABLE `submission_event` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`actor_id` text,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`comment` text,
	`checklist` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `submission_event_submission_idx` ON `submission_event` (`submission_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `worker_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`state` text NOT NULL,
	`reddit_url` text NOT NULL,
	`reddit_username` text NOT NULL,
	`account_age_months` integer NOT NULL,
	`karma` integer NOT NULL,
	`upi_id` text NOT NULL,
	`referral_code_used` text,
	`own_referral_code` text NOT NULL,
	`x_url` text,
	`linkedin_url` text,
	`threads_url` text,
	`instagram_url` text,
	`bio` text,
	`languages` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`applied_at` integer NOT NULL,
	`email_prefs` text NOT NULL,
	`admin_note` text,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`earned_total` integer DEFAULT 0 NOT NULL,
	`last_active_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `worker_profile_own_referral_code_unique` ON `worker_profile` (`own_referral_code`);--> statement-breakpoint
CREATE INDEX `worker_status_idx` ON `worker_profile` (`status`);--> statement-breakpoint
CREATE INDEX `worker_state_idx` ON `worker_profile` (`state`);--> statement-breakpoint
CREATE INDEX `worker_applied_idx` ON `worker_profile` (`applied_at`);--> statement-breakpoint
CREATE INDEX `worker_phone_idx` ON `worker_profile` (`phone`);--> statement-breakpoint
CREATE INDEX `worker_upi_idx` ON `worker_profile` (`upi_id`);--> statement-breakpoint
CREATE INDEX `worker_reddit_idx` ON `worker_profile` (`reddit_username`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'worker' NOT NULL,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `referral` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text NOT NULL,
	`referee_id` text NOT NULL,
	`code` text NOT NULL,
	`attributed_at` integer NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`flag_reason` text,
	`approved_at` integer,
	`first_gig_approved_at` integer,
	`gigs_approved` integer DEFAULT 0 NOT NULL,
	`earned` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`referrer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_referee_id_unique` ON `referral` (`referee_id`);--> statement-breakpoint
CREATE INDEX `referral_referrer_idx` ON `referral` (`referrer_id`);--> statement-breakpoint
CREATE INDEX `referral_flagged_idx` ON `referral` (`flagged`);--> statement-breakpoint
CREATE TABLE `referral_program` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`trigger` text NOT NULL,
	`trigger_value` integer DEFAULT 1 NOT NULL,
	`threshold` integer DEFAULT 1 NOT NULL,
	`referrer_reward` integer DEFAULT 0 NOT NULL,
	`referee_reward` integer DEFAULT 0 NOT NULL,
	`repeat_mode` text DEFAULT 'once' NOT NULL,
	`max_rewards_per_referrer` integer,
	`qualify_within_days` integer,
	`auto_approve` integer DEFAULT false NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `referral_program_active_idx` ON `referral_program` (`active`);--> statement-breakpoint
CREATE TABLE `referral_reward` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`referral_id` text,
	`role` text NOT NULL,
	`tier` integer DEFAULT 1 NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`note` text,
	`payout_id` text,
	`decided_by` text,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `referral_program`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referral_id`) REFERENCES `referral`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`decided_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_reward_uq` ON `referral_reward` (`program_id`,`worker_id`,`role`,`tier`);--> statement-breakpoint
CREATE INDEX `referral_reward_status_idx` ON `referral_reward` (`status`);--> statement-breakpoint
CREATE INDEX `referral_reward_worker_idx` ON `referral_reward` (`worker_id`);--> statement-breakpoint
CREATE INDEX `referral_reward_payout_idx` ON `referral_reward` (`payout_id`);