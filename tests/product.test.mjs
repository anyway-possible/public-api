import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { buildCatalog, buildLlmsText, buildOpenApi, tools as productTools } from "../lib/product-catalog.mjs";

const root = new URL("../", import.meta.url);

test("public surface explains the paid agent product", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const publicSurface = page + JSON.stringify(buildCatalog());
  for (const section of ["PAID APIs FOR AUTONOMOUS AGENTS", "Decision-ready checks", "Ask a question", "Connect via MCP", "QUESTION", "NEXT ACTION", "WHERE AGENTS FIND US", "MCP Registry", "Direct HTTP", "/api/payment-guard", "/api/merchant-snapshot", "/api/merchant-audit", "/api/treasury", "/api/base-balance", "/api/check", "/api/batch", "/api/verify", "CHOOSE BY JOB"]) {
    assert.match(publicSurface, new RegExp(section));
  }
});

test("public discovery metadata identifies the canonical service", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const brand = await readFile(new URL("app/brand-mark.tsx", root), "utf8");
  const quietCss = await readFile(new URL("app/quiet.css", root), "utf8");
  const status = await readFile(new URL("app/status/page.tsx", root), "utf8");
  const sitemap = await readFile(new URL("public/sitemap.xml", root), "utf8");
  assert.match(layout, /metadataBase: new URL\(siteUrl\)/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(layout, /"@type": "Organization"/);
  assert.match(layout, /"@type": "Service"/);
  assert.match(layout, /favicon\.png/);
  assert.match(page, /Confidence for/);
  assert.match(page, /BrandMark/);
  assert.match(brand, /decision-mark/);
  assert.match(quietCss, /#10162a/i);
  assert.match(quietCss, /#e7b85b/i);
  assert.match(status, /gateway is responding/i);
  assert.match(status, /Raw health JSON/);
  assert.match(sitemap, /https:\/\/anywaypossible\.com\/status/);
});

test("commercial metrics require a private bearer token and exclude payer identities", async () => {
  const route = await readFile(new URL("app/api/stats/route.ts", root), "utf8");
  const dashboard = await readFile(new URL("db/dashboard.ts", root), "utf8");
  assert.match(route, /METRICS_TOKEN/);
  assert.match(route, /authorization/);
  assert.match(route, /status: 401/);
  assert.match(route, /status: 503/);
  assert.match(dashboard, /repeatAgents/);
  assert.match(dashboard, /multiDayAgents/);
  assert.match(dashboard, /repeatRate/);
  assert.match(dashboard, /revenueByEndpoint/);
  assert.match(dashboard, /lastPaidAt/);
  assert.match(dashboard, /dailyActivity/);
  assert.match(dashboard, /lastUtcDays\(30\)/);
  assert.match(dashboard, /paymentChallenges: challengeEvents\.filter/);
  assert.match(dashboard, /mcpInitializations/);
  assert.match(dashboard, /mcpPaymentChallenges/);
  assert.match(dashboard, /mcpToolCalls/);
  assert.match(dashboard, /mcpPaymentAttempts/);
  assert.match(dashboard, /mcpPaymentFailures/);
  assert.match(dashboard, /mcpConversionRate/);
  assert.match(dashboard, /multiProductAgents/);
  assert.match(dashboard, /productPairs/);
  assert.match(dashboard, /reliability/);
  assert.doesNotMatch(dashboard, /payerAddresses/);
});

test("payment guard validates a purchase before an agent signs", async () => {
  const [route, product] = await Promise.all([
    readFile(new URL("app/api/payment-guard/route.ts", root), "utf8"),
    readFile(new URL("lib/payment-guard.ts", root), "utf8"),
  ]);
  const source = route + product;
  assert.match(route, /x402 Payment Guard/);
  assert.match(route, /\$0\.01/);
  assert.match(source, /platform\/v2\/x402\/validate/);
  assert.match(source, /price_ceiling/);
  assert.match(source, /safe_to_sign/);
  assert.match(source, /expectedPayTo/);
});

test("guarded purchase workflow routes readiness into the final signing guard", async () => {
  const [treasuryRoute, treasuryProduct, recipe] = await Promise.all([
    readFile(new URL("app/api/treasury/route.ts", root), "utf8"),
    readFile(new URL("lib/treasury.ts", root), "utf8"),
    readFile(new URL("public/guarded-purchase.json", root), "utf8"),
  ]);
  const treasury = treasuryRoute + treasuryProduct;
  assert.match(treasury, /recommendedNext/);
  assert.match(treasury, /\/api\/payment-guard/);
  const workflow = JSON.parse(recipe);
  assert.equal(workflow.steps.length, 4);
  assert.equal(workflow.steps[2].endpoint, "https://anywaypossible.com/api/payment-guard");
});

test("merchant snapshot is the low-friction audit funnel", async () => {
  const [route, product] = await Promise.all([
    readFile(new URL("app/api/merchant-snapshot/route.ts", root), "utf8"),
    readFile(new URL("lib/merchant-snapshot.ts", root), "utf8"),
  ]);
  const source = route + product;
  assert.match(route, /Why Is My x402 API Not Selling/);
  assert.match(route, /\$0\.05/);
  assert.match(route, /amountUsd: 0\.05/);
  assert.match(route, /increase x402 revenue/);
  assert.match(route, /x402 seller intelligence/);
  assert.match(source, /biggestIssue/);
  assert.match(source, /\/api\/merchant-audit/);
  assert.match(source, /priceUsd: 0\.25/);
});

test("merchant audit is the flagship revenue product", async () => {
  const [route, audit] = await Promise.all([
    readFile(new URL("app/api/merchant-audit/route.ts", root), "utf8"),
    readFile(new URL("lib/merchant-audit.ts", root), "utf8"),
  ]);
  assert.match(route, /x402 API Revenue Audit/);
  assert.match(route, /\$0\.25/);
  assert.match(route, /amountUsd: 0\.25/);
  assert.match(route, /merchant-audit-price-2026-09/);
  assert.match(route, /increase x402 revenue/);
  assert.match(audit, /api\.cdp\.coinbase\.com/);
  assert.match(audit, /base\.blockscout\.com/);
  assert.match(audit, /platform\/v2\/x402\/validate/);
  assert.match(audit, /parsePublicUrl/);
  assert.match(audit, /x-awp-self-test/);
  assert.match(audit, /scoreBreakdown/);
  assert.match(audit, /analyzedListingCount/);
  assert.match(audit, /listingSampleLimited/);
  assert.match(audit, /topCompetitors/);
  assert.match(audit, /limitations/);
});

test("Base payment preflight is the higher-value product", async () => {
  const [route, product] = await Promise.all([
    readFile(new URL("app/api/treasury/route.ts", root), "utf8"),
    readFile(new URL("lib/treasury.ts", root), "utf8"),
  ]);
  const source = route + product;
  assert.match(route, /Anyway Possible Base Payment Preflight/);
  assert.match(route, /\$0\.02/);
  assert.match(source, /plannedSpendUsdc/);
  assert.match(source, /minGasReserveEth/);
  assert.match(source, /usdcShortfall/);
  assert.match(source, /gasShortfallEth/);
  assert.match(source, /paymentCapacity/);
  assert.match(source, /destinationAddress/);
  assert.match(source, /safeToProceed/);
  assert.match(source, /safe_to_pay/);
  assert.match(source, /review_destination/);
  assert.match(source, /destinationIsZero/);
  assert.match(source, /destinationIsTokenContract/);
  assert.match(source, /eth_getCode/);
  assert.match(source, /expectedChainId/);
  assert.match(source, /limitations/);
  assert.match(source, /receiptId/);
  assert.match(route, /agent treasury/);
  assert.match(route, /wallet readiness/);
  assert.match(route, /Base gas reserve/);
  assert.match(route, /amountUsd: 0\.02/);
});

test("remote MCP surface exposes the strongest products with x402 payment metadata", async () => {
  const [route, mcp, manifest, instructions] = await Promise.all([
    readFile(new URL("app/api/mcp/route.ts", root), "utf8"),
    readFile(new URL("lib/mcp.ts", root), "utf8"),
    readFile(new URL("server.json", root), "utf8"),
    Promise.resolve(buildLlmsText()),
  ]);
  assert.match(route, /WebStandardStreamableHTTPServerTransport/);
  assert.match(route, /originAllowed/);
  assert.match(route, /mcp_initialize/);
  assert.match(route, /mcp_tools_list/);
  assert.match(mcp, /createPaymentWrapper/);
  assert.match(mcp, /createCdpFacilitatorClient/);
  assert.match(mcp, /bazaarResourceServerExtension/);
  assert.match(mcp, /mcp_payment_challenge/);
  assert.match(mcp, /mcp_tool_call/);
  assert.match(mcp, /mcp_payment_attempt/);
  assert.match(mcp, /mcp_payment_failure/);
  const analytics = await readFile(new URL("lib/mcp-analytics.ts", root), "utf8");
  assert.match(analytics, /SHA-256/);
  assert.match(analytics, /x-awp-self-test/);
  assert.doesNotMatch(analytics, /request\.json/);
  const tools = ["merchant_snapshot", "merchant_audit", "treasury_preflight", "payment_guard", "base_balance", "check_url", "verify_web_evidence", "batch_check_urls"];
  for (const tool of tools) {
    assert.match(mcp, new RegExp(tool));
    assert.match(instructions, new RegExp(tool));
  }
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.version, "1.2.0");
  assert.equal(parsed.name, "com.anywaypossible/agent-utilities");
  assert.equal(parsed.remotes[0].url, "https://anywaypossible.com/api/registry-mcp");
  const registryRoute = await readFile(new URL("app/api/registry-mcp/route.ts", root), "utf8");
  assert.match(registryRoute, /from "\.\.\/mcp\/route"/);
  assert.equal(parsed.remotes[0].type, "streamable-http");
});

test("Base wallet balance follows demonstrated agent demand", async () => {
  const [route, product] = await Promise.all([
    readFile(new URL("app/api/base-balance/route.ts", root), "utf8"),
    readFile(new URL("lib/base-balance.ts", root), "utf8"),
  ]);
  const source = route + product;
  assert.match(route, /Anyway Possible Base Wallet Balance/);
  assert.match(source, /eth_getBalance/);
  assert.match(source, /base-rpc\.publicnode\.com/);
  assert.match(source, /base-mainnet\.public\.blastapi\.io/);
  assert.match(source, /70a08231/);
  assert.match(source, /0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/);
  assert.match(route, /\$0\.001/);
  assert.match(route, /agent treasury/);
  assert.match(source, /ethAtomic: "0", usdcAtomic: "0"/);
  assert.match(route, /recommendedNext/);
  assert.match(route, /https:\/\/anywaypossible\.com\/api\/treasury/);
});

test("one-cent entry check is discoverable and uses Base USDC", async () => {
  const route = await readFile(new URL("app/api/check/route.ts", root), "utf8");
  assert.match(route, /\$0\.001/);
  assert.match(route, /eip155:8453/);
  assert.match(route, /serviceName: "Anyway Possible URL Check"/);
  assert.match(route, /tags: \["url", "uptime", "website health"/);
  assert.match(route, /declareDiscoveryExtension/);
  assert.match(route, /\.\.\.declareDiscoveryExtension/);
  assert.doesNotMatch(route, /bazaar:\s*declareDiscoveryExtension/);
  assert.match(route, /amountUsd: 0\.001/);
});

test("batch endpoint checks up to ten URLs for one cent", async () => {
  const route = await readFile(new URL("app/api/batch/route.ts", root), "utf8");
  assert.match(route, /\$0\.01/);
  assert.match(route, /maxItems: 10/);
  assert.match(route, /serviceName: "Anyway Possible Batch URL Validator"/);
  assert.match(route, /Promise\.all/);
  assert.match(route, /\.\.\.declareDiscoveryExtension/);
});

test("analytics separates internal validation from customer revenue", async () => {
  const analytics = await readFile(new URL("lib/analytics.ts", root), "utf8");
  const classification = await readFile(new URL("lib/client-classification.ts", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const dashboard = await readFile(new URL("db/dashboard.ts", root), "utf8");
  assert.match(analytics, /SELF_TEST_PAYER/);
  assert.match(analytics, /payload\?\.authorization\?\.from/);
  assert.match(analytics, /userAgent === "node"/);
  assert.match(dashboard, /testVolumeUsd/);
  assert.match(dashboard, /customerEvents/);
  assert.match(dashboard, /challengesByEndpoint/);
  assert.match(analytics, /recordPaymentChallenge/);
  assert.match(analytics, /clientType: identity\.clientType/);
  assert.match(schema, /clientType: text\("client_type"\)/);
  for (const type of ["internal_probe", "marketplace_probe", "crawler_monitor", "agent_sdk", "command_line", "browser", "programmatic", "unknown"]) {
    assert.match(classification, new RegExp(type));
  }
  assert.doesNotMatch(schema, /user_agent/);
  assert.match(dashboard, /attributedPaymentChallenges/);
  assert.match(dashboard, /legacyUnattributedChallenges/);
  assert.match(dashboard, /challengesByClientType/);
  assert.match(dashboard, /paidCallsByClientType/);
  assert.match(dashboard, /buyerLikeChallenges/);
  assert.match(dashboard, /noiseChallenges/);
});

test("every HTTP payment challenge uses centralized privacy-safe attribution", async () => {
  const routes = ["payment-guard", "merchant-snapshot", "merchant-audit", "treasury", "base-balance", "check", "batch", "verify"];
  for (const routeName of routes) {
    const route = await readFile(new URL(`app/api/${routeName}/route.ts`, root), "utf8");
    assert.match(route, /recordPaymentChallenge/);
    assert.doesNotMatch(route, /kind: identity\.isSelfTest \? "test_challenge"/);
  }
});

test("secure monitor rollups avoid secrets and raw event scans", async () => {
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0002_wakeful_adam_destine.sql", root), "utf8");
  for (const table of ["funnel_monitor_summary", "funnel_monitor_clients", "funnel_monitor_endpoints"]) {
    assert.match(schema, new RegExp(table));
    assert.match(migration, new RegExp(table));
  }
  assert.match(migration, /CREATE TRIGGER/);
  assert.match(migration, /AFTER INSERT ON `events`/);
  assert.match(migration, /COUNT\(DISTINCT `agent_id`\)/);
  assert.doesNotMatch(migration, /user_agent/);
  assert.doesNotMatch(migration, /METRICS_TOKEN/);

  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE events (id INTEGER PRIMARY KEY, event_id TEXT, kind TEXT NOT NULL, endpoint TEXT, agent_id TEXT, client_type TEXT, amount_usd REAL NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, latency_ms INTEGER, status_code INTEGER, transaction_hash TEXT, network TEXT, occurred_at TEXT NOT NULL)");
  const insert = db.prepare("INSERT INTO events (event_id, kind, endpoint, agent_id, client_type, amount_usd, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insert.run("a", "paid_call", "/api/check", "agent-1", "agent_sdk", 0.001, "2026-09-03T01:00:00Z");
  insert.run("b", "paid_call", "/api/check", "agent-1", "agent_sdk", 0.001, "2026-09-03T02:00:00Z");
  insert.run("c", "payment_challenge", "/api/check", "crawler", "crawler_monitor", 0, "2026-09-03T03:00:00Z");
  insert.run("d", "mcp_initialize", "/api/mcp", "mcp", "agent_sdk", 0, "2026-09-03T04:00:00Z");
  db.exec(migration);
  insert.run("e", "payment_challenge", "/api/verify", "agent-2", "programmatic", 0, "2026-09-03T05:00:00Z");
  const summary = db.prepare("SELECT paid_calls, unique_agents, repeat_agents, http_payment_challenges, mcp_initializations FROM funnel_monitor_summary").get();
  assert.deepEqual({ ...summary }, { paid_calls: 2, unique_agents: 1, repeat_agents: 1, http_payment_challenges: 2, mcp_initializations: 1 });
  const programmatic = db.prepare("SELECT http_challenges, paid_calls FROM funnel_monitor_clients WHERE client_type = 'programmatic'").get();
  assert.deepEqual({ ...programmatic }, { http_challenges: 1, paid_calls: 0 });
  const verify = db.prepare("SELECT payment_challenges, paid_calls FROM funnel_monitor_endpoints WHERE endpoint = '/api/verify'").get();
  assert.deepEqual({ ...verify }, { payment_challenges: 1, paid_calls: 0 });
  db.close();
});

test("agent documentation describes the transaction-level decision", async () => {
  const openapi = JSON.stringify(buildOpenApi());
  const instructions = buildLlmsText();
  assert.doesNotThrow(() => JSON.parse(openapi));
  assert.match(openapi, /preflightBaseUsdcPayment/);
  assert.match(openapi, /destinationAddress/);
  assert.match(openapi, /safeToProceed/);
  assert.match(instructions, /proceed, fund, review, or reject/);
  assert.doesNotMatch(instructions, /\/api\/stats/);
});

test("typography is self-hosted and compatible with the browser security policy", async () => {
  const [layout, config] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("next.config.ts", root), "utf8"),
  ]);
  assert.match(layout, /geist\/font\/sans/);
  assert.match(layout, /geist\/font\/mono/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.doesNotMatch(layout + config, /fonts\.(googleapis|gstatic)\.com/);
  assert.match(config, /font-src 'self' data:/);
});

test("focused guides are indexable and explain x402 in plain English", async () => {
  const [home, index, guidePage, content, sitemap, instructions] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/guides/page.tsx", root), "utf8"),
    readFile(new URL("app/guides/[slug]/page.tsx", root), "utf8"),
    readFile(new URL("app/guides/content.ts", root), "utf8"),
    readFile(new URL("public/sitemap.xml", root), "utf8"),
    Promise.resolve(buildLlmsText()),
  ]);
  assert.match(home, /web payment standard that lets software pay for one API answer at a time/);
  assert.match(index, /Understand the system/);
  assert.match(guidePage, /FAQPage/);
  for (const slug of ["what-is-x402", "x402-payment-safety", "x402-api-not-selling"]) {
    assert.match(content, new RegExp(slug));
    assert.match(sitemap, new RegExp(`https://anywaypossible\\.com/guides/${slug}`));
    assert.match(instructions, new RegExp(`https://anywaypossible\\.com/guides/${slug}`));
  }
});

test("public capability descriptions expose all eight MCP tools", async () => {
  const health = await readFile(new URL("app/api/health/route.ts", root), "utf8");
  const openapi = JSON.stringify(buildOpenApi());
  const tools = ["merchant_snapshot", "merchant_audit", "treasury_preflight", "payment_guard", "base_balance", "check_url", "verify_web_evidence", "batch_check_urls"];
  for (const tool of tools) {
    assert.match(health, new RegExp(tool));
    assert.ok(productTools.some((product) => product.mcpTool === tool));
    assert.match(openapi, new RegExp(tool));
  }
});

test("free machine-readable catalog previews every paid result before purchase", async () => {
  const [page, instructions] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    Promise.resolve(buildLlmsText()),
  ]);
  const catalog = buildCatalog();
  assert.deepEqual(catalog.featured, ["merchant-snapshot", "treasury", "payment-guard"]);
  assert.equal(catalog.tools.length, 8);
  assert.equal(catalog.tools.find((tool) => tool.id === "merchant-audit").priceUsd, 0.25);
  assert.ok(catalog.tools.every((tool) => tool.sampleRequest && tool.sampleResponse));
  assert.match(page, /\/catalog\.json/);
  assert.match(instructions, /catalog\.json/);
});

