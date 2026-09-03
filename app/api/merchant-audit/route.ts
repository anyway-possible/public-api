import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent, recordServiceError } from "../../../lib/analytics";
import { auditMerchant } from "../../../lib/merchant-audit";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
let serverPromise: Promise<X402Server> | undefined;

function getServer() {
  if (!serverPromise) {
    const runtimeEnv = env as unknown as Record<string, string | undefined>;
    serverPromise = createX402Server({ apiKeyId: runtimeEnv.CDP_API_KEY_ID, apiKeySecret: runtimeEnv.CDP_API_KEY_SECRET, environment: "production", payToConfig: { type: "address", evm: PAY_TO }, builderCode: "anyway_possible", routes: {
      "POST /api/merchant-audit": {
        accepts: { scheme: "exact", price: "$0.25", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
        serviceName: "x402 API Revenue Audit — Anyway Possible",
        tags: ["x402 revenue audit", "x402 API not selling", "increase x402 revenue", "Coinbase Bazaar ranking", "x402 competitor pricing"],
        iconUrl: "https://anywaypossible.com/favicon.png",
        description: "Audit why an x402 API is not generating revenue. This full seller-intelligence report analyzes Coinbase Bazaar ranking, exact buyer searches, listing defects, competitor pricing, live payment reliability, 30-day payer signals, and Base USDC activity, then returns three prioritized revenue fixes. No account or API key.",
        extensions: { ...declareDiscoveryExtension({ method: "POST", bodyType: "json", input: { payTo: PAY_TO, queries: ["x402 merchant analytics", "Base wallet balance", "agent treasury"], excludePayers: ["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"] }, inputSchema: { type: "object", properties: { payTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "Seller wallet on Base" }, queries: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 2, maxLength: 100 } }, excludePayers: { type: "array", maxItems: 10, items: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } } }, required: ["payTo", "queries"] }, output: { example: { auditId: "b7d4...", merchant: PAY_TO.toLowerCase(), network: "Base (eip155:8453)", observedAt: "2026-08-16T17:00:00.000Z", score: 72, grade: "C", scoreBreakdown: { listings: 20, reliability: 20, metadata: 17, visibility: 10, recency: 5, buyerReach: 0 }, summary: { listingCount: 6, indexedCalls30d: 18, maxResourceUniquePayers30d: 2, onchainInboundUsdc: 0.808, externalInboundUsdc: 0.004, excludedInboundUsdc: 0.804, uniqueExternalPayers: 2, latestActivity: "2026-08-16T16:58:27.000Z" }, listings: [{ resource: "https://api.example.com/report", priceUsd: 0.1, metadataCompleteness: 100, reliability: { status: 402, x402Ready: true, responseTimeMs: 320 } }], rankings: [{ query: "x402 merchant analytics", rank: 1, matchedResource: "https://api.example.com/report", resultCount: 10, topCompetitors: [] }], onchain: { onchainInboundUsdc: 0.808, externalInboundUsdc: 0.004, excludedInboundUsdc: 0.804, uniqueExternalPayers: 2, sampleLimited: false, recentInboundUsdc: [] }, actions: ["Publish a copy-paste buyer example and recruit three independent agents before adding more endpoints."], limitations: ["Public discovery and onchain transfers cannot prove that every inbound payment is customer revenue."] }, schema: { type: "object", properties: { auditId: { type: "string" }, merchant: { type: "string" }, network: { type: "string" }, observedAt: { type: "string" }, score: { type: "integer" }, grade: { type: "string" }, scoreBreakdown: { type: "object" }, summary: { type: "object" }, listings: { type: "array", items: { type: "object" } }, rankings: { type: "array", items: { type: "object" } }, onchain: { type: "object" }, actions: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } } }, required: ["auditId", "merchant", "network", "observedAt", "score", "grade", "scoreBreakdown", "summary", "listings", "rankings", "onchain", "actions", "limitations"] } } }) },
      },
    } });
  }
  return serverPromise;
}

async function paidHandler(request: NextRequest) {
  const started = Date.now();
  let input: { payTo?: string; queries?: unknown; excludePayers?: unknown };
  try { input = await request.json() as typeof input; } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input.payTo || !/^0x[a-fA-F0-9]{40}$/.test(input.payTo)) return NextResponse.json({ error: "payTo must be a valid 20-byte EVM address." }, { status: 400 });
  if (!Array.isArray(input.queries) || input.queries.length < 1 || input.queries.length > 5 || input.queries.some((query) => typeof query !== "string" || query.length < 2 || query.length > 100)) return NextResponse.json({ error: "queries must contain 1 to 5 strings, each 2 to 100 characters." }, { status: 400 });
  if (input.excludePayers !== undefined && (!Array.isArray(input.excludePayers) || input.excludePayers.length > 10 || input.excludePayers.some((address) => typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)))) return NextResponse.json({ error: "excludePayers must contain at most 10 valid EVM addresses." }, { status: 400 });
  try {
    const result = await auditMerchant({ payTo: input.payTo, queries: input.queries as string[], excludePayers: input.excludePayers as string[] | undefined });
    try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/merchant-audit", agentId: identity.agentId, amountUsd: 0.25, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: result.observedAt }).run(); } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { console.error("Merchant audit failed", error); await recordServiceError(request, "/api/merchant-audit", 502, started); return NextResponse.json({ error: error instanceof Error ? error.message : "Merchant audit failed." }, { status: 502 }); }
}

export async function POST(request: NextRequest) {
  try { const response = await withX402FromHTTPServer(paidHandler, await getServer())(request); if (response.status === 402) { try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/merchant-audit", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run(); } catch {} } return response; }
  catch (error) { console.error("x402 initialization failed", error); await recordServiceError(request, "/api/merchant-audit", 503); return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 }); }
}

export async function GET() { return NextResponse.json({ service: "x402 API Revenue Audit — Anyway Possible", useWhen: "An x402 seller needs a complete diagnosis of weak discovery, conversion, payer demand, or revenue.", price: "$0.25 USDC", network: "Base (eip155:8453)", method: "POST", request: { payTo: PAY_TO, queries: ["why is my x402 API not selling", "increase x402 revenue", "x402 seller intelligence"], excludePayers: ["0x44D2DC46f987D1f2fa55e281934aDDd193a1A377"] }, returns: ["merchant score and grade", "Bazaar listing quality", "semantic search rankings", "competitor prices", "x402 reliability", "Base USDC activity", "prioritized fixes"], experiment: { id: "merchant-audit-price-2026-09", previousPriceUsd: 0.5, priceUsd: 0.25, startsAt: "2026-09-02T00:00:00.000Z", endsAt: "2026-09-16T23:59:59.999Z" } }); }
