import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
import { x402ResourceServer } from "@x402/core/server";
import type { PaymentPayload, SettleResponse } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { createPaymentWrapper, type MCPToolCallback, type PaymentWrappedHandler } from "@x402/mcp";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getDb } from "../db";
import { events } from "../db/schema";
import { createMerchantSnapshot } from "./merchant-snapshot";
import { auditMerchant } from "./merchant-audit";
import { readBaseBalance } from "./base-balance";
import { evaluatePaymentGuard } from "./payment-guard";
import { createTreasuryPreflight } from "./treasury";
import { checkUrl, verifyUrl } from "./verification";
import { hasPaymentHeader, recordMcpEvent } from "./mcp-analytics";

const PAY_TO = "0xe5690D37805107C56f6195E65A262b234E0E5e75" as const;
const NETWORK = "eip155:8453" as const;
const SELF_TEST_PAYER = "0x44d2dc46f987d1f2fa55e281934addd193a1a377";
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Expected a 20-byte EVM address");

type PaidTool = ReturnType<typeof createPaymentWrapper>;
type ToolSet = {
  merchantSnapshot: PaidTool;
  merchantAudit: PaidTool;
  treasuryPreflight: PaidTool;
  paymentGuard: PaidTool;
  baseBalance: PaidTool;
  urlCheck: PaidTool;
  verifyEvidence: PaidTool;
  batchCheck: PaidTool;
};

let toolSetPromise: Promise<ToolSet> | undefined;

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function payerFromPayload(paymentPayload: PaymentPayload) {
  const payment = paymentPayload as PaymentPayload & {
    payer?: string;
    payload?: { authorization?: { from?: string }; owner?: string };
  };
  return (payment.payer ?? payment.payload?.authorization?.from ?? payment.payload?.owner ?? "mcp:unknown").toLowerCase();
}

