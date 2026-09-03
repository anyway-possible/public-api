import { NextResponse } from "next/server";
import { buildOpenApi } from "../../lib/product-catalog.mjs";

export const runtime = "edge";

export function GET() {
  return NextResponse.json(buildOpenApi(), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
