import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public surface explains the paid agent product", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const section of ["X402 API REVENUE DIAGNOSIS", "Why isn’t your", "POST /api/payment-guard", "POST /api/merchant-snapshot", "POST /api/merchant-audit", "POST /api/treasury", "POST /api/base-balance", "POST /api/check", "POST /api/batch", "POST /api/verify", "Prioritized action"]) {
    assert.match(page, new RegExp(section));
  }
});

test("payment guard validates a purchase before an agent signs", async () => {
  const route = await readFile(new URL("app/api/payment-guard/route.ts", root), "utf8");
  assert.match(route, /x402 Payment Guard/);
  assert.match(route, /\$0\.01/);
  assert.match(route, /platform\/v2\/x402\/validate/);
  assert.match(route, /price_ceiling/);
  assert.match(route, /safe_to_sign/);
  assert.match(route, /expectedPayTo/);
});

test("merchant snapshot is the low-friction audit funnel", async () => {
  const route = await readFile(new URL("app/api/merchant-snapshot/route.ts", root), "utf8");
  assert.match(route, /Why Is My x402 API Not Selling/);
  assert.match(route, /\$0\.05/);
  assert.match(route, /amountUsd: 0\.05/);
  assert.match(route, /increase x402 revenue/);
  assert.match(route, /x402 seller intelligence/);
  assert.match(route, /biggestIssue/);
  assert.match(route, /\/api\/merchant-audit/);
  assert.match(route, /priceUsd: 0\.5/);
});

test("merchant audit is the flagship revenue product", async () => {
  const [route, audit] = await Promise.all([
    readFile(new URL("app/api/merchant-audit/route.ts", root), "utf8"),
    readFile(new URL("lib/merchant-audit.ts", root), "utf8"),
  ]);
  assert.match(route, /x402 API Revenue Audit/);
  assert.match(route, /\$0\.50/);
  assert.match(route, /amountUsd: 0\.5/);
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
  const route = await readFile(new URL("app/api/treasury/route.ts", root), "utf8");
  assert.match(route, /Anyway Possible Base Payment Preflight/);
  assert.match(route, /\$0\.02/);
  assert.match(route, /plannedSpendUsdc/);
  assert.match(route, /minGasReserveEth/);
  assert.match(route, /usdcShortfall/);
  assert.match(route, /gasShortfallEth/);
  assert.match(route, /paymentCapacity/);
  assert.match(route, /destinationAddress/);
  assert.match(route, /safeToProceed/);
  assert.match(route, /safe_to_pay/);
  assert.match(route, /review_destination/);
  assert.match(route, /destinationIsZero/);
  assert.match(route, /destinationIsTokenContract/);
  assert.match(route, /eth_getCode/);
  assert.match(route, /expectedChainId/);
  assert.match(route, /limitations/);
  assert.match(route, /agent treasury/);
  assert.match(route, /wallet readiness/);
  assert.match(route, /Base gas reserve/);
  assert.match(route, /amountUsd: 0\.02/);
});

test("Base wallet balance follows demonstrated agent demand", async () => {
  const route = await readFile(new URL("app/api/base-balance/route.ts", root), "utf8");
  assert.match(route, /Anyway Possible Base Wallet Balance/);
  assert.match(route, /eth_getBalance/);
  assert.match(route, /base-rpc\.publicnode\.com/);
  assert.match(route, /base-mainnet\.public\.blastapi\.io/);
  assert.match(route, /70a08231/);
  assert.match(route, /0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/);
  assert.match(route, /\$0\.001/);
  assert.match(route, /agent treasury/);
  assert.match(route, /ethAtomic: "0", usdcAtomic: "0"/);
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
  const dashboard = await readFile(new URL("db/dashboard.ts", root), "utf8");
  assert.match(analytics, /SELF_TEST_PAYER/);
  assert.match(analytics, /payload\?\.authorization\?\.from/);
  assert.match(analytics, /userAgent === "node"/);
  assert.match(dashboard, /testVolumeUsd/);
  assert.match(dashboard, /customerEvents/);
  assert.match(dashboard, /challengesByEndpoint/);
});

test("agent documentation describes the transaction-level decision", async () => {
  const [openapi, instructions] = await Promise.all([
    readFile(new URL("public/openapi.json", root), "utf8"),
    readFile(new URL("public/llms.txt", root), "utf8"),
  ]);
  assert.doesNotThrow(() => JSON.parse(openapi));
  assert.match(openapi, /preflightBaseUsdcPayment/);
  assert.match(openapi, /destinationAddress/);
  assert.match(openapi, /safeToProceed/);
  assert.match(instructions, /proceed\/fund\/review\/reject/);
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
  assert.match(verifier, /localhost/);
  assert.match(verifier, /private and local network targets/);
  assert.match(verifier, /MAX_BYTES = 128 \* 1024/);
  assert.match(verifier, /MAX_REDIRECTS = 3/);
  assert.match(verifier, /contentSha256/);
  assert.match(verifier, /receiptId/);
});