async function shortAgentId(source: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function recordSettlement(endpoint: string, amountUsd: number, paymentPayload: PaymentPayload, settlement: SettleResponse) {
  try {
    const payer = payerFromPayload(paymentPayload);
    const transaction = (settlement as SettleResponse & { transaction?: string }).transaction ?? null;
    await getDb().insert(events).values({
      eventId: crypto.randomUUID(),
      kind: payer === SELF_TEST_PAYER ? "test_call" : "paid_call",
      endpoint,
      agentId: await shortAgentId(payer),
      clientType: "agent_sdk",
      amountUsd,
      costUsd: 0,
      statusCode: 200,
      transactionHash: transaction,
      network: NETWORK,
      occurredAt: new Date().toISOString(),
    }).run();
  } catch {
    // Paid MCP results remain available if analytics storage is temporarily unavailable.
  }
}

async function getToolSet() {
  if (!toolSetPromise) {
    toolSetPromise = (async () => {
      const runtimeEnv = env as unknown as Record<string, string | undefined>;
      const resourceServer = new x402ResourceServer(createCdpFacilitatorClient({
        apiKeyId: runtimeEnv.CDP_API_KEY_ID,
        apiKeySecret: runtimeEnv.CDP_API_KEY_SECRET,
      }));
      resourceServer.register(NETWORK, new ExactEvmScheme());
      resourceServer.registerExtension(bazaarResourceServerExtension);
      await resourceServer.initialize();

      async function wrapper(config: {
        toolName: string;
        price: string;
        description: string;
        serviceName: string;
        tags: string[];
        inputSchema: Record<string, unknown>;
        example: Record<string, unknown>;
        outputExample: unknown;
        endpoint: string;
        amountUsd: number;
      }) {
        const accepts = await resourceServer.buildPaymentRequirements({
          scheme: "exact",
          network: NETWORK,
          payTo: PAY_TO,
          price: config.price,
          maxTimeoutSeconds: 300,
          extra: { name: "USDC", version: "2" },
        });
        return createPaymentWrapper(resourceServer, {
          accepts,
          resource: {
            url: `mcp://tool/${config.toolName}`,
            description: config.description,
            mimeType: "application/json",
            serviceName: config.serviceName,
            tags: config.tags,
            iconUrl: "https://anywaypossible.com/favicon.png",
          },
          extensions: declareDiscoveryExtension({
            toolName: config.toolName,
            description: config.description,
            transport: "streamable-http",
            inputSchema: config.inputSchema,
            example: config.example,
            output: { example: config.outputExample },
          }),
          hooks: {
            onAfterSettlement: ({ paymentPayload, settlement }) => recordSettlement(config.endpoint, config.amountUsd, paymentPayload, settlement),
          },
        });
      }

      return {
        merchantSnapshot: await wrapper({
          toolName: "merchant_snapshot",
          price: "$0.05",
          amountUsd: 0.05,
          endpoint: "/api/mcp#merchant_snapshot",
          serviceName: "Anyway Possible x402 Merchant Snapshot",
          description: "Diagnose why an x402 API is not selling using Bazaar visibility, buyer signals, payment reliability, and observed Base USDC activity.",
          tags: ["x402 merchant analytics", "x402 seller intelligence", "Bazaar visibility", "agent revenue"],
          inputSchema: { type: "object", properties: { payTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, queries: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 2, maxLength: 100 } }, excludePayers: { type: "array", maxItems: 10, items: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } } }, required: ["payTo", "queries"] },
          example: { payTo: PAY_TO, queries: ["x402 merchant analytics", "increase x402 revenue"] },
          outputExample: { score: 86, grade: "B", biggestIssue: "Improve buyer-search visibility." },
        }),
        merchantAudit: await wrapper({
          toolName: "merchant_audit",
          price: "$0.25",
          amountUsd: 0.25,
          endpoint: "/api/mcp#merchant_audit",
          serviceName: "Anyway Possible x402 Merchant Audit",
          description: "Audit an x402 merchant's listings, semantic rank, competitor prices, payment reliability, buyer reach, and observed Base USDC activity, then return prioritized revenue fixes.",
          tags: ["x402 revenue audit", "merchant intelligence", "competitor pricing", "Bazaar ranking"],
          inputSchema: { type: "object", properties: { payTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, queries: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 2, maxLength: 100 } }, excludePayers: { type: "array", maxItems: 10, items: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } } }, required: ["payTo", "queries"] },
          example: { payTo: PAY_TO, queries: ["x402 merchant analytics", "agent treasury"] },
          outputExample: { score: 72, grade: "C", actions: ["Improve exact buyer-search language in listing metadata."] },
        }),
        treasuryPreflight: await wrapper({
          toolName: "treasury_preflight",
          price: "$0.02",
          amountUsd: 0.02,
          endpoint: "/api/mcp#treasury_preflight",
          serviceName: "Anyway Possible Base Payment Preflight",
          description: "Check Base ETH and USDC funding, gas, chain intent, destination type, and common payment hazards before an agent signs.",
          tags: ["Base USDC", "payment preflight", "agent treasury", "wallet readiness"],
          inputSchema: { type: "object", properties: { address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, destinationAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, plannedSpendUsdc: { type: "string" }, minGasReserveEth: { type: "string" }, expectedChainId: { type: "integer", enum: [8453] } }, required: ["address"] },
          example: { address: PAY_TO, plannedSpendUsdc: "0.05", expectedChainId: 8453 },
          outputExample: { decision: "safe_to_pay", safeToProceed: true, network: "Base" },
        }),
        paymentGuard: await wrapper({
          toolName: "payment_guard",
          price: "$0.01",
          amountUsd: 0.01,
          endpoint: "/api/mcp#payment_guard",
          serviceName: "Anyway Possible x402 Payment Guard",
          description: "Validate a live x402 challenge, Base network, USDC asset, recipient, price ceiling, buyer funding, gas reserve, and destination hazards immediately before signing.",
          tags: ["x402 payment safety", "verify before paying", "agent transaction guard", "Base USDC"],
          inputSchema: { type: "object", properties: { payerAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, serviceUrl: { type: "string", format: "uri" }, maxAmountUsdc: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,6})?$" }, expectedPayTo: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, minGasReserveEth: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,18})?$" } }, required: ["payerAddress", "serviceUrl", "maxAmountUsdc"] },
          example: { payerAddress: PAY_TO, serviceUrl: "https://example.com/api/report", maxAmountUsdc: "0.10" },
          outputExample: { decision: "safe_to_sign", safeToSign: true, riskLevel: "low" },
        }),
        baseBalance: await wrapper({
          toolName: "base_balance",
          price: "$0.001",
          amountUsd: 0.001,
          endpoint: "/api/mcp#base_balance",
          serviceName: "Anyway Possible Base Wallet Balance",
          description: "Read native ETH and Circle USDC balances, atomic values, and current block height for a Base wallet.",
          tags: ["Base", "wallet balance", "USDC balance", "onchain data"],
          inputSchema: { type: "object", properties: { address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, required: ["address"] },
          example: { address: PAY_TO },
          outputExample: { address: PAY_TO, network: "Base", chainId: 8453, eth: "0.001", usdc: "1.00" },
        }),
        urlCheck: await wrapper({
          toolName: "check_url",
          price: "$0.001",
          amountUsd: 0.001,
          endpoint: "/api/mcp#check_url",
          serviceName: "Anyway Possible URL Check",
          description: "Check one public URL's reachability, HTTP status, latency, redirects, and content type before using it.",
          tags: ["URL check", "uptime", "website health", "agent preflight"],
          inputSchema: { type: "object", properties: { url: { type: "string", format: "uri" }, expectedStatus: { type: "integer", minimum: 100, maximum: 599 } }, required: ["url"] },
          example: { url: "https://example.com", expectedStatus: 200 },
          outputExample: { reachable: true, verified: true, status: 200, contentType: "text/html" },
        }),
        verifyEvidence: await wrapper({
          toolName: "verify_web_evidence",
          price: "$0.01",
          amountUsd: 0.01,
          endpoint: "/api/mcp#verify_web_evidence",
          serviceName: "Anyway Possible Web Evidence",
          description: "Verify one public URL and return timestamped status, redirects, metadata, content hash, and a receipt for agent decisions and citations.",
          tags: ["web evidence", "citation verification", "content hash", "source validation"],
          inputSchema: { type: "object", properties: { url: { type: "string", format: "uri" }, expectedStatus: { type: "integer", minimum: 100, maximum: 599 }, expectedText: { type: "string", maxLength: 500 } }, required: ["url"] },
          example: { url: "https://example.com", expectedStatus: 200, expectedText: "Example Domain" },
          outputExample: { verified: true, status: 200, contentSha256: "6f5635...", receiptId: "f06d5e..." },
        }),
        batchCheck: await wrapper({
          toolName: "batch_check_urls",
          price: "$0.01",
          amountUsd: 0.01,
          endpoint: "/api/mcp#batch_check_urls",
          serviceName: "Anyway Possible Batch URL Validator",
          description: "Check up to ten public URLs in one paid call; partial failures remain isolated and each result includes status, latency, redirects, and content type.",
          tags: ["batch URL check", "citation validation", "link checker", "API monitoring"],
          inputSchema: { type: "object", properties: { urls: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", format: "uri" } }, expectedStatus: { type: "integer", minimum: 100, maximum: 599 } }, required: ["urls"] },
          example: { urls: ["https://example.com", "https://www.iana.org/help/example-domains"], expectedStatus: 200 },
          outputExample: { verified: true, count: 2, results: [{ status: 200, verified: true }] },
        }),
      };
    })();
  }
  return toolSetPromise;
}

