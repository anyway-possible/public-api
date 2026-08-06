import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public surface explains the paid agent product", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const section of ["X402 · USDC · BASE", "Proof before", "POST /api/check", "POST /api/verify", "Bounded execution"]) {
    assert.match(page, new RegExp(section));
  }
});

test("one-cent entry check is discoverable and uses Base USDC", async () => {
  const route = await readFile(new URL("app/api/check/route.ts", root), "utf8");
  assert.match(route, /\$0\.01/);
  assert.match(route, /eip155:8453/);
  assert.match(route, /declareDiscoveryExtension/);
  assert.match(route, /amountUsd: 0\.01/);
});

test("analytics separates internal validation from customer revenue", async () => {
  const analytics = await readFile(new URL("lib/analytics.ts", root), "utf8");
  const dashboard = await readFile(new URL("db/dashboard.ts", root), "utf8");
  assert.match(analytics, /SELF_TEST_PAYER/);
  assert.match(analytics, /payload\?\.authorization\?\.from/);
  assert.match(dashboard, /testVolumeUsd/);
  assert.match(dashboard, /customerEvents/);
});

test("paid verifier is bound to the authorized wallet and Base mainnet", async () => {
  const route = await readFile(new URL("app/api/verify/route.ts", root), "utf8");
  assert.match(route, /0xe5690D37805107C56f6195E65A262b234E0E5e75/);
  assert.match(route, /eip155:8453/);
  assert.match(route, /\$0\.10/);
  assert.match(route, /withX402FromHTTPServer/);
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
