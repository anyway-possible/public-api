import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicHome() {
  return (
    <main className="public-shell">
      <nav className="public-nav"><Link href="/">ANYWAY POSSIBLE</Link><div><a href="/api/health">STATUS</a><a href="/openapi.json">OPENAPI</a><a href="#api">API</a></div></nav>
      <section className="public-hero">
        <p className="eyebrow">X402 · USDC · BASE · FROM $0.01</p>
        <h1>Proof before<br />agents proceed.</h1>
        <p className="lede">Live URL preflight checks and tamper-evident web evidence for autonomous agents. No account, API key, or subscription.</p>
        <div className="public-actions"><a href="#api">Call the API →</a><a className="ghost" href="/api/health">Check status</a></div>
      </section>
      <section className="public-proof">
        <article><span>01</span><strong>Machine evidence</strong><p>Assertions, redirect history, metadata, response headers, content hash, and observation time.</p></article>
        <article><span>02</span><strong>Agent-native payment</strong><p>HTTP 402 settlement in USDC on Base. No keys to provision for buyers.</p></article>
        <article><span>03</span><strong>Bounded execution</strong><p>Private-network blocking, response caps, redirect validation, and deterministic structured output.</p></article>
      </section>
      <section className="product-grid" aria-label="API products">
        <article>
          <p className="eyebrow">FAST PREFLIGHT</p>
          <h2>Check</h2>
          <strong>$0.01 <span>USDC / call</span></strong>
          <p>Confirm reachability, status, latency, redirects, and content type before an agent commits to a larger action.</p>
          <code>POST /api/check</code>
        </article>
        <article className="featured-product">
          <p className="eyebrow">FULL EVIDENCE</p>
          <h2>Verify</h2>
          <strong>$0.10 <span>USDC / call</span></strong>
          <p>Test expected status or text and receive a timestamped content hash, receipt ID, metadata, headers, and source trail.</p>
          <code>POST /api/verify</code>
        </article>
      </section>
      <section className="api-panel" id="api">
        <div><p className="eyebrow">START FOR ONE CENT</p><h2>POST /api/check</h2><p>Send a public URL plus an optional expected status. An unpaid request returns the x402 payment requirements automatically.</p><p><a href="/openapi.json">OpenAPI specification ↗</a> · <a href="/llms.txt">Agent instructions ↗</a></p></div>
        <pre><code>{`curl -X POST https://anywaypossible.com/api/verify \\
  -H "content-type: application/json" \\
  -d '{
    "url": "https://example.com",
    "expectedStatus": 200,
    "expectedText": "Example Domain"
  }'`}</code></pre>
      </section>
      <footer className="public-footer"><b>ANYWAY POSSIBLE</b><span>Built for agents that need evidence, not another opinion.</span><a href="/api/health">Operational status ↗</a></footer>
    </main>
  );
}
