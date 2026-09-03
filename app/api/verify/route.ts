import { createX402Server, type X402Server } from "@coinbase/cdp-sdk/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { withX402FromHTTPServer } from "@x402/next";
import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { identifyAgent, recordServiceError } from "../../../lib/analytics";
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
          accepts: {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:8453",
            payTo: PAY_TO,
            maxTimeoutSeconds: 300,
          },
          serviceName: "Anyway Possible Web Evidence",
          tags: ["web evidence", "citation verification", "content hash", "source validation", "proof of content"],
          iconUrl: "https://anywaypossible.com/favicon.png",
          description: "Web evidence and citation verification for AI agents. Prove a source is live and contains expected text or status before citing or acting. Returns redirects, metadata, headers, latency, SHA-256 content digest, receipt ID, and timestamp. SSRF-safe, no account.",
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
                example: {
                  verified: true,
                  status: 200,
                  title: "Example Domain",
                  finalUrl: "https://example.com/",
                  contentSha256: "6f5635035f36ad500b4fc4bb7816bb72ef5594e1bcae44fa074c5e988fc4c0fe",
                  receiptId: "f06d5ef0db3b95b4c11768a3f53519dc60e9e911adf3187ca73703a4a32eae6d",
                  observedAt: "2026-01-01T00:00:00.000Z",
                },
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
        amountUsd: 0.01,
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
    if (status >= 500) await recordServiceError(request, "/api/verify", status);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const server = await getServer();
    const response = await withX402FromHTTPServer(paidHandler, server)(request);
    if (response.status === 402) {
      try {
        const identity = await identifyAgent(request);
        await getDb().insert(events).values({ eventId: crypto.randomUUID(), kind: identity.isSelfTest ? "test_challenge" : "payment_challenge", endpoint: "/api/verify", agentId: identity.agentId, amountUsd: 0, costUsd: 0, statusCode: 402, network: "eip155:8453", occurredAt: new Date().toISOString() }).run();
      } catch {}
    }
    return response;
  } catch (error) {
    console.error("x402 initialization failed", error);
    await recordServiceError(request, "/api/verify", 503);
    return NextResponse.json({ error: "Payment service is temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Anyway Possible Evidence",
    price: "$0.01 USDC",
    network: "Base (eip155:8453)",
    method: "POST",
    request: { url: "https://example.com", expectedStatus: 200, expectedText: "Example Domain" },
    entryCheck: "/api/check",
    batchCheck: "/api/batch",
    health: "/api/health",
  });
}
