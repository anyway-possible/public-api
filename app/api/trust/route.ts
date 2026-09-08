import { NextResponse } from "next/server";
import { getPublicTrustSnapshot } from "../../../db/public-trust";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getPublicTrustSnapshot();
  return NextResponse.json({
    ok: true,
    service: "Anyway Possible Agent Utilities",
    status: snapshot.openIncidents === 0 ? "operational" : "incident_open",
    evidence: snapshot,
    definitions: {
      successfulPaidCalls: "Completed non-test paid tool calls recorded by the service.",
      recordedServiceErrors: "Application-level service errors recorded while handling tool requests.",
      observedSuccessRate: "Successful paid calls divided by successful paid calls plus recorded service errors. This is not an independently measured uptime SLA.",
    },
    externalMonitoring: {
      provider: "GitHub Actions",
      cadenceMinutes: 15,
      coverage: ["status page", "health contract", "trust evidence", "OpenAPI", "llms.txt", "MCP initialize", "x402 payment boundary"],
      paidRequests: false,
      selfTestTrafficExcludedFromCustomerMetrics: true,
      publicHistory: "https://github.com/anyway-possible/public-api/actions/workflows/production-monitor.yml",
      limitation: "Public run history is independent availability evidence, not a contractual uptime SLA.",
    },
    privacy: "Only aggregate counts and incident summaries are published. No wallet addresses, agent identifiers, transaction hashes, revenue, or request contents are returned.",
  }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
