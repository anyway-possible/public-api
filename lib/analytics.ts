import { NextRequest } from "next/server";
import { getDb } from "../db";
import { events } from "../db/schema";
import { classifyUserAgent } from "./client-classification";
import { CHALLENGE_LIMIT, CHALLENGE_WINDOW_MS, consumeChallengeToken } from "./challenge-rate-limit.mjs";

const SELF_TEST_PAYER = "0x44d2dc46f987d1f2fa55e281934addd193a1a377";

function paymentPayer(request: NextRequest) {
  const header = request.headers.get("payment-signature") ?? request.headers.get("x-payment");
  if (!header) return null;
  try {
    const decoded = header.trim().startsWith("{") ? header : atob(header.replace(/-/g, "+").replace(/_/g, "/"));
    const payment = JSON.parse(decoded) as {
      payer?: string;
      payload?: { authorization?: { from?: string }; owner?: string };
    };
    return payment.payer ?? payment.payload?.authorization?.from ?? payment.payload?.owner ?? null;
  } catch {
    return null;
  }
}

export async function identifyAgent(request: NextRequest) {
  const payer = paymentPayer(request)?.toLowerCase() ?? null;
  const source = payer ?? request.headers.get("user-agent") ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  const emptyNodeProbe = userAgent === "node" && request.headers.get("content-length") === "2";
  const releaseProbe = request.nextUrl.searchParams.has("release");
  const isInfrastructureProbe =
    userAgent.includes("CoinbaseBazaarDiscovery/") ||
    emptyNodeProbe ||
    releaseProbe;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  const agentId = Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    agentId,
    clientType: classifyUserAgent(userAgent, {
      selfTest: payer === SELF_TEST_PAYER || request.headers.get("x-awp-self-test") === "1",
      releaseProbe,
      emptyNodeProbe,
    }),
    isSelfTest:
      payer === SELF_TEST_PAYER ||
      request.headers.get("x-awp-self-test") === "1" ||
      isInfrastructureProbe,
  };
}

export async function recordPaymentChallenge(request: NextRequest, endpoint: string) {
  try {
    const identity = await identifyAgent(request);
    await getDb().insert(events).values({
      eventId: crypto.randomUUID(),
      kind: identity.isSelfTest ? "test_challenge" : "payment_challenge",
      endpoint,
      agentId: identity.agentId,
      clientType: identity.clientType,
      amountUsd: 0,
      costUsd: 0,
      statusCode: 402,
      network: "eip155:8453",
      occurredAt: new Date().toISOString(),
    }).run();
  } catch {
    // Payment challenges remain available if attribution storage is unavailable.
  }
}

function isTrustedChallengeProbe(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  return request.headers.get("x-awp-self-test") === "1" ||
    userAgent.includes("CoinbaseBazaarDiscovery/") ||
    request.nextUrl.searchParams.has("release");
}

async function challengeBucketKey(request: NextRequest) {
  const source = `${request.headers.get("cf-connecting-ip") ?? "edge-unknown"}\n${request.headers.get("user-agent") ?? "unknown"}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function withRateLimitHeaders(response: Response, remaining: number, resetsAt: number) {
  const resetSeconds = Math.max(1, Math.ceil((resetsAt - Date.now()) / 1_000));
  const headers = new Headers(response.headers);
  headers.set("RateLimit-Limit", String(CHALLENGE_LIMIT));
  headers.set("RateLimit-Remaining", String(Math.max(0, remaining)));
  headers.set("RateLimit-Reset", String(resetSeconds));
  headers.set("RateLimit-Policy", `${CHALLENGE_LIMIT};w=${CHALLENGE_WINDOW_MS / 1_000}`);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Applies a burst-tolerant, per-edge-isolate limit only after x402 has decided
 * that a request needs a payment challenge. Paid calls and MCP discovery never
 * enter this path. The client key is hashed in memory and is never persisted.
 */
export async function protectPaymentChallenge(request: NextRequest, endpoint: string, response: Response) {
  if (response.status !== 402) return response;
  if (isTrustedChallengeProbe(request)) {
    await recordPaymentChallenge(request, endpoint);
    return response;
  }

  const now = Date.now();
  const key = await challengeBucketKey(request);
  const bucket = consumeChallengeToken(key, now);

  if (!bucket.allowed) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetsAt - now) / 1_000));
    return Response.json({
      error: "Payment challenge rate limit exceeded.",
      code: "payment_challenge_rate_limited",
      retryAfterSeconds: retryAfter,
    }, {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        "RateLimit-Limit": String(CHALLENGE_LIMIT),
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(retryAfter),
        "RateLimit-Policy": `${CHALLENGE_LIMIT};w=${CHALLENGE_WINDOW_MS / 1_000}`,
      },
    });
  }

  await recordPaymentChallenge(request, endpoint);
  return withRateLimitHeaders(response, bucket.remaining, bucket.resetsAt);
}

export async function recordServiceError(request: NextRequest, endpoint: string, statusCode: number, startedAt?: number) {
  try {
    const identity = await identifyAgent(request);
    await getDb().insert(events).values({
      eventId: crypto.randomUUID(),
      kind: identity.isSelfTest ? "test_service_error" : "service_error",
      endpoint,
      agentId: identity.agentId,
      clientType: identity.clientType,
      amountUsd: 0,
      costUsd: 0,
      latencyMs: startedAt === undefined ? null : Date.now() - startedAt,
      statusCode,
      network: "eip155:8453",
      occurredAt: new Date().toISOString(),
    }).run();
  } catch {
    // Product responses remain available if reliability telemetry is unavailable.
  }
}
