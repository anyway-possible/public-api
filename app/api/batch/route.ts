import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent, recordPaymentChallenge, recordServiceError } from "../../../lib/analytics";
import { checkUrl } from "../../../lib/verification";

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
        "POST /api/batch": {
          accepts: {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:8453",
            payTo: PAY_TO,
            maxTimeoutSeconds: 120,
          },
          serviceName: "Anyway Possible Batch URL Validator",
          tags: ["batch url check", "citation validation", "link checker", "api monitoring", "website health"],
          iconUrl: "https://anywaypossible.com/favicon.png",
          description: "Batch URL validation for AI agents. Check up to 10 citations, links, websites, or API endpoints in one payment. Returns reachability, exact status, latency, content type, final URL, and safe redirects; partial failures stay isolated.",
          extensions: {
            ...declareDiscoveryExtension({
              method: "POST",
              bodyType: "json",
              input: { urls: ["https://example.com", "https://www.iana.org/help/example-domains"], expectedStatus: 200 },
              inputSchema: {
                type: "object",
                properties: {
                  urls: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", format: "uri" }, description: "One to ten public HTTP(S) URLs" },
                  expectedStatus: { type: "integer", minimum: 100, maximum: 599 },
                },
                required: ["urls"],
              },
              output: {
                example: {
                  verified: true,
                  count: 2,
                  checkedAt: "2026-01-01T00:00:00.000Z",
                  results: [{ url: "https://example.com", verified: true, status: 200, responseTimeMs: 120 }],
                },
                schema: {
                  type: "object",
                  properties: {
                    verified: { type: "boolean" },
                    count: { type: "integer" },
                    checkedAt: { type: "string", format: "date-time" },
                    results: { type: "array", items: { type: "object" } },
                  },
                  required: ["verified", "count", "checkedAt", "results"],
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
  let input: { urls: string[]; expectedStatus?: number };
  try {
    input = await request.json() as { urls: string[]; expectedStatus?: number };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!Array.isArray(input.urls) || input.urls.length < 1 || input.urls.length > 10) {
    return NextResponse.json({ error: "urls must contain between 1 and 10 public HTTP(S) URLs." }, { status: 400 });
  }

  const started = Date.now();
  const settled = await Promise.all(input.urls.map(async (url) => {
    try {
      return await checkUrl({ url, expectedStatus: input.expectedStatus });
    } catch (error) {
      return { url, verified: false, error: error instanceof Error ? error.message : "URL check failed." };
    }
  }));
  const checkedAt = new Date().toISOString();
  const result = { verified: settled.every((item) => item.verified), count: settled.length, checkedAt, results: settled };

  try {
    const identity = await identifyAgent(request);
    await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_call" : "paid_call", endpoint: "/api/batch", agentId: identity.agentId, clientType: identity.clientType, amountUsd: 0.01, costUsd: 0, latencyMs: Date.now() - started, statusCode: 200, network: "eip155:8453", occurredAt: checkedAt }).run();
  } catch {}
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const response = await withX402FromHTTPServer(paidHandler, await getServer())(request);
    if (response.status === 402) {
      await recordPaymentChallenge(request, "/api/batch");
    }
    return response;
  } catch (error) {
    console.error("x402 initialization failed", error);
    await recordServiceError(request, "/api/batch", 503);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({ service: "Anyway Possible Batch Check", price: "$0.01 USDC", network: "Base (eip155:8453)", method: "POST", limit: 10, request: { urls: ["https://example.com"], expectedStatus: 200 }, singleCheck: "/api/check", fullEvidence: "/api/verify" });
}
