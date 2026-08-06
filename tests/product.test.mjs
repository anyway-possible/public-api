import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public surface explains the paid agent product", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const section of ["X402 · USDC · BASE", "Verify what other", "POST /api/verify", "Bounded execution"]) {
    assert.match(page, new RegExp(section));
  }
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
});
