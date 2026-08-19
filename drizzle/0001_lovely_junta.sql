CREATE TABLE `sourcing_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`description` text NOT NULL,
	`quantity` text NOT NULL,
	`needed_by` text DEFAULT '' NOT NULL,
	`budget_range` text DEFAULT '' NOT NULL,
	`drawing_url` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sourcing_requests_request_id_unique` ON `sourcing_requests` (`request_id`);