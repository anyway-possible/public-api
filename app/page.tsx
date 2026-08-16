import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicHome() {
  return (
    <main className="public-shell">
      <nav className="public-nav"><Link href="/">ANYWAY POSSIBLE</Link><div><a href="/api/health">STATUS</a><a href="/openapi.json">OPENAPI</a><a href="#api">API</a></div></nav>
      <section className="public-hero">
        <p className="eyebrow">X402 · SELLER INTELLIGENCE · $0.50</p>
        <h1>Know why your<br />API isn’t selling.</h1>
        <p className="lede">One paid audit of your Bazaar listings, semantic-search rank, competitor prices, 402 reliability, buyer signals, and Base USDC activity—with the three fixes most likely to move revenue.</p>
        <div className="public-actions"><a href="#api">Call the API →</a><a className="ghost" href="/api/health">Check status</a></div>
      </section>
      <section className="public-proof">
        <article><span>01</span><strong>Discovery evidence</strong><p>See exactly where your resources rank for the phrases buyers actually search.</p></article>
        <article><span>02</span><strong>Revenue reality</strong><p>Separate listing claims, public buyer signals, and observed Base USDC transfers without pretending they mean the same thing.</p></article>
        <article><span>03</span><strong>Prioritized action</strong><p>Receive a score, reliability checks, listing defects, competitor context, and three concrete next moves.</p></article>
      </section>
      <section className="product-grid" aria-label="API products">
        <article className="featured-product">
          <p className="eyebrow">X402 SELLER INTELLIGENCE</p>
          <h2>Merchant Audit</h2>
          <strong>$0.50 <span>USDC / report</span></strong>
          <p>Audit Bazaar visibility, listing quality, competitor pricing, x402 reliability, buyer reach, and inbound Base USDC—then get three prioritized revenue actions.</p>
          <code>POST /api/merchant-audit</code>
        </article>
        <article>
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
        <div><p className="eyebrow">FROM LISTING TO ACTION</p><h2>POST /api/merchant-audit</h2><p>Send a seller wallet and one to five buyer-intent searches. The report connects discovery, metadata, live 402 behavior, public usage signals, competitor prices, and inbound USDC without overstating what public data proves.</p><p><a href="/openapi.json">OpenAPI specification ↗</a> · <a href="/llms.txt">Agent instructions ↗</a></p></div>
        <pre><code>{`npx awal@latest x402 pay \\
  https://anywaypossible.com/api/merchant-audit \\
  -X POST \\
  -d '{"payTo":"0xe5690D37805107C56f6195E65A262b234E0E5e75","queries":["x402 merchant analytics","Base wallet balance"],"excludePayers":["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"]}' \\
  --max-amount 500000 --json`}</code></pre>
      </section>
      <footer className="public-footer"><b>ANYWAY POSSIBLE</b><span>Seller intelligence for the agent-to-agent economy.</span><a href="/api/health">Operational status ↗</a></footer>
    </main>
  );
}
