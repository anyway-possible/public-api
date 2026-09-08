CREATE INDEX `idx_events_kind_occurred_at` ON `events` (`kind`,`occurred_at`);--> statement-breakpoint
PRAGMA optimize;
