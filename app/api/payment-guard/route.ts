import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent, recordServiceError } from "../../../lib/analytics";
import { parsePublicUrl } from "../../../lib/verification";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
let serverPromise: Promise<X402Server> | undefined;

function getServer() {
  if (!serverPromise) {
    const e = env as unknown as Record<string, string | undefined>;
    serverPromise = createX402Server({ apiKeyId: e.CDP_API_KEY_ID, apiKeySecret: e.CDP_API_KEY_SECRET, environment: "production", payToConfig: { type: "address", evm: PAY_TO }, builderCode: "anyway_possible", routes: {
      "POST /api/payment-guard": {
        accepts: { scheme: "exact", price: "$0.01", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
        serviceName: "x402 Payment Guard — Verify Before Signing",
        tags: ["x402 payment safety", "verify before paying", "agent transaction guard", "Base USDC preflight", "safe autonomous payment"],
        iconUrl: "https://anywaypossible.com/favicon.svg",
        description: "Verify an x402 purchase before an AI agent signs. Validate the live HTTP 402 challenge, Base network, USDC asset, quoted price, recipient, price ceiling, buyer funding, optional gas reserve, and destination hazards, then receive a machine-readable safe-to-sign, fund, review, or reject decision. No account or API key.",
        extensions: { ...declareDiscoveryExtension({ method: "POST", bodyType: "json", input: { payerAddress: "0x1111111111111111111111111111111111111111", serviceUrl: "https://example.com/api/report", maxAmountUsdc: "0.10", expectedPayTo: "0x2222222222222222222222222222222222222222", minGasReserveEth: "0" }, inputSchema: { type: "object", properties: { payerAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, serviceUrl: { type: "string", format: "uri" }, maxAmountUsdc: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,6})?$" }, expectedPayTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, minGasReserveEth: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,18})?$" } }, required: ["payerAddress", "serviceUrl", "maxAmountUsdc"] }, output: { example: { decision: "safe_to_sign", safeToSign: true, riskLevel: "low", quotedAmountUsdc: "0.01", quotedPayTo: "0x2222222222222222222222222222222222222222", network: "eip155:8453", asset: USDC, checks: [{ id: "x402_contract", status: "pass" }], alerts: [], recommendedAction: "Sign only the validated payment requirements." }, schema: { type: "object", properties: { decision: { type: "string" }, safeToSign: { type: "boolean" }, riskLevel: { type: "string" }, quotedAmountUsdc: { type: "string" }, quotedPayTo: { type: "string" }, network: { type: "string" }, asset: { type: "string" }, checks: { type: "array", items: { type: "object" } }, alerts: { type: "array", items: { type: "string" } }, recommendedAction: { type: "string" } }, required: ["decision", "safeToSign", "riskLevel", "quotedAmountUsdc", "quotedPayTo", "network", "asset", "checks", "alerts", "recommendedAction"] } } }) },
      },
    } });
  }
  return serverPromise;
}

