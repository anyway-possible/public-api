import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { decisions, events, expenses, incidents } from "./schema";

// Challenge conversion measurement started after the market-priced release was
// deployed and its Coinbase validation/indexing probes completed. Earlier 402s
// were launch verification traffic, not prospective customers.
const CHALLENGE_MEASUREMENT_START = "2026-08-09T21:00:00.000Z";

export type DashboardSnapshot = {
  paidCalls: number;
  uniqueAgents: number;
  grossRevenue: number;
  testCalls: number;
  testVolumeUsd: number;
  paymentChallenges: number;
  conversionRate: number;
  callsByEndpoint: Record<string, number>;
  revenueByEndpoint: Record<string, number>;
  challengesByEndpoint: Record<string, number>;
  repeatAgents: number;
  multiDayAgents: number;
  repeatRate: number;
  lastPaidAt: string | null;
  operatingCost: number;
  openDecisions: number;
  openIncidents: number;
  recentSettlements: Array<{ amountUsd: number; endpoint: string | null; occurredAt: string; transactionHash: string | null }>;
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const empty: DashboardSnapshot = { paidCalls: 0, uniqueAgents: 0, grossRevenue: 0, testCalls: 0, testVolumeUsd: 0, paymentChallenges: 0, conversionRate: 0, callsByEndpoint: {}, revenueByEndpoint: {}, challengesByEndpoint: {}, repeatAgents: 0, multiDayAgents: 0, repeatRate: 0, lastPaidAt: null, operatingCost: 0, openDecisions: 0, openIncidents: 0, recentSettlements: [] };
  try {
    const db = getDb();
    const [eventRows, expenseRows, decisionRows, incidentRows, recentSettlements] = await Promise.all([
      db.select().from(events),
      db.select().from(expenses),
      db.select().from(decisions).where(eq(decisions.status, "open")),
      db.select().from(incidents).where(eq(incidents.status, "open")),
      db.select({ amountUsd: events.amountUsd, endpoint: events.endpoint, occurredAt: events.occurredAt, transactionHash: events.transactionHash }).from(events).where(eq(events.kind, "paid_call")).orderBy(desc(events.occurredAt)).limit(5),
    ]);
    const seedTimes = new Set(["2026-08-06T18:59:59.282Z", "2026-08-06T19:34:06.305Z"]);
    const isTest = (row: typeof eventRows[number]) => row.kind === "test_call" || seedTimes.has(row.occurredAt);
    const customerEvents = eventRows.filter((row) => row.kind === "paid_call" && !isTest(row));
    const testEvents = eventRows.filter(isTest);
    const challengeEvents = eventRows.filter(
      (row) => row.kind === "payment_challenge" && row.occurredAt >= CHALLENGE_MEASUREMENT_START,
    );
    const paymentChallenges = challengeEvents.length;
    const callsByEndpoint = customerEvents.reduce<Record<string, number>>((counts, row) => {
      const endpoint = row.endpoint ?? "unknown";
      counts[endpoint] = (counts[endpoint] ?? 0) + 1;
      return counts;
    }, {});
    const revenueByEndpoint = customerEvents.reduce<Record<string, number>>((totals, row) => {
      const endpoint = row.endpoint ?? "unknown";
      totals[endpoint] = (totals[endpoint] ?? 0) + row.amountUsd;
      return totals;
    }, {});
    const agentActivity = customerEvents.reduce<Record<string, { calls: number; days: Set<string> }>>((activity, row) => {
      if (!row.agentId) return activity;
      const current = activity[row.agentId] ?? { calls: 0, days: new Set<string>() };
      current.calls += 1;
      current.days.add(row.occurredAt.slice(0, 10));
      activity[row.agentId] = current;
      return activity;
    }, {});
    const uniqueAgents = Object.keys(agentActivity).length;
    const repeatAgents = Object.values(agentActivity).filter((agent) => agent.calls > 1).length;
    const multiDayAgents = Object.values(agentActivity).filter((agent) => agent.days.size > 1).length;
    const challengesByEndpoint = challengeEvents.reduce<Record<string, number>>((counts, row) => {
      const endpoint = row.endpoint ?? "unknown";
      counts[endpoint] = (counts[endpoint] ?? 0) + 1;
      return counts;
    }, {});
    return {
      paidCalls: customerEvents.length,
      uniqueAgents,
      grossRevenue: customerEvents.reduce((sum, row) => sum + row.amountUsd, 0),
      testCalls: testEvents.length,
      testVolumeUsd: testEvents.reduce((sum, row) => sum + row.amountUsd, 0),
      paymentChallenges,
      conversionRate: paymentChallenges ? Math.min(100, (customerEvents.length / paymentChallenges) * 100) : 0,
      callsByEndpoint,
      revenueByEndpoint,
      challengesByEndpoint,
      repeatAgents,
      multiDayAgents,
      repeatRate: uniqueAgents ? (repeatAgents / uniqueAgents) * 100 : 0,
      lastPaidAt: customerEvents.reduce<string | null>((latest, row) => !latest || row.occurredAt > latest ? row.occurredAt : latest, null),
      operatingCost: expenseRows.reduce((sum, row) => sum + row.amountUsd, 0) + eventRows.reduce((sum, row) => sum + row.costUsd, 0),
      openDecisions: decisionRows.length,
      openIncidents: incidentRows.length,
      recentSettlements: recentSettlements.filter((row) => !seedTimes.has(row.occurredAt)),
    };
  } catch {
    return empty;
  }
}
