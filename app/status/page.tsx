import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "../brand-mark";
import { tools } from "../../lib/product-catalog.mjs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Status — Anyway Possible",
  description: "Current public gateway and capability status for Anyway Possible APIs and MCP tools.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  const checkedAt = new Date();
  return (
    <main className="public-shell status-page">
      <nav className="public-nav">
        <Link className="public-brand" href="/" aria-label="Anyway Possible home"><BrandMark /><span>Anyway Possible<small>Service status</small></span></Link>
        <div><Link href="/">Home</Link><Link href="/docs">Docs</Link><a className="nav-cta" href="/api/health">Raw health JSON</a></div>
      </nav>
      <section className="status-hero">
        <div><p className="eyebrow"><span />CURRENT GATEWAY CHECK</p><h1>The gateway is responding.</h1><p>This page was rendered by the public application and lists the capabilities it currently advertises.</p></div>
        <aside className="status-summary"><span><i />Responding</span><strong>Anyway Possible Agent Utilities</strong><dl><div><dt>Network</dt><dd>Base</dd></div><div><dt>Settlement</dt><dd>USDC · x402 v2</dd></div><div><dt>Checked</dt><dd>{checkedAt.toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</dd></div></dl></aside>
      </section>
      <section className="status-content">
        <div className="status-grid"><article><span>API</span><strong>{tools.length} paid routes</strong><p>Account-free HTTP endpoints with explicit x402 payment requirements.</p></article><article><span>MCP</span><strong>{tools.length} agent tools</strong><p>Remote streamable HTTP server advertised at <code>/api/mcp</code>.</p></article><article><span>PAYMENTS</span><strong>Base · USDC</strong><p>Each paid request validates its own terms and live upstream evidence.</p></article></div>
        <div className="endpoint-list"><div><p className="eyebrow">WHAT THIS CHECK PROVES</p><h2>Current capability, stated precisely.</h2><p>It confirms that the web gateway responds and exposes the routes below. It does not claim a paid end-to-end settlement occurred at this timestamp, and no historical uptime percentage is published until enough independently recorded checks exist.</p><p><a href="/api/health">Inspect the raw health response →</a></p></div><ul>{tools.map((tool) => <li key={tool.id}><code>{tool.endpoint}</code><span>Advertised</span></li>)}</ul></div>
      </section>
      <footer className="public-footer status-footer"><Link className="footer-brand" href="/">Anyway Possible</Link><span>Decision infrastructure for autonomous agents.</span><div><a href="/api/health">Raw JSON</a><Link href="/docs">Docs</Link><a href="/llms.txt">llms.txt</a></div><small>© 2026 Anyway Possible</small></footer>
    </main>
  );
}
