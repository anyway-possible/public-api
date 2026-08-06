import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent } from "../../../lib/analytics";
import { verifyUrl, type VerificationInput } from "../../../lib/verification";

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
        "POST /api/verify": {
          price: "$0.10",
          description: "Verify a public URL and return timestamped assertions, redirect history, metadata, headers, and SHA-256 evidence.",
          networks: ["eip155:8453"],
          maxTimeoutSeconds: 300,
          extensions: {
            ...declareDiscoveryExtension({
              method: "POST",
              bodyType: "json",
              input: { url: "https://example.com", expectedStatus: 200, expectedText: "Example Domain" },
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri", description: "Public HTTP(S) URL to verify" },
                  expectedStatus: { type: "integer", minimum: 100, maximum: 599 },
                  expectedText: { type: "string", maxLength: 500 },
                },
                required: ["url"],
              },
              output: {
                example: { verified: true, status: 200, title: "Example Domain", contentSha256: "sha256 digest", receiptId: "tamper-evident receipt identifier" },
                schema: {
                  type: "object",
                  properties: {
                    verified: { type: "boolean" },
                    status: { type: "integer" },
                    title: { type: ["string", "null"] },
                    finalUrl: { type: "string" },
                    contentSha256: { type: "string" },
                    receiptId: { type: "string" },
                    observedAt: { type: "string", format: "date-time" },
                  },
                  required: ["verified", "status", "finalUrl", "contentSha256", "receiptId", "observedAt"],
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
  let input: VerificationInput;
  try {
    input = await request.json() as VerificationInput;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  try {
    const result = await verifyUrl(input);
    try {
      const identity = await identifyAgent(request);
      await getDb().insert(events).values({
        eventId: crypto.randomUUID(),
        kind: identity.isSelfTest ? "test_call" : "paid_call",
        endpoint: "/api/verify",
        agentId: identity.agentId,
        amountUsd: 0.10,
        costUsd: 0,
        latencyMs: result.responseTimeMs,
        statusCode: 200,
        network: "eip155:8453",
        occurredAt: result.observedAt,
      }).run();
    } catch {
      // Verification is still returned if analytics storage is temporarily unavailable.
    }
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    const status = /must be|not supported|valid HTTP/.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const server = await getServer();
    return withX402FromHTTPServer(paidHandler, server)(request);
  } catch (error) {
    console.error("x402 initialization failed", error);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Anyway Possible Evidence",
    price: "$0.10 USDC",
    network: "Base (eip155:8453)",
    method: "POST",
    request: { url: "https://example.com", expectedStatus: 200, expectedText: "Example Domain" },
    entryCheck: "/api/check",
    health: "/api/health",
  });
}