function paidTool<TArgs extends Record<string, unknown>>(
  tool: keyof ToolSet,
  handler: PaymentWrappedHandler<TArgs>,
): MCPToolCallback<TArgs> {
  return async (args, extra) => {
    const requestHeaders = (extra as { requestInfo?: { headers?: Record<string, string | string[] | undefined> } })?.requestInfo?.headers ?? {};
    const toolNames: Record<keyof ToolSet, string> = {
      merchantSnapshot: "merchant_snapshot",
      merchantAudit: "merchant_audit",
      treasuryPreflight: "treasury_preflight",
      paymentGuard: "payment_guard",
      baseBalance: "base_balance",
      urlCheck: "check_url",
      verifyEvidence: "verify_web_evidence",
      batchCheck: "batch_check_urls",
    };
    const endpoint = `/api/mcp#${toolNames[tool]}`;
    const paymentAttempted = hasPaymentHeader(requestHeaders);
    await recordMcpEvent("mcp_tool_call", endpoint, requestHeaders, 200);
    if (paymentAttempted) await recordMcpEvent("mcp_payment_attempt", endpoint, requestHeaders, 0);
    const paid = await getToolSet();
    const result = await paid[tool](handler)(args, extra);
    const structured = result.structuredContent as { x402Version?: number; error?: string } | undefined;
    if (result.isError && structured?.x402Version === 2 && structured.error === "Payment required to access this tool") {
      await recordMcpEvent("mcp_payment_challenge", endpoint, requestHeaders, 402);
    } else if (result.isError && paymentAttempted) {
      await recordMcpEvent("mcp_payment_failure", endpoint, requestHeaders, 400);
    }
    return result;
  };
}

