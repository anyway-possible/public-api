import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public surface explains the paid agent product", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const section of ["X402 · USDC · BASE", "Proof before", "POST /api/base-balance", "POST /api/check", "POST /api/batch", "POST /api/verify", "Bounded execution"]) {
    assert.match(page, new RegExp(section));
  }
});

test("Base wallet balance follows demonstrated agent demand", async () => {
  const route = await readFile(new URL("app/api/base-balance/route.ts", root), "utf8");
  assert.match(route, /Anyway Possible Base Wallet Balance/);
  assert.match(route, /eth_getBalance/);
  assert.match(route, /70a08231/);
  assert.match(route, /0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/);
  assert.match(route, /\$0\.001/);
  assert.match(route, /agent treasury/);
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