test("one canonical manifest drives every public product contract", () => {
  const catalog = buildCatalog();
  const openapi = buildOpenApi();
  const instructions = buildLlmsText();
  assert.equal(productTools.length, 8);
  assert.equal(new Set(productTools.map((tool) => tool.endpoint)).size, 8);
  assert.equal(new Set(productTools.map((tool) => tool.mcpTool)).size, 8);
  assert.equal(openapi.paths["/api/stats"], undefined);
  for (const tool of productTools) {
    assert.equal(catalog.tools.find((item) => item.id === tool.id)?.priceUsd, tool.priceUsd);
    assert.equal(openapi.paths[tool.endpoint].post["x-x402"].amount, tool.amountAtomic);
    assert.match(instructions, new RegExp(tool.mcpTool));
  }
  assert.deepEqual(productTools.find((tool) => tool.id === "payment-guard")?.inputSchema.required, ["payerAddress", "serviceUrl", "maxAmountUsdc"]);
});

test("human surfaces are readable, accessible, and project-specific", async () => {
  const [layout, css, readme, sitemap] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/quiet.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("public/sitemap.xml", root), "utf8"),
  ]);
  assert.match(layout, /Skip to content/);
  assert.match(css, /:focus-visible/);
  assert.match(readme, /Anyway Possible/);
  assert.doesNotMatch(readme, /vinext-starter/);
  assert.match(sitemap, /https:\/\/anywaypossible\.com\/docs/);
  assert.match(sitemap, /https:\/\/anywaypossible\.com\/examples/);
});

