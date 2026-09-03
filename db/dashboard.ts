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
  mcpInitializations: number;
  mcpToolLists: number;
  mcpToolCalls: number;
  mcpPaymentAttempts: number;
  mcpPaymentChallenges: number;
  mcpPaymentFailures: number;
  mcpPaidCalls: number;
  mcpUniqueAgents: number;
  mcpConversionRate: number;
  mcpChallengesByTool: Record<string, number>;
  mcpToolCallsByTool: Record<string, number>;
  repeatAgents: number;
  multiDayAgents: number;
  repeatRate: number;
  multiProductAgents: number;
  productPairs: Array<{ products: [string, string]; buyers: number }>;
  lastPaidAt: string | null;
  reliability: { successfulPaidCalls: number; serviceErrors: number; errorRate: number; averageLatencyMs: number | null; p95LatencyMs: number | null; generatedAt: string };
  operatingCost: number;
  openDecisions: number;
  openIncidents: number;
  recentSettlements: Array<{ amountUsd: number; endpoint: string | null; occurredAt: string; transactionHash: string | null }>;
  dailyActivity: Array<{ date: string; paidCalls: number; paymentChallenges: number; serviceErrors: number; revenueUsd: number }>;
};

function lastUtcDays(count: number) {
  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Array.from({ length: count }, (_, index) => new Date(end - (count - index - 1) * 86_400_000).toISOString().slice(0, 10));
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const empty: DashboardSnapshot = { paidCalls: 0, uniqueAgents: 0, grossRevenue: 0, testCalls: 0, testVolumeUsd: 0, paymentChallenges: 0, conversionRate: 0, callsByEndpoint: {}, revenueByEndpoint: {}, challengesByEndpoint: {}, mcpInitializations: 0, mcpToolLists: 0, mcpToolCalls: 0, mcpPaymentAttempts: 0, mcpPaymentChallenges: 0, mcpPaymentFailures: 0, mcpPaidCalls: 0, mcpUniqueAgents: 0, mcpConversionRate: 0, mcpChallengesByTool: {}, mcpToolCallsByTool: {}, repeatAgents: 0, multiDayAgents: 0, repeatRate: 0, multiProductAgents: 0, productPairs: [], lastPaidAt: null, reliability: { successfulPaidCalls: 0, serviceErrors: 0, errorRate: 0, averageLatencyMs: null, p95LatencyMs: null, generatedAt: new Date().toISOString() }, operatingCost: 0, openDecisions: 0, openIncidents: 0, recentSettlements: [], dailyActivity: [] };
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
    const mcpInitializations = eventRows.filter((row) => row.kind === "mcp_initialize");
    const mcpToolLists = eventRows.filter((row) => row.kind === "mcp_tools_list");
    const mcpToolCalls = eventRows.filter((row) => row.kind === "mcp_tool_call");
    const mcpPaymentAttempts = eventRows.filter((row) => row.kind === "mcp_payment_attempt");
    const mcpChallengeEvents = eventRows.filter((row) => row.kind === "mcp_payment_challenge");
    const mcpPaymentFailures = eventRows.filter((row) => row.kind === "mcp_payment_failure");
    const serviceErrors = eventRows.filter((row) => row.kind === "service_error");
    const mcpPaidEvents = customerEvents.filter((row) => row.endpoint?.startsWith("/api/mcp#") || row.endpoint?.startsWith("/mcp#"));
    const mcpAgentIds = new Set(
      [...mcpInitializations, ...mcpToolLists, ...mcpToolCalls, ...mcpChallengeEvents].map((row) => row.agentId).filter((id): id is string => Boolean(id)),
    );
    const mcpChallengesByTool = mcpChallengeEvents.reduce<Record<string, number>>((counts, row) => {
      const tool = row.endpoint?.split("#")[1] ?? "unknown";
      counts[tool] = (counts[tool] ?? 0) + 1;
      return counts;
    }, {});
    const mcpToolCallsByTool = mcpToolCalls.reduce<Record<string, number>>((counts, row) => {
      const tool = row.endpoint?.split("#")[1] ?? "unknown";
      counts[tool] = (counts[tool] ?? 0) + 1;
      return counts;
    }, {});
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
    const productsByAgent = customerEvents.reduce<Record<string, Set<string>>>((products, row) => {
      if (!row.agentId) return products;
      const product = (row.endpoint ?? "unknown").replace(/^\/api\/mcp#/, "/api/").replace(/^\/mcp#/, "/api/");
      (products[row.agentId] ??= new Set<string>()).add(product);
      return products;
    }, {});
    const pairCounts = Object.values(productsByAgent).reduce<Record<string, number>>((counts, products) => {
      const sorted = [...products].sort();
      for (let left = 0; left < sorted.length; left += 1) for (let right = left + 1; right < sorted.length; right += 1) {
        const key = `${sorted[left]}|${sorted[right]}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return counts;
    }, {});
    const productPairs = Object.entries(pairCounts).map(([key, buyers]) => ({ products: key.split("|") as [string, string], buyers })).sort((a, b) => b.buyers - a.buyers || a.products.join().localeCompare(b.products.join()));
    const paidLatencies = customerEvents.map((row) => row.latencyMs).filter((value): value is number => value !== null);
    const sortedLatencies = [...paidLatencies].sort((a, b) => a - b);
    const p95Index = sortedLatencies.length ? Math.min(sortedLatencies.length - 1, Math.ceil(sortedLatencies.length * 0.95) - 1) : -1;
    const challengesByEndpoint = challengeEvents.reduce<Record<string, number>>((counts, row) => {
      const endpoint = row.endpoint ?? "unknown";
      counts[endpoint] = (counts[endpoint] ?? 0) + 1;
      return counts;
    }, {});
    const dailyActivity = lastUtcDays(30).map((date) => {
      const paid = customerEvents.filter((row) => row.occurredAt.startsWith(date));
      return {
        date,
        paidCalls: paid.length,
        paymentChallenges: challengeEvents.filter((row) => row.occurredAt.startsWith(date)).length,
        serviceErrors: serviceErrors.filter((row) => row.occurredAt.startsWith(date)).length,
        revenueUsd: paid.reduce((sum, row) => sum + row.amountUsd, 0),
      };
    });
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
      mcpInitializations: mcpInitializations.length,
      mcpToolLists: mcpToolLists.length,
      mcpToolCalls: mcpToolCalls.length,
      mcpPaymentAttempts: mcpPaymentAttempts.length,
      mcpPaymentChallenges: mcpChallengeEvents.length,
      mcpPaymentFailures: mcpPaymentFailures.length,
      mcpPaidCalls: mcpPaidEvents.length,
      mcpUniqueAgents: mcpAgentIds.size,
      mcpConversionRate: mcpChallengeEvents.length ? Math.min(100, (mcpPaidEvents.length / mcpChallengeEvents.length) * 100) : 0,
      mcpChallengesByTool,
      mcpToolCallsByTool,
      repeatAgents,
      multiDayAgents,
      repeatRate: uniqueAgents ? (repeatAgents / uniqueAgents) * 100 : 0,
      multiProductAgents: Object.values(productsByAgent).filter((products) => products.size > 1).length,
      productPairs,
      lastPaidAt: customerEvents.reduce<string | null>((latest, row) => !latest || row.occurredAt > latest ? row.occurredAt : latest, null),
      reliability: {
        successfulPaidCalls: customerEvents.length,
        serviceErrors: serviceErrors.length,
        errorRate: customerEvents.length + serviceErrors.length ? (serviceErrors.length / (customerEvents.length + serviceErrors.length)) * 100 : 0,
        averageLatencyMs: paidLatencies.length ? paidLatencies.reduce((sum, value) => sum + value, 0) / paidLatencies.length : null,
        p95LatencyMs: p95Index >= 0 ? sortedLatencies[p95Index] : null,
        generatedAt: new Date().toISOString(),
      },
      operatingCost: expenseRows.reduce((sum, row) => sum + row.amountUsd, 0) + eventRows.reduce((sum, row) => sum + row.costUsd, 0),
      openDecisions: decisionRows.length,
      openIncidents: incidentRows.length,
      recentSettlements: recentSettlements.filter((row) => !seedTimes.has(row.occurredAt)),
      dailyActivity,
    };
  } catch {
    return empty;
  }
}
