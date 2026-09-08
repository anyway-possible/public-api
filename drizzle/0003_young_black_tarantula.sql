CREATE TABLE `merchant_audit_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` text NOT NULL,
	`merchant_key` text NOT NULL,
	`score` integer NOT NULL,
	`grade` text NOT NULL,
	`listing_count` integer NOT NULL,
	`indexed_calls_30d` integer NOT NULL,
	`max_resource_unique_payers_30d` integer NOT NULL,
	`external_inbound_usdc` real NOT NULL,
	`observed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_audit_history_audit_id_unique` ON `merchant_audit_history` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_merchant_audit_history_merchant_observed_at` ON `merchant_audit_history` (`merchant_key`,`observed_at`);--> statement-breakpoint
PRAGMA optimize;
