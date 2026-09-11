ALTER TABLE `funnel_monitor_clients` ADD `mcp_initializations` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_clients` ADD `mcp_tool_lists` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_clients` ADD `mcp_tool_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_clients` ADD `mcp_payment_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_clients` ADD `mcp_payment_failures` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_endpoints` ADD `mcp_tool_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_endpoints` ADD `mcp_payment_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_endpoints` ADD `mcp_payment_failures` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_summary` ADD `mcp_tool_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_summary` ADD `mcp_payment_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_summary` ADD `mcp_payment_failures` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_summary` ADD `mcp_registry_inspections` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `funnel_monitor_summary` ADD `mcp_detail_started_at` text;--> statement-breakpoint
CREATE TRIGGER `funnel_monitor_mcp_detail_after_event`
AFTER INSERT ON `events`
WHEN NEW.`kind` IN ('mcp_initialize', 'mcp_tools_list', 'mcp_tool_call', 'mcp_payment_attempt', 'mcp_payment_failure')
BEGIN
	UPDATE `funnel_monitor_summary`
	SET
		`mcp_tool_calls` = `mcp_tool_calls` + CASE WHEN NEW.`kind` = 'mcp_tool_call' THEN 1 ELSE 0 END,
		`mcp_payment_attempts` = `mcp_payment_attempts` + CASE WHEN NEW.`kind` = 'mcp_payment_attempt' THEN 1 ELSE 0 END,
		`mcp_payment_failures` = `mcp_payment_failures` + CASE WHEN NEW.`kind` = 'mcp_payment_failure' THEN 1 ELSE 0 END,
		`mcp_registry_inspections` = `mcp_registry_inspections` + CASE WHEN NEW.`client_type` = 'registry_inspector' AND NEW.`kind` IN ('mcp_initialize', 'mcp_tools_list', 'mcp_tool_call') THEN 1 ELSE 0 END,
		`mcp_detail_started_at` = COALESCE(`mcp_detail_started_at`, NEW.`occurred_at`),
		`updated_at` = NEW.`occurred_at`
	WHERE `id` = 1;

	INSERT INTO `funnel_monitor_clients` (`client_type`, `http_challenges`, `mcp_initializations`, `mcp_tool_lists`, `mcp_tool_calls`, `mcp_payment_attempts`, `mcp_challenges`, `mcp_payment_failures`, `paid_calls`, `updated_at`)
	VALUES (
		COALESCE(NEW.`client_type`, 'unknown'),
		0,
		CASE WHEN NEW.`kind` = 'mcp_initialize' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'mcp_tools_list' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'mcp_tool_call' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'mcp_payment_attempt' THEN 1 ELSE 0 END,
		0,
		CASE WHEN NEW.`kind` = 'mcp_payment_failure' THEN 1 ELSE 0 END,
		0,
		NEW.`occurred_at`
	)
	ON CONFLICT (`client_type`) DO UPDATE SET
		`mcp_initializations` = `mcp_initializations` + excluded.`mcp_initializations`,
		`mcp_tool_lists` = `mcp_tool_lists` + excluded.`mcp_tool_lists`,
		`mcp_tool_calls` = `mcp_tool_calls` + excluded.`mcp_tool_calls`,
		`mcp_payment_attempts` = `mcp_payment_attempts` + excluded.`mcp_payment_attempts`,
		`mcp_payment_failures` = `mcp_payment_failures` + excluded.`mcp_payment_failures`,
		`updated_at` = excluded.`updated_at`;

	INSERT INTO `funnel_monitor_endpoints` (`endpoint`, `payment_challenges`, `mcp_tool_calls`, `mcp_payment_attempts`, `mcp_payment_failures`, `paid_calls`, `revenue_usd`, `updated_at`)
	SELECT
		NEW.`endpoint`,
		0,
		CASE WHEN NEW.`kind` = 'mcp_tool_call' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'mcp_payment_attempt' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'mcp_payment_failure' THEN 1 ELSE 0 END,
		0,
		0,
		NEW.`occurred_at`
	WHERE NEW.`endpoint` IS NOT NULL
	ON CONFLICT (`endpoint`) DO UPDATE SET
		`mcp_tool_calls` = `mcp_tool_calls` + excluded.`mcp_tool_calls`,
		`mcp_payment_attempts` = `mcp_payment_attempts` + excluded.`mcp_payment_attempts`,
		`mcp_payment_failures` = `mcp_payment_failures` + excluded.`mcp_payment_failures`,
		`updated_at` = excluded.`updated_at`;
END;
