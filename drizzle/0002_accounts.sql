CREATE TABLE `client_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'slate' NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_tag_name_unique` ON `client_tag` (`name`);--> statement-breakpoint
CREATE TABLE `social_account` (
	`id` text PRIMARY KEY NOT NULL,
	`worker_id` text NOT NULL,
	`platform` text NOT NULL,
	`handle` text NOT NULL,
	`url` text NOT NULL,
	`created_on` integer,
	`created_on_confirmed_at` integer,
	`created_on_confirmed_by` text,
	`karma` integer,
	`karma_updated_at` integer,
	`standing` text DEFAULT 'active' NOT NULL,
	`standing_note` text,
	`added_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_on_confirmed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`added_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_account_handle_uq` ON `social_account` (`platform`,`handle`);--> statement-breakpoint
CREATE INDEX `social_account_worker_idx` ON `social_account` (`worker_id`);--> statement-breakpoint
CREATE INDEX `social_account_standing_idx` ON `social_account` (`standing`);--> statement-breakpoint
ALTER TABLE `submission` ADD `account_id` text REFERENCES social_account(id);--> statement-breakpoint
ALTER TABLE `submission` ADD `client_tag_id` text REFERENCES client_tag(id);--> statement-breakpoint
ALTER TABLE `submission` ADD `community` text;--> statement-breakpoint
ALTER TABLE `submission` ADD `first_submitted_at` integer;--> statement-breakpoint
ALTER TABLE `submission` ADD `level` text;--> statement-breakpoint
ALTER TABLE `submission` ADD `selected_at` integer;--> statement-breakpoint
ALTER TABLE `submission` ADD `selected_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `submission` ADD `override_reason` text;--> statement-breakpoint
ALTER TABLE `submission` ADD `on_behalf_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `submission` ADD `insights_keys` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `submission` ADD `insights_submitted_at` integer;--> statement-breakpoint
ALTER TABLE `submission` ADD `insights_reminded_at` integer;--> statement-breakpoint
CREATE INDEX `submission_account_idx` ON `submission` (`account_id`);--> statement-breakpoint
CREATE INDEX `submission_first_submitted_idx` ON `submission` (`first_submitted_at`);--> statement-breakpoint
-- Data migration: every worker's Reddit account becomes their first register row.
-- created_on is estimated from the self-reported age at application and left unconfirmed.
-- ORDER BY applied_at + OR IGNORE: if two workers claimed the same handle, the earliest keeps it.
INSERT OR IGNORE INTO `social_account` (`id`, `worker_id`, `platform`, `handle`, `url`, `created_on`, `karma`, `karma_updated_at`, `standing`, `created_at`, `updated_at`)
SELECT lower(hex(randomblob(8))), `user_id`, 'reddit', lower(`reddit_username`), `reddit_url`,
  `applied_at` - (`account_age_months` * 30 * 86400000), `karma`, `updated_at`, 'active', `applied_at`, `updated_at`
FROM `worker_profile` ORDER BY `applied_at`;
--> statement-breakpoint
-- Other platforms from the profile's link fields. Handle = first path segment after the domain.
INSERT OR IGNORE INTO `social_account` (`id`, `worker_id`, `platform`, `handle`, `url`, `standing`, `created_at`, `updated_at`)
SELECT lower(hex(randomblob(8))), `user_id`, `platform`,
  lower(trim(CASE WHEN instr(`path`, '/') > 0 THEN substr(`path`, 1, instr(`path`, '/') - 1) ELSE `path` END, '@')),
  `url`, 'active', `applied_at`, `updated_at`
FROM (
  SELECT `user_id`, `platform`, `url`, `applied_at`, `updated_at`,
    replace(CASE WHEN instr(`rest`, '?') > 0 THEN substr(`rest`, 1, instr(`rest`, '?') - 1) ELSE `rest` END, 'in/', '') || '' AS `path`
  FROM (
    SELECT `user_id`, `platform`, `url`, `applied_at`, `updated_at`,
      substr(`bare`, instr(`bare`, '/') + 1) AS `rest`
    FROM (
      SELECT `user_id`, `platform`, `url`, `applied_at`, `updated_at`,
        replace(replace(replace(trim(`url`), 'https://', ''), 'http://', ''), 'www.', '') AS `bare`
      FROM (
        SELECT `user_id`, 'x' AS `platform`, `x_url` AS `url`, `applied_at`, `updated_at` FROM `worker_profile` WHERE coalesce(`x_url`, '') <> ''
        UNION ALL SELECT `user_id`, 'linkedin', `linkedin_url`, `applied_at`, `updated_at` FROM `worker_profile` WHERE coalesce(`linkedin_url`, '') <> ''
        UNION ALL SELECT `user_id`, 'threads', `threads_url`, `applied_at`, `updated_at` FROM `worker_profile` WHERE coalesce(`threads_url`, '') <> ''
        UNION ALL SELECT `user_id`, 'instagram', `instagram_url`, `applied_at`, `updated_at` FROM `worker_profile` WHERE coalesce(`instagram_url`, '') <> ''
      )
    )
  )
)
WHERE `path` <> ''
ORDER BY `applied_at`;
--> statement-breakpoint
-- Link existing work to the account that did it, and snapshot when/where it was posted.
UPDATE `submission` SET
  `account_id` = (SELECT `a`.`id` FROM `social_account` `a` WHERE `a`.`worker_id` = `submission`.`worker_id` AND `a`.`platform` = 'reddit' LIMIT 1),
  `first_submitted_at` = `submitted_at`,
  `community` = (SELECT nullif(lower(trim(replace(replace(trim(`g`.`community`), 'https://www.reddit.com/r/', ''), 'r/', ''), '/ ')), '') FROM `gig` `g` WHERE `g`.`id` = `submission`.`gig_id`);
