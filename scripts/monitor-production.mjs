import assert from "node:assert/strict";

const origin = new URL(process.env.AWP_MONITOR_ORIGIN || "https://anywaypossible.com");
const monitorUrl = "https://github.com/anyway-possible/public-api/actions/workflows/production-monitor.yml";
const commonHeaders = {
  "user-agent": `AnywayPossibleExternalMonitor/1.0 (+${monitorUrl})`,
  "x-awp-self-test": "1",
};

async function request(path, init = {}) {
  const startedAt = performance.now();
  const response = await fetch(new URL(path, origin), {
    ...init,
    headers: { ...commonHeaders, ...init.headers },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  return { response, latencyMs: Math.round(performance.now() - startedAt) };
}

async function check(name, run) {
  const result = await run();
  console.log(`PASS ${name} (${result.latencyMs} ms)`);
}

await check("public status page", async () => {
  const result = await request("/status");
  assert.equal(result.response.status, 200);
  assert.match(await result.response.text(), /PUBLIC OPERATING EVIDENCE/i);
  return result;
});

await check("health contract", async () => {
  const result = await request("/api/health");
  assert.equal(result.response.status, 200);
  const body = await result.response.json();
  assert.equal(body.ok, true);
  assert.equal(body.trust?.machine, "/api/trust");
  return result;
});

await check("privacy-safe trust evidence", async () => {
  const result = await request("/api/trust");
  assert.equal(result.response.status, 200);
  const body = await result.response.json();
  assert.equal(body.ok, true);
  assert.equal(body.evidence?.dataAvailable, true);
  assert.match(body.privacy, /No wallet addresses/i);
  return result;
});

await check("agent discovery contracts", async () => {
  const [openApiResult, instructionsResult] = await Promise.all([request("/openapi.json"), request("/llms.txt")]);
  assert.equal(openApiResult.response.status, 200);
  assert.equal(instructionsResult.response.status, 200);
  const openApi = await openApiResult.response.json();
  const instructions = await instructionsResult.response.text();
  assert.ok(openApi.paths?.["/api/trust"]);
  assert.match(instructions, /\/api\/mcp/);
  assert.match(instructions, /\/api\/trust/);
  return { latencyMs: Math.max(openApiResult.latencyMs, instructionsResult.latencyMs) };
});

await check("MCP initialize handshake", async () => {
  const result = await request("/api/mcp", {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "external-monitor",
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "anyway-possible-external-monitor", version: "1.0.0" } },
    }),
  });
  assert.equal(result.response.status, 200);
  const body = await result.response.json();
  assert.equal(body.jsonrpc, "2.0");
  assert.ok(body.result?.serverInfo?.name);
  return result;
});

await check("x402 payment boundary", async () => {
  const result = await request("/api/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://anywaypossible.com/api/health" }),
  });
  assert.equal(result.response.status, 402);
  assert.ok(result.response.headers.get("payment-required"));
  return result;
});

console.log(`All independent production checks passed at ${new Date().toISOString()}`);