test("paid verifier is bound to the authorized wallet and Base mainnet", async () => {
  const route = await readFile(new URL("app/api/verify/route.ts", root), "utf8");
  assert.match(route, /0xe5690D37805107C56f6195E65A262b234E0E5e75/);
  assert.match(route, /eip155:8453/);
  assert.match(route, /\$0\.01/);
  assert.match(route, /withX402FromHTTPServer/);
  assert.match(route, /serviceName: "Anyway Possible Web Evidence"/);
  assert.match(route, /\.\.\.declareDiscoveryExtension/);
});

test("verification blocks local targets and bounds response size", async () => {
  const verifier = await readFile(new URL("lib/verification.ts", root), "utf8");
  const workerConfig = await readFile(new URL("vite.config.ts", root), "utf8");
  assert.match(verifier, /localhost/);
  assert.match(verifier, /private and local network targets/);
  assert.match(verifier, /MAX_BYTES = 128 \* 1024/);
  assert.match(verifier, /MAX_REDIRECTS = 3/);
  assert.match(verifier, /cloudflare-dns\.com\/dns-query/);
  assert.match(verifier, /assertPublicDns/);
  assert.match(verifier, /a === 100 && b >= 64/);
  assert.match(verifier, /a === 203 && b === 0/);
  assert.match(verifier, /contentSha256/);
  assert.match(verifier, /receiptId/);
  assert.match(workerConfig, /global_fetch_strictly_public/);
});

test("public responses define defense-in-depth browser headers and a security contact", async () => {
  const [config, security] = await Promise.all([
    readFile(new URL("next.config.ts", root), "utf8"),
    readFile(new URL("public/.well-known/security.txt", root), "utf8"),
  ]);
  for (const header of ["Strict-Transport-Security", "Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.match(config, new RegExp(header));
  }
  assert.match(security, /Contact:/);
  assert.match(security, /Canonical: https:\/\/anywaypossible\.com\/\.well-known\/security\.txt/);
});

test("MCP Registry ownership uses a public domain proof without a private key", async () => {
  const proof = await readFile(new URL("public/.well-known/mcp-registry-auth", root), "utf8");
  assert.match(proof, /^v=MCPv1; k=ed25519; p=[A-Za-z0-9+/]+=*\s*$/);
  assert.doesNotMatch(proof, /PRIVATE KEY/);
});
