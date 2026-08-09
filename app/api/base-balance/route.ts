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
const BASE_RPC = "https://mainnet.base.org";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
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
        "POST /api/base-balance": {
          accepts: { scheme: "exact", price: "$0.001", network: "eip155:8453", payTo: PAY_TO, maxTimeoutSeconds: 60 },
          serviceName: "Anyway Possible Base Wallet Balance",
          tags: ["base", "wallet balance", "usdc balance", "eth balance", "onchain data", "agent treasury"],
          iconUrl: "https://anywaypossible.com/favicon.svg",
          description: "Live Base wallet balance for AI agents. Returns native ETH and Circle USDC balances, atomic values, block height, contract address, and observation time for any EVM address. Use before an autonomous payment or transaction. No API key.",
          extensions: {
            ...declareDiscoveryExtension({
              method: "POST",
              bodyType: "json",
              input: { address: "0x0000000000000000000000000000000000000000" },
              inputSchema: {
                type: "object",
                properties: { address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", description: "EVM wallet address on Base" } },
                required: ["address"],
              },
              output: {
                example: { address: "0x0000000000000000000000000000000000000000", network: "Base", chainId: 8453, eth: "0", usdc: "0", blockNumber: 12345678, observedAt: "2026-01-01T00:00:00.000Z" },
                schema: {
                  type: "object",
                  properties: {
                    address: { type: "string" }, network: { type: "string" }, chainId: { type: "integer" },
                    eth: { type: "string" }, usdc: { type: "string" }, ethAtomic: { type: "string" },
                    usdcAtomic: { type: "string" }, blockNumber: { type: "integer" }, observedAt: { type: "string", format: "date-time" },
                  },
                  required: ["address", "network", "chainId", "eth", "usdc", "ethAtomic", "usdcAtomic", "blockNumber", "observedAt"],
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
  const response = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Base RPC returned HTTP ${response.status}.`);
  const payload = await response.json() as { result?: string; error?: { message?: string } };
  if (!payload.result) throw new Error(payload.error?.message ?? "Base RPC returned no result.");
  return payload.result;
}

function formatUnits(value: bigint, decimals: number) {
  const raw = value.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals);
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

async function paidHandler(request: NextRequest) {
  let input: { address?: string };
  try { input = await request.json() as { address?: string }; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input.address || !/^0x[a-fA-F0-9]{40}$/.test(input.address)) {
    return NextResponse.json({ error: "address must be a valid 20-byte EVM address." }, { status: 400 });
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
    const observedAt = new Date().toISOString();
    const result = { address, network: "Base", chainId: 8453, eth: formatUnits(ethAtomic, 18), usdc: formatUnits(usdcAtomic, 6), ethAtomic: ethAtomic.toString(), usdcAtomic: usdcAtomic.toString(), usdcContract: BASE_USDC, blockNumber: Number(BigInt(blockHex)), observedAt };
    try {
      const identity = await identifyAgent(request);
      await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/base-balance", agentId: identity.agentId, amountUsd: 0.001, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: observedAt }).run();
    } catch {}
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Base balance lookup failed." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await withX402FromHTTPServer(paidHandler, await getServer())(request);
    if (response.status === 402) {
      try {
        const identity = await identifyAgent(request);
        await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/base-balance", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run();
      } catch {}
    }
    return response;
  } catch (error) {
    console.error("x402 initialization failed", error);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({ service: "Anyway Possible Base Wallet Balance", price: "$0.001 USDC", network: "Base (eip155:8453)", method: "POST", request: { address: "0x0000000000000000000000000000000000000000" }, returns: ["ETH balance", "USDC balance", "block height", "observation time"] });
}
