import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Anyway Possible Verify",
    version: "1.0.0",
    network: "Base",
    paidEndpoint: "/api/verify",
    checkedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
