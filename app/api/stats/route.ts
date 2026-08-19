import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "../../../db/dashboard";
import { getSourcingCounts } from "../../../db/sourcing";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const [snapshot, sourcing] = await Promise.all([
    getDashboardSnapshot(),
    getSourcingCounts().catch(() => ({ total: 0, byStatus: {} })),
  ]);
  return NextResponse.json({ ...snapshot, sourcing }, {
    headers: { "cache-control": "no-store" },
  });
}
