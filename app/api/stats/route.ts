import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "../../../db/dashboard";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getDashboardSnapshot();
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "no-store" },
  });
}
