import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Status — Anyway Possible",
  description: "Current public service status for Anyway Possible APIs and MCP tools.",
  alternates: { canonical: "/status" },
};

const paidEndpoints = ["/api/payment-guard", "/api/merchant-snapshot", "/api/merchant-audit", "/api/treasury", "/api/base-balance", "/api/check", "/api/batch", "/api/verify"];
const mcpTools = ["merchant_snapshot", "treasury_preflight", "verify_web_evidence", "batch_check_urls"];

export default function StatusPage() {
  const health = { service: "Anyway Possible Agent Utilities", release: "Stable", network: "Base", paidEndpoints, mcp: { endpoint: "/api/mcp", tools: mcpTools }, checkedAt: new Date().toISOString() };
  return (
    <main className="public-shell status-page">
      <nav className="public-nav">
        <Link className="public-brand" href="/" aria-label="Anyway Possible home"><span className="brand-mark" aria-hidden="true"><i>A</i><i>P</i></span><span>Anyway Possible<small>Service status</small></span></Link>
        <div><Link href="/">Home</Link><a href="/openapi.json">Docs</a><a className="nav-cta" href="/api/health">Raw health JSON</a></div>
      </nav>
      <section className="status-hero">
        <div><p className="eyebrow"><span />LIVE SERVICE STATUS</p><h1>Service is responding.</h1><p>The public gateway is available and advertising its configured API and MCP capabilities.</p></div>
        <aside className="status-summary"><span><i />Operational</span><strong>{health.service}</strong><dl><div><dt>Network</dt><dd>{health.network}</dd></div><div><dt>Release</dt><dd>{health.release}</dd></div><div><dt>Checked</dt><dd>{new Date(health.checkedAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</dd></div></dl></aside>
      </section>
      <section className="status-content">
        <div className="status-grid"><article><span>API</span><strong>{health.paidEndpoints.length} paid routes</strong><p>Account-free HTTP endpoints with x402 payment requirements.</p></article><article><span>MCP</span><strong>{health.mcp.tools.length} agent tools</strong><p>Remote streamable HTTP server available at <code>{health.mcp.endpoint}</code>.</p></article><article><span>PAYMENTS</span><strong>Base · USDC</strong><p>Per-call pricing through the x402 payment protocol.</p></article></div>
        <div className="endpoint-list"><div><p className="eyebrow">ADVERTISED API ROUTES</p><h2>Configured capabilities</h2><p>This page confirms that the public service is responding. Individual paid calls perform their own live validation when invoked.</p></div><ul>{health.paidEndpoints.map((endpoint) => <li key={endpoint}><code>{endpoint}</code><span>Configured</span></li>)}</ul></div>
      </section>
      <footer className="public-footer status-footer"><Link className="footer-brand" href="/">Anyway Possible</Link><span>Decision infrastructure for autonomous agents.</span><div><a href="/api/health">Raw JSON</a><a href="/openapi.json">Docs</a><a href="/llms.txt">llms.txt</a></div><small>© 2026 Anyway Possible</small></footer>
    </main>
  );
}
