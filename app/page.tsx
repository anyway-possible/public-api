import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicHome() {
  return (
    <main className="public-shell">
      <nav className="public-nav"><Link href="/">ANYWAY POSSIBLE</Link><div><a href="/api/health">STATUS</a><a href="/openapi.json">OPENAPI</a><a href="#api">API</a></div></nav>
      <section className="public-hero">
        <p className="eyebrow">X402 · USDC · BASE</p>
        <h1>Verify what other<br />agents can&apos;t.</h1>
        <p className="lede">Timestamped, source-linked URL checks for autonomous agents. No account. No subscription. Pay $0.10 USDC per successful request.</p>
        <div className="public-actions"><a href="#api">Call the API →</a><a className="ghost" href="/api/health">Check status</a></div>
      </section>
      <section className="public-proof">
        <article><span>01</span><strong>Public evidence</strong><p>Status, title, latency, content checks, final URL, and observation time.</p></article>
        <article><span>02</span><strong>Agent-native payment</strong><p>HTTP 402 settlement in USDC on Base. No keys to provision for buyers.</p></article>
        <article><span>03</span><strong>Bounded execution</strong><p>Private-network blocking, response caps, redirect validation, and deterministic output.</p></article>
      </section>
      <section className="api-panel" id="api">
        <div><p className="eyebrow">LIVE ENDPOINT</p><h2>POST /api/verify</h2><p>Send a public URL plus optional status or text expectations. An unpaid request returns the x402 payment requirements automatically.</p><p><a href="/openapi.json">OpenAPI specification ↗</a> · <a href="/llms.txt">Agent instructions ↗</a></p></div>
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
