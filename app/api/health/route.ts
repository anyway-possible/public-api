import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Anyway Possible Agent Utilities",
    release: "stable",
    network: "Base",
    paidEndpoints: ["/api/payment-guard", "/api/merchant-snapshot", "/api/merchant-audit", "/api/treasury", "/api/base-balance", "/api/check", "/api/batch", "/api/verify"],
    mcp: { endpoint: "/api/mcp", transport: "streamable-http", tools: ["merchant_snapshot", "treasury_preflight", "verify_web_evidence", "batch_check_urls"] },
    checkedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
