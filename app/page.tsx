import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicHome() {
  return (
    <main className="public-shell">
      <nav className="public-nav"><Link href="/">ANYWAY POSSIBLE</Link><div><a href="/api/health">STATUS</a><a href="/openapi.json">OPENAPI</a><a href="#api">API</a></div></nav>
      <section className="public-hero">
        <p className="eyebrow">X402 · USDC · BASE · FROM $0.001</p>
        <h1>Preflight before<br />agents pay.</h1>
        <p className="lede">A machine-readable Base USDC payment decision before an autonomous agent signs—plus wallet balances, URL checks, and tamper-evident web evidence. No account, API key, or subscription.</p>
        <div className="public-actions"><a href="#api">Call the API →</a><a className="ghost" href="/api/health">Check status</a></div>
      </section>
      <section className="public-proof">
        <article><span>01</span><strong>Machine evidence</strong><p>Assertions, redirect history, metadata, response headers, content hash, and observation time.</p></article>
        <article><span>02</span><strong>Agent-native payment</strong><p>HTTP 402 settlement in USDC on Base. No keys to provision for buyers.</p></article>
        <article><span>03</span><strong>Bounded execution</strong><p>Private-network blocking, response caps, redirect validation, and deterministic structured output.</p></article>
      </section>
      <section className="product-grid" aria-label="API products">
        <article className="featured-product">
          <p className="eyebrow">BASE USDC PAYMENT PREFLIGHT</p>
          <h2>Preflight</h2>
          <strong>$0.02 <span>USDC / call</span></strong>
          <p>Check funding and gas, confirm Base chain intent, classify the recipient, catch common destination hazards, and receive a proceed, fund, review, or reject decision.</p>
          <code>POST /api/treasury</code>
        </article>
        <article>
          <p className="eyebrow">LIVE ONCHAIN DATA</p>
          <h2>Balance</h2>
          <strong>$0.001 <span>USDC / call</span></strong>
          <p>Read native ETH and Circle USDC balances, atomic values, and current Base block height before an agent pays or transacts.</p>
          <code>POST /api/base-balance</code>
        </article>
        <article>
          <p className="eyebrow">FAST PREFLIGHT</p>
          <h2>Check</h2>
          <strong>$0.001 <span>USDC / call</span></strong>
          <p>Confirm reachability, status, latency, redirects, and content type before an agent commits to a larger action.</p>
          <code>POST /api/check</code>
        </article>
        <article>
          <p className="eyebrow">UP TO 10 URLS</p>
          <h2>Batch</h2>
          <strong>$0.01 <span>USDC / call</span></strong>
          <p>Validate citation lists, migrations, or API dependencies together. One failed URL never hides the other results.</p>
          <code>POST /api/batch</code>
        </article>
        <article>
          <p className="eyebrow">FULL EVIDENCE</p>
          <h2>Verify</h2>
          <strong>$0.01 <span>USDC / call</span></strong>
          <p>Test expected status or text and receive a timestamped content hash, receipt ID, metadata, headers, and source trail.</p>
          <code>POST /api/verify</code>
        </article>
      </section>
      <section className="api-panel" id="api">
        <div><p className="eyebrow">FROM INTENT TO DECISION</p><h2>POST /api/treasury</h2><p>Send the paying wallet, intended recipient, and USDC amount. The result tells an agent whether to proceed, fund, review, or reject—with every check and limitation returned as structured data. Coinbase Agentic Wallet handles the x402 signature automatically.</p><p><a href="/openapi.json">OpenAPI specification ↗</a> · <a href="/llms.txt">Agent instructions ↗</a></p></div>
        <pre><code>{`npx awal@latest x402 pay \\
  https://anywaypossible.com/api/treasury \\
  -X POST \\
  -d '{"address":"0x1111111111111111111111111111111111111111","destinationAddress":"0x2222222222222222222222222222222222222222","plannedSpendUsdc":"1.00","minGasReserveEth":"0.00005","expectedChainId":8453}' \\
  --max-amount 20000 --json`}</code></pre>
      </section>
      <footer className="public-footer"><b>ANYWAY POSSIBLE</b><span>Built for agents that need evidence, not another opinion.</span><a href="/api/health">Operational status ↗</a></footer>
    </main>
  );
}
