CREATE TABLE `funnel_monitor_clients` (
	`client_type` text PRIMARY KEY NOT NULL,
	`http_challenges` integer DEFAULT 0 NOT NULL,
	`mcp_challenges` integer DEFAULT 0 NOT NULL,
	`paid_calls` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `funnel_monitor_endpoints` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`payment_challenges` integer DEFAULT 0 NOT NULL,
	`paid_calls` integer DEFAULT 0 NOT NULL,
	`revenue_usd` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `funnel_monitor_summary` (
	`id` integer PRIMARY KEY NOT NULL,
	`paid_calls` integer DEFAULT 0 NOT NULL,
	`unique_agents` integer DEFAULT 0 NOT NULL,
	`repeat_agents` integer DEFAULT 0 NOT NULL,
	`last_paid_at` text,
	`http_payment_challenges` integer DEFAULT 0 NOT NULL,
	`mcp_initializations` integer DEFAULT 0 NOT NULL,
	`mcp_tool_lists` integer DEFAULT 0 NOT NULL,
	`mcp_payment_challenges` integer DEFAULT 0 NOT NULL,
	`mcp_paid_calls` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `funnel_monitor_summary` (`id`, `paid_calls`, `unique_agents`, `repeat_agents`, `last_paid_at`, `http_payment_challenges`, `mcp_initializations`, `mcp_tool_lists`, `mcp_payment_challenges`, `mcp_paid_calls`, `updated_at`)
SELECT
	1,
	COUNT(CASE WHEN `kind` = 'paid_call' AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') THEN 1 END),
	COUNT(DISTINCT CASE WHEN `kind` = 'paid_call' AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') THEN `agent_id` END),
	(SELECT COUNT(*) FROM (SELECT `agent_id` FROM `events` WHERE `kind` = 'paid_call' AND `agent_id` IS NOT NULL AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') GROUP BY `agent_id` HAVING COUNT(*) > 1)),
	MAX(CASE WHEN `kind` = 'paid_call' AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') THEN `occurred_at` END),
	COUNT(CASE WHEN `kind` = 'payment_challenge' THEN 1 END),
	COUNT(CASE WHEN `kind` = 'mcp_initialize' THEN 1 END),
	COUNT(CASE WHEN `kind` = 'mcp_tools_list' THEN 1 END),
	COUNT(CASE WHEN `kind` = 'mcp_payment_challenge' THEN 1 END),
	COUNT(CASE WHEN `kind` = 'paid_call' AND (`endpoint` LIKE '/api/mcp#%' OR `endpoint` LIKE '/mcp#%') THEN 1 END),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `events`;
--> statement-breakpoint
INSERT INTO `funnel_monitor_clients` (`client_type`, `http_challenges`, `mcp_challenges`, `paid_calls`, `updated_at`)
SELECT
	`client_type`,
	COUNT(CASE WHEN `kind` = 'payment_challenge' THEN 1 END),
	COUNT(CASE WHEN `kind` = 'mcp_payment_challenge' THEN 1 END),
	COUNT(CASE WHEN `kind` = 'paid_call' AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') THEN 1 END),
	MAX(`occurred_at`)
FROM `events`
WHERE `client_type` IS NOT NULL AND `kind` IN ('payment_challenge', 'mcp_payment_challenge', 'paid_call')
GROUP BY `client_type`;
--> statement-breakpoint
INSERT INTO `funnel_monitor_endpoints` (`endpoint`, `payment_challenges`, `paid_calls`, `revenue_usd`, `updated_at`)
SELECT
	`endpoint`,
	COUNT(CASE WHEN `kind` IN ('payment_challenge', 'mcp_payment_challenge') THEN 1 END),
	COUNT(CASE WHEN `kind` = 'paid_call' AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') THEN 1 END),
	COALESCE(SUM(CASE WHEN `kind` = 'paid_call' AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') THEN `amount_usd` ELSE 0 END), 0),
	MAX(`occurred_at`)
FROM `events`
WHERE `endpoint` IS NOT NULL AND `kind` IN ('payment_challenge', 'mcp_payment_challenge', 'paid_call')
GROUP BY `endpoint`;
--> statement-breakpoint
CREATE TRIGGER `funnel_monitor_summary_after_event`
AFTER INSERT ON `events`
BEGIN
	UPDATE `funnel_monitor_summary`
	SET
		`paid_calls` = `paid_calls` + CASE WHEN NEW.`kind` = 'paid_call' THEN 1 ELSE 0 END,
		`unique_agents` = CASE WHEN NEW.`kind` = 'paid_call' THEN (SELECT COUNT(DISTINCT `agent_id`) FROM `events` WHERE `kind` = 'paid_call' AND `agent_id` IS NOT NULL AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z')) ELSE `unique_agents` END,
		`repeat_agents` = CASE WHEN NEW.`kind` = 'paid_call' THEN (SELECT COUNT(*) FROM (SELECT `agent_id` FROM `events` WHERE `kind` = 'paid_call' AND `agent_id` IS NOT NULL AND `occurred_at` NOT IN ('2026-08-06T18:59:59.282Z', '2026-08-06T19:34:06.305Z') GROUP BY `agent_id` HAVING COUNT(*) > 1)) ELSE `repeat_agents` END,
		`last_paid_at` = CASE WHEN NEW.`kind` = 'paid_call' THEN NEW.`occurred_at` ELSE `last_paid_at` END,
		`http_payment_challenges` = `http_payment_challenges` + CASE WHEN NEW.`kind` = 'payment_challenge' THEN 1 ELSE 0 END,
		`mcp_initializations` = `mcp_initializations` + CASE WHEN NEW.`kind` = 'mcp_initialize' THEN 1 ELSE 0 END,
		`mcp_tool_lists` = `mcp_tool_lists` + CASE WHEN NEW.`kind` = 'mcp_tools_list' THEN 1 ELSE 0 END,
		`mcp_payment_challenges` = `mcp_payment_challenges` + CASE WHEN NEW.`kind` = 'mcp_payment_challenge' THEN 1 ELSE 0 END,
		`mcp_paid_calls` = `mcp_paid_calls` + CASE WHEN NEW.`kind` = 'paid_call' AND (NEW.`endpoint` LIKE '/api/mcp#%' OR NEW.`endpoint` LIKE '/mcp#%') THEN 1 ELSE 0 END,
		`updated_at` = NEW.`occurred_at`
	WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `funnel_monitor_clients_after_event`
AFTER INSERT ON `events`
WHEN NEW.`client_type` IS NOT NULL AND NEW.`kind` IN ('payment_challenge', 'mcp_payment_challenge', 'paid_call')
BEGIN
	INSERT INTO `funnel_monitor_clients` (`client_type`, `http_challenges`, `mcp_challenges`, `paid_calls`, `updated_at`)
	VALUES (
		NEW.`client_type`,
		CASE WHEN NEW.`kind` = 'payment_challenge' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'mcp_payment_challenge' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'paid_call' THEN 1 ELSE 0 END,
		NEW.`occurred_at`
	)
	ON CONFLICT (`client_type`) DO UPDATE SET
		`http_challenges` = `http_challenges` + excluded.`http_challenges`,
		`mcp_challenges` = `mcp_challenges` + excluded.`mcp_challenges`,
		`paid_calls` = `paid_calls` + excluded.`paid_calls`,
		`updated_at` = excluded.`updated_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `funnel_monitor_endpoints_after_event`
AFTER INSERT ON `events`
WHEN NEW.`endpoint` IS NOT NULL AND NEW.`kind` IN ('payment_challenge', 'mcp_payment_challenge', 'paid_call')
BEGIN
	INSERT INTO `funnel_monitor_endpoints` (`endpoint`, `payment_challenges`, `paid_calls`, `revenue_usd`, `updated_at`)
	VALUES (
		NEW.`endpoint`,
		CASE WHEN NEW.`kind` IN ('payment_challenge', 'mcp_payment_challenge') THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'paid_call' THEN 1 ELSE 0 END,
		CASE WHEN NEW.`kind` = 'paid_call' THEN NEW.`amount_usd` ELSE 0 END,
		NEW.`occurred_at`
	)
	ON CONFLICT (`endpoint`) DO UPDATE SET
		`payment_challenges` = `payment_challenges` + excluded.`payment_challenges`,
		`paid_calls` = `paid_calls` + excluded.`paid_calls`,
		`revenue_usd` = `revenue_usd` + excluded.`revenue_usd`,
		`updated_at` = excluded.`updated_at`;
END;
