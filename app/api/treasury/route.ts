import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent, recordPaymentChallenge, recordServiceError } from "../../../lib/analytics";
import { createTreasuryPreflight, type TreasuryInput } from "../../../lib/treasury";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
let serverPromise: Promise<X402Server> | undefined;

function getServer() {
  if (!serverPromise) {
    const runtimeEnv = env as unknown as Record<string, string | undefined>;
    serverPromise = createX402Server({
      apiKeyId: runtimeEnv.CDP_API_KEY_ID,
      apiKeySecret: runtimeEnv.CDP_API_KEY_SECRET,
      environment: "production",
      payToConfig: { type: "address", evm: PAY_TO },
      builderCode: "anyway_possible",
      routes: {
        "POST /api/treasury": {
          accepts: { scheme: "exact", price: "$0.02", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
          serviceName: "Anyway Possible Base Payment Preflight",
          tags: ["payment preflight", "safe to pay", "agent treasury", "wallet readiness", "Base USDC balance", "USDC spend readiness", "destination check", "transaction safety", "Base gas reserve", "autonomous payments"],
          iconUrl: "https://anywaypossible.com/favicon.png",
          description: "Preflight a Base USDC payment before an AI agent signs it. Check live ETH and USDC balance, spending capacity, gas, Base chain intent, and recipient type; catch zero-address, token-contract, and self-payment hazards; then receive a machine-readable proceed, fund, review, or reject decision plus the next Payment Guard request. No account or API key.",
          extensions: {
            ...declareDiscoveryExtension({
              method: "POST",
              bodyType: "json",
              input: { address: "0x1111111111111111111111111111111111111111", destinationAddress: "0x2222222222222222222222222222222222222222", plannedSpendUsdc: "1.00", minGasReserveEth: "0.00005", expectedChainId: 8453 },
              inputSchema: {
                type: "object",
                properties: {
                  address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "EVM wallet address on Base" },
                  destinationAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "Optional intended payment recipient on Base; enables destination hazard checks" },
                  plannedSpendUsdc: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,6})?$", description: "USDC amount the agent plans to spend; defaults to 1.00" },
                  minGasReserveEth: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,18})?$", description: "Minimum ETH gas reserve; defaults to 0.00005" },
                  expectedChainId: { type: "integer", enum: [8453], description: "Expected destination chain. This service only approves Base mainnet (8453)." },
                },
                required: ["address"],
              },
              output: {
                example: {
                  receiptId: "f06d5e...", address: "0x1111111111111111111111111111111111111111", destinationAddress: "0x2222222222222222222222222222222222222222", destinationKind: "eoa", network: "Base", chainId: 8453,
                  status: "needs_funding", ready: false, safeToProceed: false, decision: "needs_funding", riskLevel: "medium", recommendedAction: "Fund the wallet with at least 1 USDC and 0.00005 ETH before paying.", eth: "0", usdc: "0", plannedSpendUsdc: "1",
                  minGasReserveEth: "0.00005", usdcShortfall: "1", gasShortfallEth: "0.00005", checks: [{ id: "network", status: "pass", message: "Base mainnet confirmed." }],
                  paymentCapacity: { at0_001: "0", at0_01: "0", at0_05: "0", at0_10: "0" },
                  alerts: ["USDC balance is below the planned spend.", "ETH balance is below the requested gas reserve."],
                  limitations: ["Onchain state and basic destination hazards only; recipient identity and contract behavior are not guaranteed."],
                  blockNumber: 12345678, observedAt: "2026-01-01T00:00:00.000Z",
                },
                schema: {
                  type: "object",
                  properties: {
                    receiptId: { type: "string", description: "SHA-256 identifier for this timestamped preflight result" }, address: { type: "string" }, destinationAddress: { type: ["string", "null"] }, destinationKind: { type: "string", enum: ["not_provided", "eoa", "contract"] }, network: { type: "string" }, chainId: { type: "integer" },
                    status: { type: "string", enum: ["ready", "needs_usdc", "needs_gas", "needs_funding"] }, ready: { type: "boolean" },
                    safeToProceed: { type: "boolean" }, decision: { type: "string", enum: ["safe_to_pay", "needs_funding", "needs_gas", "review_destination", "reject"] }, riskLevel: { type: "string", enum: ["low", "medium", "high"] }, recommendedAction: { type: "string" },
                    eth: { type: "string" }, usdc: { type: "string" }, plannedSpendUsdc: { type: "string" }, minGasReserveEth: { type: "string" },
                    usdcShortfall: { type: "string" }, gasShortfallEth: { type: "string" }, paymentCapacity: { type: "object" },
                    checks: { type: "array", items: { type: "object" } }, alerts: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } }, blockNumber: { type: "integer" }, observedAt: { type: "string", format: "date-time" },
                  },
                  required: ["receiptId", "address", "destinationAddress", "destinationKind", "network", "chainId", "status", "ready", "safeToProceed", "decision", "riskLevel", "recommendedAction", "eth", "usdc", "plannedSpendUsdc", "minGasReserveEth", "usdcShortfall", "gasShortfallEth", "paymentCapacity", "checks", "alerts", "limitations", "blockNumber", "observedAt"],
                },
              },
            }),
          },
        },
      },
    });
  }
  return serverPromise;
}

async function paidHandler(request: NextRequest) {
  let input: TreasuryInput;
  try { input = await request.json() as typeof input; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const started = Date.now();
  try {
    const result = await createTreasuryPreflight(input);
    try {
      const identity = await identifyAgent(request);
      await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/treasury", agentId: identity.agentId, clientType: identity.clientType, amountUsd: 0.02, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: result.observedAt }).run();
    } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Treasury readiness lookup failed", error);
    await recordServiceError(request, "/api/treasury", 502, started);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Treasury readiness lookup failed." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await withX402FromHTTPServer(paidHandler, await getServer())(request);
    if (response.status === 402) {
      await recordPaymentChallenge(request, "/api/treasury");
    }
    return response;
  } catch (error) {
    console.error("x402 initialization failed", error);
    await recordServiceError(request, "/api/treasury", 503);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Anyway Possible Base Payment Preflight", price: "$0.02 USDC", network: "Base (eip155:8453)", method: "POST",
    request: { address: "0x1111111111111111111111111111111111111111", destinationAddress: "0x2222222222222222222222222222222222222222", plannedSpendUsdc: "1.00", minGasReserveEth: "0.00005", expectedChainId: 8453 },
    returns: ["stable receipt ID", "safe-to-proceed decision", "destination classification", "basic payment hazards", "treasury readiness", "exact funding shortfalls", "x402 payment capacity", "prefilled Payment Guard request"],
  });
}
