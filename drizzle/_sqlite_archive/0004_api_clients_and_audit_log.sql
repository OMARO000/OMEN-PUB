CREATE TABLE `api_clients_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`api_key` text NOT NULL,
	`client_name` text NOT NULL,
	`email` text NOT NULL,
	`use_case` text NOT NULL,
	`tier` text NOT NULL DEFAULT 'STARTER',
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` integer NOT NULL,
	UNIQUE(`api_key`)
);
--> statement-breakpoint
DROP TABLE `api_audit_logs`;
--> statement-breakpoint
DROP TABLE `api_clients`;
--> statement-breakpoint
ALTER TABLE `api_clients_new` RENAME TO `api_clients`;
--> statement-breakpoint
CREATE TABLE `api_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`api_key` text NOT NULL,
	`endpoint` text NOT NULL,
	`company` text,
	`query` text,
	`ip_address` text,
	`use_case` text,
	`status_code` integer NOT NULL,
	`created_at` integer NOT NULL
);