export async function createMcpServer() {
  const server = new McpServer({
    name: "Anyway Possible",
    version: "1.2.0",
    title: "Anyway Possible Paid Agent Utilities",
    description: "Eight account-free x402 tools for merchant intelligence, Base payment readiness, payment safety, URL checks, and verifiable web evidence.",
    websiteUrl: "https://anywaypossible.com",
  });

  server.registerTool("merchant_snapshot", {
    title: "x402 Merchant Snapshot ($0.05 USDC)",
    description: "Score an x402 merchant's discovery, reliability, buyer signals, and observed Base USDC activity, then identify the largest revenue issue.",
    inputSchema: { payTo: addressSchema, queries: z.array(z.string().min(2).max(100)).min(1).max(3), excludePayers: z.array(addressSchema).max(10).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("merchantSnapshot", async (args) => jsonResult(await createMerchantSnapshot(args as { payTo: string; queries: string[]; excludePayers?: string[] }))));

  server.registerTool("merchant_audit", {
    title: "x402 Merchant Audit ($0.25 USDC)",
    description: "Audit listings, semantic rank, competitor prices, payment reliability, buyer reach, and observed Base USDC activity, then return prioritized revenue fixes.",
    inputSchema: { payTo: addressSchema, queries: z.array(z.string().min(2).max(100)).min(1).max(5), excludePayers: z.array(addressSchema).max(10).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("merchantAudit", async (args) => jsonResult(await auditMerchant(args as { payTo: string; queries: string[]; excludePayers?: string[] }))));

  server.registerTool("treasury_preflight", {
    title: "Base Payment Preflight ($0.02 USDC)",
    description: "Check Base ETH and USDC funding, gas, chain intent, destination type, and common payment hazards before signing.",
    inputSchema: { address: addressSchema, destinationAddress: addressSchema.optional(), plannedSpendUsdc: z.string().optional(), minGasReserveEth: z.string().optional(), expectedChainId: z.literal(8453).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("treasuryPreflight", async (args) => jsonResult(await createTreasuryPreflight(args as { address: string; destinationAddress?: string; plannedSpendUsdc?: string; minGasReserveEth?: string; expectedChainId?: number }))));

  server.registerTool("payment_guard", {
    title: "x402 Payment Guard ($0.01 USDC)",
    description: "Validate a live x402 challenge, price, Base network, USDC asset, recipient, funding, gas reserve, and destination immediately before signing.",
    inputSchema: { payerAddress: addressSchema, serviceUrl: z.string().url(), maxAmountUsdc: z.string().regex(/^[0-9]+(\.[0-9]{1,6})?$/), expectedPayTo: addressSchema.optional(), minGasReserveEth: z.string().regex(/^[0-9]+(\.[0-9]{1,18})?$/).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("paymentGuard", async (args) => jsonResult(await evaluatePaymentGuard(args as { payerAddress: string; serviceUrl: string; maxAmountUsdc: string; expectedPayTo?: string; minGasReserveEth?: string }))));

  server.registerTool("base_balance", {
    title: "Base Wallet Balance ($0.001 USDC)",
    description: "Read native ETH and Circle USDC balances plus current block height for a Base wallet.",
    inputSchema: { address: addressSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("baseBalance", async (args) => jsonResult(await readBaseBalance((args as { address: string }).address))));

  server.registerTool("check_url", {
    title: "URL Check ($0.001 USDC)",
    description: "Check one public URL's reachability, HTTP status, latency, redirects, and content type before using it.",
    inputSchema: { url: z.string().url(), expectedStatus: z.number().int().min(100).max(599).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("urlCheck", async (args) => jsonResult(await checkUrl(args as { url: string; expectedStatus?: number }))));

  server.registerTool("verify_web_evidence", {
    title: "Verify Web Evidence ($0.01 USDC)",
    description: "Verify one public URL and return timestamped status, redirects, metadata, content hash, and a receipt.",
    inputSchema: { url: z.string().url(), expectedStatus: z.number().int().min(100).max(599).optional(), expectedText: z.string().max(500).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("verifyEvidence", async (args) => jsonResult(await verifyUrl(args as { url: string; expectedStatus?: number; expectedText?: string }))));

  server.registerTool("batch_check_urls", {
    title: "Batch URL Check ($0.01 USDC)",
    description: "Check up to ten public URLs in one paid call with isolated results for partial failures.",
    inputSchema: { urls: z.array(z.string().url()).min(1).max(10), expectedStatus: z.number().int().min(100).max(599).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, paidTool("batchCheck", async (args) => {
    const input = args as { urls: string[]; expectedStatus?: number };
    const results = await Promise.all(input.urls.map(async (url) => {
      try { return await checkUrl({ url, expectedStatus: input.expectedStatus }); }
      catch (error) { return { url, verified: false, error: error instanceof Error ? error.message : "URL check failed." }; }
    }));
    return jsonResult({ verified: results.every((result) => result.verified), count: results.length, checkedAt: new Date().toISOString(), results });
  }));

  return server;
}
