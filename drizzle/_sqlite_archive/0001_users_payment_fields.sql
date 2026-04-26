ALTER TABLE `users` ADD `is_paid` integer DEFAULT false NOT NULL;
ALTER TABLE `users` ADD `paid_at` integer;
ALTER TABLE `users` ADD `subscription_id` text;
