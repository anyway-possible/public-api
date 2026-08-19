import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: text("event_id").notNull().unique(),
  kind: text("kind").notNull(),
  endpoint: text("endpoint"),
  agentId: text("agent_id"),
  amountUsd: real("amount_usd").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  latencyMs: integer("latency_ms"),
  statusCode: integer("status_code"),
  transactionHash: text("transaction_hash"),
  network: text("network"),
  occurredAt: text("occurred_at").notNull(),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendor: text("vendor").notNull(),
  category: text("category").notNull(),
  amountUsd: real("amount_usd").notNull(),
  description: text("description").notNull(),
  incurredAt: text("incurred_at").notNull(),
});

export const experiments = sqliteTable("experiments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  hypothesis: text("hypothesis").notNull(),
  successMetric: text("success_metric").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  result: text("result"),
});

export const incidents = sqliteTable("incidents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  openedAt: text("opened_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const decisions = sqliteTable("decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  amountUsd: real("amount_usd"),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const sourcingRequests = sqliteTable("sourcing_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull().unique(),
  status: text("status").notNull().default("new"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull().default(""),
  description: text("description").notNull(),
  quantity: text("quantity").notNull(),
  neededBy: text("needed_by").notNull().default(""),
  budgetRange: text("budget_range").notNull().default(""),
  drawingUrl: text("drawing_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
