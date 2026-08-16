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
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
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
          serviceName: "Anyway Possible Base Payment Preflight",
          tags: ["payment preflight", "safe to pay", "agent treasury", "wallet readiness", "Base USDC", "destination check", "transaction safety", "Base gas reserve", "spend readiness", "autonomous payments"],
          iconUrl: "https://anywaypossible.com/favicon.svg",
          description: "Preflight a Base USDC payment before an AI agent signs it. Check live funding and gas, confirm Base chain intent, classify the destination as an EOA or contract, catch zero-address, token-contract, and self-payment hazards, and receive a machine-readable proceed, fund, review, or reject decision. No account or API key.",
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
                  address: "0x1111111111111111111111111111111111111111", destinationAddress: "0x2222222222222222222222222222222222222222", destinationKind: "eoa", network: "Base", chainId: 8453,
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
                    address: { type: "string" }, destinationAddress: { type: ["string", "null"] }, destinationKind: { type: "string", enum: ["not_provided", "eoa", "contract"] }, network: { type: "string" }, chainId: { type: "integer" },
                    status: { type: "string", enum: ["ready", "needs_usdc", "needs_gas", "needs_funding"] }, ready: { type: "boolean" },
                    safeToProceed: { type: "boolean" }, decision: { type: "string", enum: ["safe_to_pay", "needs_funding", "needs_gas", "review_destination", "reject"] }, riskLevel: { type: "string", enum: ["low", "medium", "high"] }, recommendedAction: { type: "string" },
                    eth: { type: "string" }, usdc: { type: "string" }, plannedSpendUsdc: { type: "string" }, minGasReserveEth: { type: "string" },
                    usdcShortfall: { type: "string" }, gasShortfallEth: { type: "string" }, paymentCapacity: { type: "object" },
                    checks: { type: "array", items: { type: "object" } }, alerts: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } }, blockNumber: { type: "integer" }, observedAt: { type: "string", format: "date-time" },
                  },
                  required: ["address", "destinationAddress", "destinationKind", "network", "chainId", "status", "ready", "safeToProceed", "decision", "riskLevel", "recommendedAction", "eth", "usdc", "plannedSpendUsdc", "minGasReserveEth", "usdcShortfall", "gasShortfallEth", "paymentCapacity", "checks", "alerts", "limitations", "blockNumber", "observedAt"],
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
  let input: { address?: string; destinationAddress?: string; plannedSpendUsdc?: string; minGasReserveEth?: string; expectedChainId?: number };
  try { input = await request.json() as typeof input; }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input.address || !/^0x[a-fA-F0-9]{40}$/.test(input.address)) {
    return NextResponse.json({ error: "address must be a valid 20-byte EVM address." }, { status: 400 });
  }
  if (input.destinationAddress && !/^0x[a-fA-F0-9]{40}$/.test(input.destinationAddress)) {
    return NextResponse.json({ error: "destinationAddress must be a valid 20-byte EVM address." }, { status: 400 });
  }
  if (input.expectedChainId !== undefined && input.expectedChainId !== 8453) {
    return NextResponse.json({ error: "expectedChainId must be 8453. This preflight service evaluates Base mainnet only." }, { status: 400 });
  }

  const plannedSpendUsdc = input.plannedSpendUsdc ?? "1.00";
  const minGasReserveEth = input.minGasReserveEth ?? "0.00005";
  let plannedAtomic: bigint;
  let gasReserveAtomic: bigint;
  try {
    plannedAtomic = parseUnits(plannedSpendUsdc, 6);
    gasReserveAtomic = parseUnits(minGasReserveEth, 18);
    if (plannedAtomic <= 0n) throw new Error("planned spend must be positive");
  } catch {
    return NextResponse.json({ error: "plannedSpendUsdc must be positive with at most 6 decimals; minGasReserveEth must be non-negative with at most 18 decimals." }, { status: 400 });
  }

  const started = Date.now();
  const address = input.address.toLowerCase();
  const destinationAddress = input.destinationAddress?.toLowerCase() ?? null;
  const balanceOfData = `0x70a08231${address.slice(2).padStart(64, "0")}`;
  try {
    const [ethHex, usdcHex, blockHex, chainHex, destinationCode] = await Promise.all([
      rpc("eth_getBalance", [address, "latest"]),
      rpc("eth_call", [{ to: BASE_USDC, data: balanceOfData }, "latest"]),
      rpc("eth_blockNumber", []),
      rpc("eth_chainId", []),
      destinationAddress ? rpc("eth_getCode", [destinationAddress, "latest"]) : Promise.resolve("0x"),
    ]);
    const chainId = Number(BigInt(chainHex));
    if (chainId !== 8453) throw new Error(`RPC returned unexpected chain ${chainId}`);
    const ethAtomic = BigInt(ethHex);
    const usdcAtomic = BigInt(usdcHex);
    const hasUsdc = usdcAtomic >= plannedAtomic;
    const hasGas = ethAtomic >= gasReserveAtomic;
    const ready = hasUsdc && hasGas;
    const status = ready ? "ready" : !hasUsdc && !hasGas ? "needs_funding" : !hasUsdc ? "needs_usdc" : "needs_gas";
    const destinationKind = !destinationAddress ? "not_provided" : destinationCode === "0x" || destinationCode === "0x0" ? "eoa" : "contract";
    const destinationIsZero = destinationAddress === ZERO_ADDRESS;
    const destinationIsTokenContract = destinationAddress === BASE_USDC.toLowerCase();
    const destinationIsSelf = destinationAddress === address;
    const destinationNeedsReview = !destinationAddress || destinationIsSelf || destinationKind === "contract";
    const decision = destinationIsZero || destinationIsTokenContract
      ? "reject"
      : !hasUsdc
        ? "needs_funding"
        : !hasGas
          ? "needs_gas"
          : destinationNeedsReview
            ? "review_destination"
            : "safe_to_pay";
    const safeToProceed = decision === "safe_to_pay";
    const riskLevel = decision === "reject" ? "high" : safeToProceed ? "low" : "medium";
    const recommendedAction = decision === "reject"
      ? "Do not submit this payment. Correct the destination address first."
      : decision === "needs_funding"
        ? `Fund the wallet with at least ${formatUnits(shortfall(usdcAtomic, plannedAtomic), 6)} USDC${!hasGas ? ` and ${formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18)} ETH` : ""} before paying.`
        : decision === "needs_gas"
          ? `Add at least ${formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18)} ETH to meet the requested gas reserve.`
          : !destinationAddress
            ? "Provide destinationAddress for a transaction-level decision. Wallet funding is sufficient."
            : destinationIsSelf
              ? "Confirm that a self-payment is intentional before signing."
              : destinationKind === "contract"
                ? "Confirm that the destination contract is intended and accepts direct USDC transfers before signing."
                : "Funding, network, and basic destination checks passed. The agent may proceed within the stated amount.";
    const checks = [
      { id: "network", status: "pass", message: "Base mainnet chain ID 8453 confirmed." },
      { id: "usdc_funding", status: hasUsdc ? "pass" : "fail", message: hasUsdc ? "USDC covers the planned spend." : "USDC is below the planned spend." },
      { id: "gas_reserve", status: hasGas ? "pass" : "fail", message: hasGas ? "ETH meets the requested gas reserve." : "ETH is below the requested gas reserve." },
      { id: "destination", status: !destinationAddress ? "warn" : destinationIsZero || destinationIsTokenContract ? "fail" : destinationIsSelf || destinationKind === "contract" ? "warn" : "pass", message: !destinationAddress ? "No destination supplied; transaction-level hazards were not evaluated." : destinationIsZero ? "Destination is the zero address." : destinationIsTokenContract ? "Destination is the USDC token contract, not a payment recipient." : destinationIsSelf ? "Destination matches the paying wallet." : destinationKind === "contract" ? "Destination contains deployed contract code." : "Destination is a syntactically valid externally owned account." },
    ];
    const alerts = [
      ...(!hasUsdc ? ["USDC balance is below the planned spend."] : []),
      ...(!hasGas ? ["ETH balance is below the requested gas reserve."] : []),
      ...(destinationIsZero ? ["Zero-address destination would make funds unrecoverable."] : []),
      ...(destinationIsTokenContract ? ["Sending USDC directly to the token contract can make funds unrecoverable."] : []),
      ...(destinationIsSelf ? ["Destination equals the paying wallet."] : []),
      ...(destinationKind === "contract" ? ["Contract destination requires caller confirmation."] : []),
      ...(!destinationAddress ? ["Destination was not checked."] : []),
    ];
    const observedAt = new Date().toISOString();
    const result = {
      address, destinationAddress, destinationKind, network: "Base", chainId, status, ready, safeToProceed, decision, riskLevel, recommendedAction,
      eth: formatUnits(ethAtomic, 18), usdc: formatUnits(usdcAtomic, 6),
      plannedSpendUsdc: formatUnits(plannedAtomic, 6), minGasReserveEth: formatUnits(gasReserveAtomic, 18),
      usdcShortfall: formatUnits(shortfall(usdcAtomic, plannedAtomic), 6),
      gasShortfallEth: formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18),
      paymentCapacity: {
        at0_001: (usdcAtomic / 1_000n).toString(), at0_01: (usdcAtomic / 10_000n).toString(),
        at0_05: (usdcAtomic / 50_000n).toString(), at0_10: (usdcAtomic / 100_000n).toString(),
      },
      checks, alerts,
      recommendedNext: {
        endpoint: "https://anywaypossible.com/api/payment-guard",
        priceUsd: 0.01,
        when: "Before signing an x402 purchase, validate the live challenge against this wallet, intended recipient, and price ceiling.",
        request: { payerAddress: address, serviceUrl: "https://merchant.example/api/product", maxAmountUsdc: formatUnits(plannedAtomic, 6), ...(destinationAddress ? { expectedPayTo: destinationAddress } : {}), minGasReserveEth: formatUnits(gasReserveAtomic, 18) },
      },
      limitations: ["This preflight checks onchain state and basic destination hazards; it does not guarantee recipient identity, legality, sanctions status, contract behavior, or future settlement success."],
      usdcContract: BASE_USDC, blockNumber: Number(BigInt(blockHex)), observedAt,
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
    service: "Anyway Possible Base Payment Preflight", price: "$0.02 USDC", network: "Base (eip155:8453)", method: "POST",
    request: { address: "0x1111111111111111111111111111111111111111", destinationAddress: "0x2222222222222222222222222222222222222222", plannedSpendUsdc: "1.00", minGasReserveEth: "0.00005", expectedChainId: 8453 },
    returns: ["safe-to-proceed decision", "destination classification", "basic payment hazards", "treasury readiness", "exact funding shortfalls", "x402 payment capacity", "prefilled Payment Guard request"],
  });
}
