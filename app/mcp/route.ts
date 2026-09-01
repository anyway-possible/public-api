import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "../../lib/mcp";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

async function handle(request: Request) {
  if (!originAllowed(request)) {
    return Response.json({ jsonrpc: "2.0", error: { code: -32000, message: "Origin not allowed" }, id: null }, { status: 403 });
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = await createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
