CREATE TABLE `decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`amount_usd` real,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`endpoint` text,
	`agent_id` text,
	`amount_usd` real DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`latency_ms` integer,
	`status_code` integer,
	`transaction_hash` text,
	`network` text,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_event_id_unique` ON `events` (`event_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor` text NOT NULL,
	`category` text NOT NULL,
	`amount_usd` real NOT NULL,
	`description` text NOT NULL,
	`incurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hypothesis` text NOT NULL,
	`success_metric` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text,
	`ended_at` text,
	`result` text
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`opened_at` text NOT NULL,
	`resolved_at` text
);
