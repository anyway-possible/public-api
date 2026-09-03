import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "../brand-mark";
import { SITE_URL, tools } from "../../lib/product-catalog.mjs";

export const metadata: Metadata = {
  title: "Agent Integration Guide — Anyway Possible",
  description: "Connect an AI agent to eight x402-paid decision tools over MCP or direct HTTP, with exact request examples and payment flow.",
  alternates: { canonical: "/docs" },
};

function Header() {
  return <nav className="reference-nav"><Link href="/" aria-label="Anyway Possible home"><span className="quiet-wordmark"><BrandMark /><span><strong>Anyway Possible</strong><small>Agent integration guide</small></span></span></Link><div><Link href="/examples">Examples</Link><Link href="/guides">Guides</Link><Link href="/status">Status</Link><a className="reference-cta" href="#tools">Choose a tool</a></div></nav>;
}

export default function DocsPage() {
  return <main className="reference-shell"><Header /><section className="reference-hero"><p className="reference-eyebrow">EXACT CONTRACTS · NO ACCOUNT · PAY PER ANSWER</p><h1>Connect once.<br />Choose by decision.</h1><p>The fastest path is MCP: add one remote endpoint and let the agent discover all eight tools. Direct HTTP is available when you need an explicit route and request contract.</p></section><section className="reference-grid" id="tools"><div className="reference-intro"><h2>One source of truth.</h2><p>Every request below is generated from the same product catalog as the machine-readable OpenAPI and JSON catalog. Unpaid calls return an x402 v2 payment requirement; the agent validates it and repeats the request with a payment signature.</p><div className="reference-code"><span>MCP CONFIGURATION</span><pre><code>{JSON.stringify({ mcpServers: { "anyway-possible": { url: `${SITE_URL}/api/mcp` } } }, null, 2)}</code></pre></div></div>{tools.map((tool) => <article className="reference-card" id={tool.id} key={tool.id}><header><div><span>{tool.tag}</span><h2>{tool.name}</h2><p className="reference-question">{tool.question}</p></div><strong className="reference-price">{tool.price} USDC</strong></header><p>{tool.description}</p><div className="reference-meta"><code>POST {tool.endpoint}</code><code>MCP {tool.mcpTool}</code><code>Base · x402 v2</code></div><div className="reference-code-grid"><div className="reference-code"><span>REQUEST</span><pre><code>{JSON.stringify(tool.sampleRequest, null, 2)}</code></pre></div><div className="reference-code"><span>REPRESENTATIVE RESULT</span><pre><code>{JSON.stringify(tool.sampleResponse, null, 2)}</code></pre></div></div></article>)}</section><section className="reference-callout"><h2>Payment stays under agent control.</h2><p>The first HTTP request returns the exact price, network, asset, recipient, and timeout. The agent signs only when those terms match its policy. Payment Guard can perform the final validation immediately before signing another x402 purchase.</p><nav><a href="/guarded-purchase.json">Purchase workflow ↗</a><a href="/openapi.json">OpenAPI JSON ↗</a><a href="/catalog.json">Machine catalog ↗</a><a href="/llms.txt">llms.txt ↗</a></nav></section><footer className="reference-footer"><Link href="/">Anyway Possible</Link><span>Eight decision-ready tools over MCP and HTTP.</span><Link href="/examples">View complete examples →</Link></footer></main>;
}

