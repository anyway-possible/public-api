import { getDb } from "../db";
import { events } from "../db/schema";

type HeaderBag = Headers | Record<string, string | string[] | undefined>;

function headerValue(headers: HeaderBag, name: string) {
  if (headers instanceof Headers) return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function shortClientId(headers: HeaderBag) {
  const source = headerValue(headers, "user-agent") ?? "mcp:unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordMcpEvent(
  kind: "mcp_initialize" | "mcp_tools_list" | "mcp_payment_challenge",
  endpoint: string,
  headers: HeaderBag,
  statusCode: number,
) {
  try {
    const isSelfTest = headerValue(headers, "x-awp-self-test") === "1";
    await getDb().insert(events).values({
      eventId: crypto.randomUUID(),
      kind: isSelfTest ? `test_${kind}` : kind,
      endpoint,
      agentId: await shortClientId(headers),
      amountUsd: 0,
      costUsd: 0,
      statusCode,
      network: "eip155:8453",
      occurredAt: new Date().toISOString(),
    }).run();
  } catch {
    // MCP responses remain available if analytics storage is temporarily unavailable.
  }
}