const units = (value: string, decimals: number) => { const [w, f = ""] = value.split("."); return BigInt(w) * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, "0")); };
const format = (value: bigint, decimals: number) => { const raw = value.toString().padStart(decimals + 1, "0"); const fraction = raw.slice(-decimals).replace(/0+$/, ""); return fraction ? `${raw.slice(0, -decimals)}.${fraction}` : raw.slice(0, -decimals); };
async function rpc(method: string, params: unknown[]) { const r = await fetch("https://base-rpc.publicnode.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(8_000) }); const j = await r.json() as { result?: string }; if (!j.result) throw new Error("Base RPC failed"); return j.result; }

async function paidHandler(request: NextRequest) {
  const started = Date.now();
  let input: { payerAddress?: string; serviceUrl?: string; maxAmountUsdc?: string; expectedPayTo?: string; minGasReserveEth?: string };
  try { input = await request.json() as typeof input; } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input.payerAddress || !/^0x[a-fA-F0-9]{40}$/.test(input.payerAddress) || !input.serviceUrl || !input.maxAmountUsdc) return NextResponse.json({ error: "payerAddress, serviceUrl, and maxAmountUsdc are required." }, { status: 400 });
  if (input.expectedPayTo && !/^0x[a-fA-F0-9]{40}$/.test(input.expectedPayTo)) return NextResponse.json({ error: "expectedPayTo must be a valid EVM address." }, { status: 400 });
  let maxAtomic: bigint; let gasAtomic: bigint;
  try { parsePublicUrl(input.serviceUrl); maxAtomic = units(input.maxAmountUsdc, 6); gasAtomic = units(input.minGasReserveEth ?? "0", 18); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid input." }, { status: 400 }); }
  try {
    const payer = input.payerAddress.toLowerCase();
    const validationResponse = await fetch("https://api.cdp.coinbase.com/platform/v2/x402/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resource: input.serviceUrl, method: "POST" }), signal: AbortSignal.timeout(10_000) });
    const validation = await validationResponse.json() as { valid?: boolean; statusCode?: number; simulation?: { outcome?: string }; paymentRequirements?: { accepts?: Array<{ amount?: string; network?: string; asset?: string; payTo?: string }> } };
    const quote = validation.paymentRequirements?.accepts?.[0];
    const quotedAtomic = quote?.amount && /^\d+$/.test(quote.amount) ? BigInt(quote.amount) : 0n;
    const quotedPayTo = quote?.payTo?.toLowerCase() ?? "";
    const balanceData = `0x70a08231${payer.slice(2).padStart(64, "0")}`;
    const [usdcHex, ethHex, code] = await Promise.all([rpc("eth_call", [{ to: USDC, data: balanceData }, "latest"]), rpc("eth_getBalance", [payer, "latest"]), quotedPayTo ? rpc("eth_getCode", [quotedPayTo, "latest"]) : Promise.resolve("0x")]);
    const usdcBalance = BigInt(usdcHex); const ethBalance = BigInt(ethHex);
    const contractValid = validation.valid === true && validation.statusCode === 402 && validation.simulation?.outcome === "accepted";
    const base = quote?.network === "eip155:8453"; const asset = quote?.asset?.toLowerCase() === USDC.toLowerCase(); const withinLimit = quotedAtomic > 0n && quotedAtomic <= maxAtomic;
    const recipientMatches = !input.expectedPayTo || quotedPayTo === input.expectedPayTo.toLowerCase(); const notSelf = quotedPayTo !== payer; const funded = usdcBalance >= quotedAtomic; const gasReady = ethBalance >= gasAtomic;
    const checks = [
      { id: "x402_contract", status: contractValid ? "pass" : "fail" }, { id: "base_network", status: base ? "pass" : "fail" }, { id: "usdc_asset", status: asset ? "pass" : "fail" },
      { id: "price_ceiling", status: withinLimit ? "pass" : "fail" }, { id: "recipient", status: recipientMatches && notSelf && quotedPayTo ? (code === "0x" || code === "0x0" ? "pass" : "warn") : "fail" },
      { id: "buyer_funding", status: funded ? "pass" : "fail" }, { id: "gas_reserve", status: gasReady ? "pass" : "fail" },
    ];
    const failed = checks.some((c) => c.status === "fail"); const warned = checks.some((c) => c.status === "warn");
    const decision = failed ? (!funded || !gasReady ? "needs_funding" : "reject") : warned ? "review_recipient" : "safe_to_sign";
    const result = { decision, safeToSign: decision === "safe_to_sign", riskLevel: failed ? "high" : warned ? "medium" : "low", serviceUrl: input.serviceUrl, quotedAmountUsdc: format(quotedAtomic, 6), maxAmountUsdc: format(maxAtomic, 6), quotedPayTo, network: quote?.network ?? null, asset: quote?.asset ?? null, payerUsdc: format(usdcBalance, 6), payerEth: format(ethBalance, 18), destinationKind: code === "0x" || code === "0x0" ? "eoa" : "contract", checks, alerts: checks.filter((c) => c.status !== "pass").map((c) => `${c.id}: ${c.status}`), recommendedAction: decision === "safe_to_sign" ? "Sign only the validated payment requirements and do not exceed the quoted amount." : decision === "review_recipient" ? "Confirm the recipient contract before signing." : decision === "needs_funding" ? "Fund the buyer wallet before signing." : "Do not sign; the live x402 contract conflicts with the stated constraints.", observedAt: new Date().toISOString(), limitations: ["This validates public x402 metadata and current Base state; it cannot guarantee future service quality, recipient identity, legality, or contract behavior."] };
    try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/payment-guard", agentId: identity.agentId, amountUsd: 0.01, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: result.observedAt }).run(); } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { await recordServiceError(request, "/api/payment-guard", 502, started); return NextResponse.json({ error: error instanceof Error ? error.message : "Payment guard failed." }, { status: 502 }); }
}

export async function POST(request: NextRequest) { try { const response = await withX402FromHTTPServer(paidHandler, await getServer())(request); if (response.status === 402) { try { const identity = await identifyAgent(request); await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/payment-guard", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run(); } catch {} } return response; } catch { await recordServiceError(request, "/api/payment-guard", 503); return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 }); } }
export async function GET() { return NextResponse.json({ service: "x402 Payment Guard — Verify Before Signing", price: "$0.01 USDC", network: "Base", method: "POST", request: { payerAddress: "0x1111111111111111111111111111111111111111", serviceUrl: "https://example.com/api/report", maxAmountUsdc: "0.10", expectedPayTo: "0x2222222222222222222222222222222222222222", minGasReserveEth: "0" }, returns: ["safe-to-sign decision", "live x402 contract validation", "price and recipient checks", "buyer funding", "destination hazards"] }); }
