import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent } from "../../../lib/analytics";
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
        "POST /api/check": {
          price: "$0.01",
          description: "Check a public URL's live status, latency, redirects, and content type for one cent.",
          networks: ["eip155:8453"],
          maxTimeoutSeconds: 60,
          extensions: {
            ...declareDiscoveryExtension({
              method: "POST",
              bodyType: "json",
              input: { url: "https://example.com", expectedStatus: 200 },
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri", description: "Public HTTP(S) URL to check" },
                  expectedStatus: { type: "integer", minimum: 100, maximum: 599 },
                },
                required: ["url"],
              },
              output: {
                example: {
                  reachable: true,
                  verified: true,
                  status: 200,
                  finalUrl: "https://example.com/",
                  responseTimeMs: 120,
                  observedAt: "2026-01-01T00:00:00.000Z",
                },
                schema: {
                  type: "object",
                  properties: {
                    reachable: { type: "boolean" },
                    verified: { type: "boolean" },
                    status: { type: "integer" },
                    finalUrl: { type: "string" },
                    responseTimeMs: { type: "integer" },
                    observedAt: { type: "string", format: "date-time" },
                  },
                  required: ["reachable", "verified", "status", "finalUrl", "responseTimeMs", "observedAt"],
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
  let input: { url: string; expectedStatus?: number };
  try {
    input = await request.json() as { url: string; expectedStatus?: number };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  try {
    const result = await checkUrl(input);
    try {
      const identity = await identifyAgent(request);
      await getDb().insert(events).values({
        eventId: crypto.randomUUID(),
        kind: identity.isSelfTest ? "test_call" : "paid_call",
        endpoint: "/api/check",
        agentId: identity.agentId,
        amountUsd: 0.01,
        costUsd: 0,
        latencyMs: result.responseTimeMs,
        statusCode: 200,
        network: "eip155:8453",
        occurredAt: result.observedAt,
      }).run();
    } catch {
      // The paid result remains available if aggregate analytics storage is unavailable.
    }
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "URL check failed.";
    const status = /must be|not supported|valid HTTP/.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    return withX402FromHTTPServer(paidHandler, await getServer())(request);
  } catch (error) {
    console.error("x402 initialization failed", error);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Anyway Possible Check",
    price: "$0.01 USDC",
    network: "Base (eip155:8453)",
    method: "POST",
    request: { url: "https://example.com", expectedStatus: 200 },
    fullEvidence: "/api/verify",
    health: "/api/health",
  });
}
