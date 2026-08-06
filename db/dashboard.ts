import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { decisions, events, expenses, incidents } from "./schema";

export type DashboardSnapshot = {
  paidCalls: number;
  uniqueAgents: number;
  grossRevenue: number;
  operatingCost: number;
  openDecisions: number;
  openIncidents: number;
  recentSettlements: Array<{ amountUsd: number; endpoint: string | null; occurredAt: string; transactionHash: string | null }>;
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const empty: DashboardSnapshot = { paidCalls: 0, uniqueAgents: 0, grossRevenue: 0, operatingCost: 0, openDecisions: 0, openIncidents: 0, recentSettlements: [] };
  try {
    const db = getDb();
    const [eventRows, expenseRows, decisionRows, incidentRows, recentSettlements] = await Promise.all([
      db.select().from(events),
      db.select().from(expenses),
      db.select().from(decisions).where(eq(decisions.status, "open")),
      db.select().from(incidents).where(eq(incidents.status, "open")),
      db.select({ amountUsd: events.amountUsd, endpoint: events.endpoint, occurredAt: events.occurredAt, transactionHash: events.transactionHash }).from(events).where(eq(events.kind, "paid_call")).orderBy(desc(events.occurredAt)).limit(5),
    ]);
    return {
      paidCalls: eventRows.filter((row) => row.kind === "paid_call").length,
      uniqueAgents: new Set(eventRows.map((row) => row.agentId).filter(Boolean)).size,
      grossRevenue: eventRows.reduce((sum, row) => sum + row.amountUsd, 0),
      operatingCost: expenseRows.reduce((sum, row) => sum + row.amountUsd, 0) + eventRows.reduce((sum, row) => sum + row.costUsd, 0),
      openDecisions: decisionRows.length,
      openIncidents: incidentRows.length,
      recentSettlements,
    };
  } catch {
    return empty;
  }
}
