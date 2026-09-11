import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../site-chrome";
import { SITE_URL, tools } from "../../lib/product-catalog.mjs";

export const metadata: Metadata = {
  title: "Agent Integration Guide — Anyway Possible",
  description: "Connect an AI agent to one free tool recommender and eight x402-paid decision tools over MCP or direct HTTP, with exact request examples and payment flow.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  const endpoint = `${SITE_URL}/api/mcp`;
  const sharedConfig = { mcpServers: { "anyway-possible": { url: endpoint } } };
  const paidClientExample = `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapMCPClientWithPayment } from "@x402/mcp";

// Supply walletAccount through your secure signer. Never embed a private key.
const mcp = new Client({ name: "buyer-agent", version: "1.0.0" });
const payments = new x402Client().register(
  "eip155:8453",
  new ExactEvmScheme(walletAccount),
);
const client = wrapMCPClientWithPayment(mcp, payments, {
  autoPayment: true,
  onPaymentRequested: async ({ paymentRequired }) => {
    const quote = paymentRequired.accepts[0];
    if (!quote) return false;
    return quote.network === "eip155:8453" && Number(quote.amount) <= 20_000;
  },
});

await client.connect(
  new StreamableHTTPClientTransport(new URL("${endpoint}")),
);
await client.callTool("recommend_tool", {
  goal: "Is this Base wallet ready to pay 0.05 USDC?",
  maxPriceUsd: 0.02,
});
const result = await client.callTool("treasury_preflight", {
  address: walletAccount.address,
  plannedSpendUsdc: "0.05",
  expectedChainId: 8453,
});
console.log(result.content, result.paymentResponse?.transaction);`;

  return <main className="reference-shell">
    <SiteHeader />
    <section className="reference-hero">
      <p className="reference-eyebrow">EXACT CONTRACTS · NO ACCOUNT · PAY PER ANSWER</p>
      <h1>Connect once.<br />Choose by decision.</h1>
      <p>The fastest path is MCP: add one remote endpoint, call <code>recommend_tool</code> for free, then let the agent choose among eight paid decision tools. Direct HTTP is available when you need an explicit route and request contract.</p>
    </section>
    <section className="reference-connect" id="connect">
      <header>
        <p className="reference-eyebrow">WORKS WHERE AGENTS WORK</p>
        <h2>Add one remote server.</h2>
        <p>Connection and free tool discovery require no account. Paid calls require an x402-capable wallet or client; the agent sees the exact USDC price before it decides whether to sign.</p>
      </header>
      <div className="reference-client-grid">
        <article>
          <span>CODEX</span>
          <h3>Settings → MCP servers</h3>
          <p>Add a Streamable HTTP server named <strong>Anyway Possible</strong>, paste the endpoint below, save, and restart.</p>
          <pre><code>{`[mcp_servers.anyway-possible]\nurl = "${endpoint}"`}</code></pre>
        </article>
        <article>
          <span>CLAUDE CODE</span>
          <h3>One command</h3>
          <p>Add the remote HTTP server at user scope, then run <code>claude mcp list</code> to confirm it is connected.</p>
          <pre><code>{`claude mcp add --transport http --scope user anyway-possible ${endpoint}`}</code></pre>
        </article>
        <article>
          <span>CURSOR</span>
          <h3>Settings → Tools &amp; MCP</h3>
          <p>Add a custom MCP server or paste this entry into your MCP configuration.</p>
          <pre><code>{JSON.stringify(sharedConfig, null, 2)}</code></pre>
        </article>
        <article>
          <span>ANY MCP CLIENT</span>
          <h3>Streamable HTTP</h3>
          <p>Use the public endpoint directly. Initialize the server, list tools, and call <code>recommend_tool</code> free before a paid tool.</p>
          <pre><code>{endpoint}</code></pre>
        </article>
      </div>
      <p className="reference-wallet-note"><strong>Important:</strong> Connecting exposes the tools, but it does not give the agent spending authority. Paid execution only works when its client can answer an x402 payment challenge with a funded Base USDC wallet.</p>
    </section>
    <section className="reference-paid-client" id="paid-client">
      <header>
        <p className="reference-eyebrow">DISCOVERY IS FREE · PAYMENT IS EXPLICIT</p>
        <h2>Make the client payment-capable.</h2>
        <p>A normal MCP client can initialize, list tools, and call the free recommender. To run a paid tool, wrap the MCP client with <code>@x402/mcp</code>, provide a secure Base signer, and enforce a spending policy before automatic payment is allowed.</p>
      </header>
      <div className="reference-code"><span>COMPLETE MCP PURCHASE FLOW · TYPESCRIPT</span><pre><code>{paidClientExample}</code></pre></div>
      <p className="reference-wallet-note"><strong>Safety:</strong> This example approves only Base mainnet quotes up to 0.02 USDC. Keep signing material in a wallet or secret manager, fund the wallet with Base USDC, and tighten the policy for your environment.</p>
    </section>
    <section className="reference-grid" id="tools">
      <div className="reference-intro"><h2>Start free. Pay only for evidence.</h2><p>Describe the decision to <code>recommend_tool</code>. It returns the best tool, exact price, required inputs, alternatives, and next step without triggering payment. Every paid request below is generated from the same product catalog as the machine-readable OpenAPI and JSON catalog.</p><div className="reference-code"><span>FREE MCP ROUTER</span><pre><code>{JSON.stringify({ tool: "recommend_tool", arguments: { goal: "Is this x402 payment safe to sign?", maxPriceUsd: 0.02 } }, null, 2)}</code></pre></div><div className="reference-code"><span>MCP CONFIGURATION</span><pre><code>{JSON.stringify(sharedConfig, null, 2)}</code></pre></div></div>
      {tools.map((tool) => <article className="reference-card" id={tool.id} key={tool.id}><header><div><span>{tool.tag}</span><h2>{tool.name}</h2><p className="reference-question">{tool.question}</p></div><strong className="reference-price">{tool.price} USDC</strong></header><p>{tool.description}</p><div className="reference-meta"><code>POST {tool.endpoint}</code><code>MCP {tool.mcpTool}</code><code>Base · x402 v2</code></div><div className="reference-code-grid"><div className="reference-code"><span>REQUEST</span><pre><code>{JSON.stringify(tool.sampleRequest, null, 2)}</code></pre></div><div className="reference-code"><span>REPRESENTATIVE RESULT</span><pre><code>{JSON.stringify(tool.sampleResponse, null, 2)}</code></pre></div></div></article>)}
    </section>
    <section className="reference-callout"><h2>Payment stays under agent control.</h2><p>The first HTTP request returns the exact price, network, asset, recipient, and timeout. The agent signs only when those terms match its policy. Payment Guard can perform the final validation immediately before signing another x402 purchase.</p><nav><a href="/guarded-purchase.json">Purchase workflow ↗</a><a href="/openapi.json">OpenAPI JSON ↗</a><a href="/catalog.json">Machine catalog ↗</a><a href="/llms.txt">llms.txt ↗</a></nav></section>
    <SiteFooter />
  </main>;
}
