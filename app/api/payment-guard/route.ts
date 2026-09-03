import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent, recordServiceError } from "../../../lib/analytics";
import { BASE_USDC as USDC } from "../../../lib/base-balance";
import { evaluatePaymentGuard, type PaymentGuardInput } from "../../../lib/payment-guard";
import { parsePublicUrl } from "../../../lib/verification";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
let serverPromise: Promise<X402Server> | undefined;

function getServer() {
  if (!serverPromise) {
    const e = env as unknown as Record<string, string | undefined>;
    serverPromise = createX402Server({ apiKeyId: e.CDP_API_KEY_ID, apiKeySecret: e.CDP_API_KEY_SECRET, environment: "production", payToConfig: { type: "address", evm: PAY_TO }, builderCode: "anyway_possible", routes: {
      "POST /api/payment-guard": {
        accepts: { scheme: "exact", price: "$0.01", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
        serviceName: "x402 Payment Guard — Verify Before Signing",
        tags: ["x402 payment safety", "verify before paying", "agent transaction guard", "Base USDC preflight", "safe autonomous payment"],
        iconUrl: "https://anywaypossible.com/favicon.png",
        description: "Verify an x402 purchase before an AI agent signs. Validate the live HTTP 402 challenge, Base network, USDC asset, quoted price, recipient, price ceiling, buyer funding, optional gas reserve, and destination hazards, then receive a machine-readable safe-to-sign, fund, review, or reject decision. No account or API key.",
        extensions: { ...declareDiscoveryExtension({ method: "POST", bodyType: "json", input: { payerAddress: "0x1111111111111111111111111111111111111111", serviceUrl: "https://example.com/api/report", maxAmountUsdc: "0.10", expectedPayTo: "0x2222222222222222222222222222222222222222", minGasReserveEth: "0" }, inputSchema: { type: "object", properties: { payerAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, serviceUrl: { type: "string", format: "uri" }, maxAmountUsdc: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,6})?$" }, expectedPayTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, minGasReserveEth: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,18})?$" } }, required: ["payerAddress", "serviceUrl", "maxAmountUsdc"] }, output: { example: { decision: "safe_to_sign", safeToSign: true, riskLevel: "low", quotedAmountUsdc: "0.01", quotedPayTo: "0x2222222222222222222222222222222222222222", network: "eip155:8453", asset: USDC, checks: [{ id: "x402_contract", status: "pass" }], alerts: [], recommendedAction: "Sign only the validated payment requirements." }, schema: { type: "object", properties: { decision: { type: "string" }, safeToSign: { type: "boolean" }, riskLevel: { type: "string" }, quotedAmountUsdc: { type: "string" }, quotedPayTo: { type: "string" }, network: { type: "string" }, asset: { type: "string" }, checks: { type: "array", items: { type: "object" } }, alerts: { type: "array", items: { type: "string" } }, recommendedAction: { type: "string" } }, required: ["decision", "safeToSign", "riskLevel", "quotedAmountUsdc", "quotedPayTo", "network", "asset", "checks", "alerts", "recommendedAction"] } } }) },
      },
    } });
  }
  return serverPromise;
}

async function paidHandler(request: NextRequest) {
  const started = Date.now();
  let input: { payerAddress?: string; serviceUrl?: string; maxAmountUsdc?: string; expectedPayTo?: string; minGasReserveEth?: string };
  try { input = await request.json() as typeof input; } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input.payerAddress || !/^0x[a-fA-F0-9]{40}$/.test(input.payerAddress) || !input.serviceUrl || !input.maxAmountUsdc) return NextResponse.json({ error: "payerAddress, serviceUrl, and maxAmountUsdc are required." }, { status: 400 });
  if (input.expectedPayTo && !/^0x[a-fA-F0-9]{40}$/.test(input.expectedPayTo)) return NextResponse.json({ error: "expectedPayTo must be a valid EVM address." }, { status: 400 });
  if (!/^[0-9]+(\.[0-9]{1,6})?$/.test(input.maxAmountUsdc) || (input.minGasReserveEth && !/^[0-9]+(\.[0-9]{1,18})?$/.test(input.minGasReserveEth))) return NextResponse.json({ error: "Payment limits must be non-negative decimal strings within asset precision." }, { status: 400 });
  try { parsePublicUrl(input.serviceUrl); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid serviceUrl." }, { status: 400 }); }
  try {
    const result = await evaluatePaymentGuard(input as PaymentGuardInput);
    try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/payment-guard", agentId: identity.agentId, amountUsd: 0.01, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: result.observedAt }).run(); } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { await recordServiceError(request, "/api/payment-guard", 502, started); return NextResponse.json({ error: error instanceof Error ? error.message : "Payment guard failed." }, { status: 502 }); }
}

export async function POST(request: NextRequest) { try { const response = await withX402FromHTTPServer(paidHandler, await getServer())(request); if (response.status === 402) { try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/payment-guard", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run(); } catch {} } return response; } catch { await recordServiceError(request, "/api/payment-guard", 503); return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 }); } }
export async function GET() { return NextResponse.json({ service: "x402 Payment Guard — Verify Before Signing", price: "$0.01 USDC", network: "Base", method: "POST", request: { payerAddress: "0x1111111111111111111111111111111111111111", serviceUrl: "https://example.com/api/report", maxAmountUsdc: "0.10", expectedPayTo: "0x2222222222222222222222222222222222222222", minGasReserveEth: "0" }, returns: ["safe-to-sign decision", "live x402 contract validation", "price and recipient checks", "buyer funding", "destination hazards"] }); }
