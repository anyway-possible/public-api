import { NextRequest } from "next/server";

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
  const isInfrastructureProbe =
    userAgent.includes("CoinbaseBazaarDiscovery/") ||
    (userAgent === "node" && request.headers.get("content-length") === "2") ||
    request.nextUrl.searchParams.has("release");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  const agentId = Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    agentId,
    isSelfTest:
      payer === SELF_TEST_PAYER ||
      request.headers.get("x-awp-self-test") === "1" ||
      isInfrastructureProbe,
  };
}
