import { buildLlmsText } from "../../lib/product-catalog.mjs";

export const runtime = "edge";

export function GET() {
  return new Response(buildLlmsText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
