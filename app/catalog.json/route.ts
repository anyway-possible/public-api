import { NextResponse } from "next/server";
import { buildCatalog } from "../../lib/product-catalog.mjs";

export const runtime = "edge";

export function GET() {
  return NextResponse.json(buildCatalog(), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}
