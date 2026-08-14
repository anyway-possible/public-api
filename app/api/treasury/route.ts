import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent } from "../../../lib/analytics";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_RPCS = [
  "https://base-rpc.publicnode.com",
  "https://base-mainnet.public.blastapi.io",
  "https://base.drpc.org",
  "https://mainnet.base.org",
] as const;
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
          serviceName: "Anyway Possible Base Wallet Readiness",
          tags: ["agent treasury", "wallet readiness", "wallet health", "wallet monitoring", "Base wallet", "USDC balance", "Base gas reserve", "spend readiness", "autonomous payments", "onchain data"],
          iconUrl: "https://anywaypossible.com/favicon.svg",
          description: "Base wallet readiness and gas-reserve check for AI agent treasuries. Before an autonomous payment, compare live ETH and Circle USDC balances with a planned spend, receive exact funding shortfalls, and calculate remaining x402 payment capacity. No account or API key.",
          extensions: {
            ...declareDiscoveryExtension({
              method: "POST",
              bodyType: "json",
              input: { address: "0x0000000000000000000000000000000000000000", plannedSpendUsdc: "1.00", minGasReserveEth: "0.00005" },
              inputSchema: {
                type: "object",
                properties: {
                  address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "EVM wallet address on Base" },
                  plannedSpendUsdc: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,6})?$", description: "USDC amount the agent plans to spend; defaults to 1.00" },
                  minGasReserveEth: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,18})?$", description: "Minimum ETH gas reserve; defaults to 0.00005" },
                },
                required: ["address"],
              },
              output: {
                example: {
                  address: "0x0000000000000000000000000000000000000000", network: "Base", chainId: 8453,
                  status: "needs_funding", ready: false, eth: "0", usdc: "0", plannedSpendUsdc: "1",
                  minGasReserveEth: "0.00005", usdcShortfall: "1", gasShortfallEth: "0.00005",
                  paymentCapacity: { at0_001: "0", at0_01: "0", at0_05: "0", at0_10: "0" },
                  alerts: ["USDC balance is below the planned spend.", "ETH balance is below the requested gas reserve."],
                  blockNumber: 12345678, observedAt: "2026-01-01T00:00:00.000Z",
                },
                schema: {
                  type: "object",
                  properties: {
                    address: { type: "string" }, network: { type: "string" }, chainId: { type: "integer" },
                    status: { type: "string", enum: ["ready", "needs_usdc", "needs_gas", "needs_funding"] }, ready: { type: "boolean" },
                    eth: { type: "string" }, usdc: { type: "string" }, plannedSpendUsdc: { type: "string" }, minGasReserveEth: { type: "string" },
                    usdcShortfall: { type: "string" }, gasShortfallEth: { type: "string" }, paymentCapacity: { type: "object" },
                    alerts: { type: "array", items: { type: "string" } }, blockNumber: { type: "integer" }, observedAt: { type: "string", format: "date-time" },
                  },
                  required: ["address", "network", "chainId", "status", "ready", "eth", "usdc", "plannedSpendUsdc", "minGasReserveEth", "usdcShortfall", "gasShortfallEth", "paymentCapacity", "alerts", "blockNumber", "observedAt"],
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

async function rpc(method: string, params: unknown[]) {
  let lastError = "No Base RPC endpoint responded.";
  for (const endpoint of BASE_RPCS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { result?: string; error?: { message?: string } };
      if (!payload.result) throw new Error(payload.error?.message ?? "missing result");
      return payload.result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown upstream error";
    }
  }
  throw new Error(`Base RPC unavailable: ${lastError}`);
}

function parseUnits(value: string, decimals: number) {
  if (!new RegExp(`^[0-9]+(?:\\.[0-9]{1,${decimals}})?$`).test(value)) throw new Error("invalid decimal amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
}

function formatUnits(value: bigint, decimals: number) {
  const raw = value.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals);
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortfall(balance: bigint, requirement: bigint) {
  return requirement > balance ? requirement - balance : 0n;
}

async function paidHandler(request: NextRequest) {
  let input: { address?: string; plannedSpendUsdc?: string; minGasReserveEth?: string };
  try { input = await request.json() as typeof input; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input.address || !/^0x[a-fA-F0-9]{40}$/.test(input.address)) {
    return NextResponse.json({ error: "address must be a valid 20-byte EVM address." }, { status: 400 });
  }

  const plannedSpendUsdc = input.plannedSpendUsdc ?? "1.00";
  const minGasReserveEth = input.minGasReserveEth ?? "0.00005";
  let plannedAtomic: bigint;
  let gasReserveAtomic: bigint;
  try {
    plannedAtomic = parseUnits(plannedSpendUsdc, 6);
    gasReserveAtomic = parseUnits(minGasReserveEth, 18);
  } catch {
    return NextResponse.json({ error: "plannedSpendUsdc supports 6 decimals and minGasReserveEth supports 18 decimals; both must be non-negative decimal strings." }, { status: 400 });
  }

  const started = Date.now();
  const address = input.address.toLowerCase();
  const balanceOfData = `0x70a08231${address.slice(2).padStart(64, "0")}`;
  try {
    const [ethHex, usdcHex, blockHex] = await Promise.all([
      rpc("eth_getBalance", [address, "latest"]),
      rpc("eth_call", [{ to: BASE_USDC, data: balanceOfData }, "latest"]),
      rpc("eth_blockNumber", []),
    ]);
    const ethAtomic = BigInt(ethHex);
    const usdcAtomic = BigInt(usdcHex);
    const hasUsdc = usdcAtomic >= plannedAtomic;
    const hasGas = ethAtomic >= gasReserveAtomic;
    const ready = hasUsdc && hasGas;
    const status = ready ? "ready" : !hasUsdc && !hasGas ? "needs_funding" : !hasUsdc ? "needs_usdc" : "needs_gas";
    const alerts = [
      ...(!hasUsdc ? ["USDC balance is below the planned spend."] : []),
      ...(!hasGas ? ["ETH balance is below the requested gas reserve."] : []),
    ];
    const observedAt = new Date().toISOString();
    const result = {
      address, network: "Base", chainId: 8453, status, ready,
      eth: formatUnits(ethAtomic, 18), usdc: formatUnits(usdcAtomic, 6),
      plannedSpendUsdc: formatUnits(plannedAtomic, 6), minGasReserveEth: formatUnits(gasReserveAtomic, 18),
      usdcShortfall: formatUnits(shortfall(usdcAtomic, plannedAtomic), 6),
      gasShortfallEth: formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18),
      paymentCapacity: {
        at0_001: (usdcAtomic / 1_000n).toString(), at0_01: (usdcAtomic / 10_000n).toString(),
        at0_05: (usdcAtomic / 50_000n).toString(), at0_10: (usdcAtomic / 100_000n).toString(),
      },
      alerts, usdcContract: BASE_USDC, blockNumber: Number(BigInt(blockHex)), observedAt,
    };
    try {
      const identity = await identifyAgent(request);
      await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/treasury", agentId: identity.agentId, amountUsd: 0.02, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: observedAt }).run();
    } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Treasury readiness lookup failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Treasury readiness lookup failed." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await withX402FromHTTPServer(paidHandler, await getServer())(request);
    if (response.status === 402) {
      try {
        const identity = await identifyAgent(request);
        await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/treasury", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run();
      } catch {}
    }
    return response;
  } catch (error) {
    console.error("x402 initialization failed", error);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Anyway Possible Base Wallet Readiness", price: "$0.02 USDC", network: "Base (eip155:8453)", method: "POST",
    request: { address: "0x0000000000000000000000000000000000000000", plannedSpendUsdc: "1.00", minGasReserveEth: "0.00005" },
    returns: ["treasury readiness", "ETH gas reserve", "USDC spend capacity", "exact shortfalls", "x402 payment capacity"],
  });
}
