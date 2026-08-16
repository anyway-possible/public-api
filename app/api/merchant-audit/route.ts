import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent } from "../../../lib/analytics";
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
        accepts: { scheme: "exact", price: "$0.50", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
        serviceName: "Anyway Possible x402 Merchant Audit",
        tags: ["x402 analytics", "Bazaar ranking", "merchant audit", "x402 revenue", "API marketplace", "semantic search", "competitor pricing", "seller intelligence"],
        iconUrl: "https://anywaypossible.com/favicon.svg",
        description: "Find why an x402 API is not selling. Audit Coinbase Bazaar listings, semantic-search rank, competitor pricing, unpaid 402 reliability, 30-day buyer signals, and Base USDC wallet activity, then receive a scored report with prioritized fixes. No account or API key.",
        extensions: { ...declareDiscoveryExtension({ method: "POST", bodyType: "json", input: { payTo: PAY_TO, queries: ["x402 merchant analytics", "Base wallet balance", "agent treasury"], excludePayers: ["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"] }, inputSchema: { type: "object", properties: { payTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "Seller wallet on Base" }, queries: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 2, maxLength: 100 } }, excludePayers: { type: "array", maxItems: 10, items: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } } }, required: ["payTo", "queries"] }, output: { example: { auditId: "b7d4...", merchant: PAY_TO.toLowerCase(), network: "Base (eip155:8453)", score: 72, grade: "C", summary: { listingCount: 6, indexedCalls30d: 18, maxResourceUniquePayers30d: 2, externalInboundUsdc: 0.004 }, rankings: [{ query: "x402 merchant analytics", rank: 1 }], actions: ["Publish a copy-paste buyer example and recruit three independent agents before adding more endpoints."] }, schema: { type: "object", properties: { auditId: { type: "string" }, merchant: { type: "string" }, network: { type: "string" }, observedAt: { type: "string" }, score: { type: "integer" }, grade: { type: "string" }, scoreBreakdown: { type: "object" }, summary: { type: "object" }, listings: { type: "array", items: { type: "object" } }, rankings: { type: "array", items: { type: "object" } }, onchain: { type: "object" }, actions: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } } }, required: ["auditId", "merchant", "network", "observedAt", "score", "grade", "scoreBreakdown", "summary", "listings", "rankings", "onchain", "actions", "limitations"] } } }) },
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
    try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/merchant-audit", agentId: identity.agentId, amountUsd: 0.5, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: result.observedAt }).run(); } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { console.error("Merchant audit failed", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Merchant audit failed." }, { status: 502 }); }
}

export async function POST(request: NextRequest) {
  try { const response = await withX402FromHTTPServer(paidHandler, await getServer())(request); if (response.status === 402) { try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/merchant-audit", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run(); } catch {} } return response; }
  catch (error) { console.error("x402 initialization failed", error); return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 }); }
}

export async function GET() { return NextResponse.json({ service: "Anyway Possible x402 Merchant Audit", price: "$0.50 USDC", network: "Base (eip155:8453)", method: "POST", request: { payTo: PAY_TO, queries: ["x402 merchant analytics", "Base wallet balance"], excludePayers: ["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"] }, returns: ["merchant score and grade", "Bazaar listing quality", "semantic search rankings", "competitor prices", "x402 reliability", "Base USDC activity", "prioritized fixes"] }); }
