import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent } from "../../../lib/analytics";
import { createMerchantSnapshot } from "../../../lib/merchant-snapshot";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
const EXAMPLE = {
  snapshotId: "b7d4...",
  merchant: PAY_TO.toLowerCase(),
  network: "Base (eip155:8453)",
  observedAt: "2026-08-16T17:00:00.000Z",
  score: 86,
  grade: "B",
  signals: { listingCount: 6, analyzedListingCount: 5, indexedCalls30d: 19, maxResourceUniquePayers30d: 2, externalInboundUsdc: 0.004, uniqueExternalPayers: 2, latestActivity: "2026-08-16T17:10:09.675Z", reliableListings: 5 },
  visibility: [{ query: "Base wallet balance", rank: 1, matchedResource: "https://anywaypossible.com/api/base-balance" }],
  biggestIssue: "Target the missing search queries in service names, descriptions, and tags.",
  upgrade: { endpoint: "https://anywaypossible.com/api/merchant-audit", priceUsd: 0.5, includes: ["competitor pricing", "listing-by-listing defects", "onchain transfer evidence", "three prioritized actions"] },
  limitations: ["Public discovery and onchain transfers cannot prove that every inbound payment is customer revenue."],
};
let serverPromise: Promise<X402Server> | undefined;

function getServer() {
  if (!serverPromise) {
    const runtimeEnv = env as unknown as Record<string, string | undefined>;
    serverPromise = createX402Server({ apiKeyId: runtimeEnv.CDP_API_KEY_ID, apiKeySecret: runtimeEnv.CDP_API_KEY_SECRET, environment: "production", payToConfig: { type: "address", evm: PAY_TO }, builderCode: "anyway_possible", routes: {
      "POST /api/merchant-snapshot": {
        accepts: { scheme: "exact", price: "$0.05", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
        serviceName: "Why Is My x402 API Not Selling? — Revenue Snapshot",
        tags: ["x402 merchant analytics", "x402 API not selling", "increase x402 revenue", "x402 seller intelligence", "Coinbase Bazaar audit", "x402 merchant score"],
        iconUrl: "https://anywaypossible.com/favicon.svg",
        description: "Get x402 merchant analytics and diagnose why an x402 API is not generating revenue. This $0.05 seller-intelligence snapshot scores Coinbase Bazaar discovery, buyer-search visibility, live payment reliability, 30-day demand signals, and observed Base USDC activity, then returns the biggest revenue issue and a full-audit upgrade. No account or API key.",
        extensions: { ...declareDiscoveryExtension({
          method: "POST", bodyType: "json",
          input: { payTo: PAY_TO, queries: ["why is my x402 API not selling", "increase x402 revenue", "x402 seller intelligence"], excludePayers: ["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"] },
          inputSchema: { type: "object", properties: { payTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "Seller wallet on Base" }, queries: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 2, maxLength: 100 } }, excludePayers: { type: "array", maxItems: 10, items: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } } }, required: ["payTo", "queries"] },
          output: { example: EXAMPLE, schema: { type: "object", properties: { snapshotId: { type: "string" }, merchant: { type: "string" }, network: { type: "string" }, observedAt: { type: "string" }, score: { type: "integer" }, grade: { type: "string" }, signals: { type: "object" }, visibility: { type: "array", items: { type: "object" } }, biggestIssue: { type: "string" }, upgrade: { type: "object" }, limitations: { type: "array", items: { type: "string" } } }, required: ["snapshotId", "merchant", "network", "observedAt", "score", "grade", "signals", "visibility", "biggestIssue", "upgrade", "limitations"] } },
        }) },
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
  if (!Array.isArray(input.queries) || input.queries.length < 1 || input.queries.length > 3 || input.queries.some((query) => typeof query !== "string" || query.length < 2 || query.length > 100)) return NextResponse.json({ error: "queries must contain 1 to 3 strings, each 2 to 100 characters." }, { status: 400 });
  if (input.excludePayers !== undefined && (!Array.isArray(input.excludePayers) || input.excludePayers.length > 10 || input.excludePayers.some((address) => typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)))) return NextResponse.json({ error: "excludePayers must contain at most 10 valid EVM addresses." }, { status: 400 });
  try {
    const result = await createMerchantSnapshot({ payTo: input.payTo, queries: input.queries as string[], excludePayers: input.excludePayers as string[] | undefined });
    try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/merchant-snapshot", agentId: identity.agentId, amountUsd: 0.05, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: result.observedAt }).run(); } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { console.error("Merchant snapshot failed", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Merchant snapshot failed." }, { status: 502 }); }
}

export async function POST(request: NextRequest) {
  try { const response = await withX402FromHTTPServer(paidHandler, await getServer())(request); if (response.status === 402) { try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/merchant-snapshot", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run(); } catch {} } return response; }
  catch (error) { console.error("x402 initialization failed", error); return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 }); }
}

export async function GET() { return NextResponse.json({ service: "Why Is My x402 API Not Selling? — Revenue Snapshot", useWhen: "An x402 seller needs to diagnose weak discovery, demand, or revenue before purchasing a full audit.", price: "$0.05 USDC", network: "Base (eip155:8453)", method: "POST", request: { payTo: PAY_TO, queries: ["why is my x402 API not selling", "increase x402 revenue", "x402 seller intelligence"], excludePayers: ["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"] }, returns: ["merchant score and grade", "Bazaar inventory", "semantic visibility", "buyer and USDC signals", "biggest revenue issue", "$0.50 full-audit upgrade"] }); }
