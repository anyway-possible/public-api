import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getDashboardSnapshot } from "../../../db/dashboard";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest, token: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (supplied.length !== token.length) return false;
  let difference = 0;
  for (let index = 0; index < token.length; index += 1) {
    difference |= supplied.charCodeAt(index) ^ token.charCodeAt(index);
  }
  return difference === 0;
}

export async function GET(request: NextRequest) {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const token = runtimeEnv.METRICS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Metrics access is not configured." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (!authorized(request, token)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "cache-control": "no-store", "www-authenticate": "Bearer" } },
    );
  }
  const snapshot = await getDashboardSnapshot();
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "no-store" },
  });
}
