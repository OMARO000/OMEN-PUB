ALTER TABLE `users` ADD `bonus_balance` real NOT NULL DEFAULT 0.0;
--> statement-breakpoint
CREATE TABLE `contributions_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_number` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`file_url` text,
	`company_ticker` text,
	`block_id` text,
	`status` text NOT NULL DEFAULT 'pending',
	`reward_amount` real,
	`rejection_reason` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `contributions_new` (`id`, `account_number`, `type`, `title`, `description`, `created_at`)
SELECT `id`, 'migrated', 'BREACH_REPORT', 'Migrated', '', `created_at` FROM `contributions`;
--> statement-breakpoint
DROP TABLE `contributions`;
--> statement-breakpoint
ALTER TABLE `contributions_new` RENAME TO `contributions`;
--> statement-breakpoint
CREATE TABLE `contribution_payments_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_number` text NOT NULL,
	`amount` real NOT NULL,
	`payout_method` text NOT NULL,
	`payout_address` text,
	`status` text NOT NULL DEFAULT 'pending',
	`requested_at` integer NOT NULL,
	`processed_at` integer,
	`notes` text
);
--> statement-breakpoint
DROP TABLE `contribution_payments`;
--> statement-breakpoint
ALTER TABLE `contribution_payments_new` RENAME TO `contribution_payments`;
