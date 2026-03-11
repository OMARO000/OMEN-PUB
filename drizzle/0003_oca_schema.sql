CREATE TABLE `alternatives_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL DEFAULT 'Other',
	`website_url` text,
	`replaces` text,
	`why_better` text,
	`open_source` integer NOT NULL DEFAULT 0,
	`self_hostable` integer NOT NULL DEFAULT 0,
	`upvotes` integer NOT NULL DEFAULT 0,
	`downvotes` integer NOT NULL DEFAULT 0,
	`status` text NOT NULL DEFAULT 'pending',
	`rejection_reason` text,
	`submitted_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `alternatives_new` (`id`, `name`, `created_at`) SELECT `id`, `name`, `created_at` FROM `alternatives`;
--> statement-breakpoint
DROP TABLE `alternatives`;
--> statement-breakpoint
ALTER TABLE `alternatives_new` RENAME TO `alternatives`;
--> statement-breakpoint
CREATE TABLE `votes_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`),
	`block_id` integer REFERENCES `blocks`(`id`),
	`value` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `votes_new` (`id`, `user_id`, `block_id`, `value`, `created_at`) SELECT `id`, `user_id`, `block_id`, `value`, `created_at` FROM `votes`;
--> statement-breakpoint
DROP TABLE `votes`;
--> statement-breakpoint
ALTER TABLE `votes_new` RENAME TO `votes`;
--> statement-breakpoint
CREATE TABLE `alternative_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`alternative_id` integer NOT NULL REFERENCES `alternatives`(`id`),
	`account_number` text NOT NULL,
	`vote` text NOT NULL,
	`created_at` integer NOT NULL,
	UNIQUE(`alternative_id`, `account_number`)
);
