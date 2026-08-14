import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Anyway Possible Agent Utilities",
    version: "6.0.0",
    network: "Base",
    paidEndpoints: ["/api/treasury", "/api/base-balance", "/api/check", "/api/batch", "/api/verify"],
    checkedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
