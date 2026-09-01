import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicHome() {
  return (
    <main className="public-shell">
      <nav className="public-nav"><Link href="/">ANYWAY POSSIBLE</Link><div><a href="/api/health">STATUS</a><a href="/openapi.json">OPENAPI</a><a href="#api">API + MCP</a></div></nav>
      <section className="public-hero">
        <p className="eyebrow">PAID APIs FOR AUTONOMOUS AGENTS · BASE USDC</p>
        <h1>Know before your agent<br />pays, cites, or trusts.</h1>
        <p className="lede">Live merchant intelligence, Base treasury checks, citation evidence, and batch URL validation—discoverable through x402 and MCP, callable without an account, and priced from $0.001 USDC.</p>
        <div className="public-actions"><a href="#api">Call the API →</a><a className="ghost" href="/api/health">Check status</a></div>
      </section>
      <section className="public-proof">
        <article><span>01</span><strong>Inspect an x402 merchant</strong><p>Score visibility, reliability, buyers, competitor pricing, and observed Base USDC before changing a listing.</p></article>
        <article><span>02</span><strong>Preflight a payment</strong><p>Check wallet funding, gas, chain, recipient type, and common destination hazards before committing funds.</p></article>
        <article><span>03</span><strong>Verify web evidence</strong><p>Validate one URL or ten and return status, redirects, content evidence, hashes, and receipts an agent can act on.</p></article>
      </section>
      <section className="product-grid" aria-label="API products">
        <article className="featured-product">
          <p className="eyebrow">X402 MERCHANT INTELLIGENCE</p>
          <h2>Merchant Snapshot</h2>
          <strong>$0.05 <span>USDC / score</span></strong>
          <p>Diagnose why an x402 API is not generating revenue. Get the merchant grade, Bazaar visibility, buyer signals, observed external USDC, live payment count, and the single biggest issue.</p>
          <code>POST /api/merchant-snapshot</code>
        </article>
        <article>
          <p className="eyebrow">BASE USDC PAYMENT PREFLIGHT</p>
          <h2>Treasury</h2>
          <strong>$0.02 <span>USDC / call</span></strong>
          <p>Check funding and gas, confirm Base chain intent, classify the recipient, catch common destination hazards, and receive a proceed, fund, review, or reject decision plus a ready-to-use final guard request.</p>
          <code>POST /api/treasury</code>
        </article>
        <article>
          <p className="eyebrow">FULL WEB EVIDENCE</p>
          <h2>Verify</h2>
          <strong>$0.01 <span>USDC / call</span></strong>
          <p>Test expected status or text and receive a timestamped content hash, receipt ID, metadata, headers, and source trail.</p>
          <code>POST /api/verify</code>
        </article>
        <article>
          <p className="eyebrow">UP TO 10 URLS</p>
          <h2>Batch</h2>
          <strong>$0.01 <span>USDC / call</span></strong>
          <p>Validate citation lists, migrations, or API dependencies together. One failed URL never hides the other results.</p>
          <code>POST /api/batch</code>
        </article>
        <article>
          <p className="eyebrow">LIVE ONCHAIN DATA</p>
          <h2>Balance</h2>
          <strong>$0.001 <span>USDC / call</span></strong>
          <p>Read native ETH and Circle USDC balances, atomic values, and current Base block height before an agent pays or transacts.</p>
          <code>POST /api/base-balance</code>
        </article>
        <article>
          <p className="eyebrow">FAST URL PREFLIGHT</p>
          <h2>Check</h2>
          <strong>$0.001 <span>USDC / call</span></strong>
          <p>Confirm reachability, status, latency, redirects, and content type before an agent commits to a larger action.</p>
          <code>POST /api/check</code>
        </article>
        <article className="guard-product">
          <p className="eyebrow">FINAL SIGNING SAFETY</p><h2>Payment Guard</h2><strong>$0.01 <span>USDC / decision</span></strong>
          <p>Validate a live x402 challenge, Base network, USDC asset, price ceiling, recipient, buyer funding, gas reserve, and destination hazards immediately before signing.</p><code>POST /api/payment-guard</code>
        </article>
        <article className="audit-product">
          <p className="eyebrow">DEEP SELLER INTELLIGENCE</p>
          <h2>Merchant Audit</h2>
          <strong>$0.50 <span>USDC / report</span></strong>
          <p>Upgrade a snapshot into a full x402 revenue audit with ranking evidence, competitor prices, payment reliability, buyer reach, and three prioritized actions.</p>
          <code>POST /api/merchant-audit</code>
        </article>
      </section>
      <section className="sample-report" aria-labelledby="sample-title">
        <div className="sample-intro"><p className="eyebrow">REAL REPORT · ANYWAY POSSIBLE</p><h2 id="sample-title">Start with evidence,<br />then act.</h2><p>This public example was generated from our own merchant wallet. Internal validation payments are excluded from customer revenue.</p><a href="#api">Run your snapshot →</a></div>
        <div className="sample-score"><span>Merchant score</span><strong>88<small>/100</small></strong><b>B</b><p>Technically healthy. Discovery for x402 revenue searches remains the main gap.</p></div>
        <dl className="sample-facts">
          <div><dt>Catalog</dt><dd>7 listings</dd></div>
          <div><dt>Reliability sample</dt><dd>5 / 5 ready</dd></div>
          <div><dt>“Base wallet balance”</dt><dd>#1</dd></div>
          <div><dt>“Agent treasury”</dt><dd>#2</dd></div>
          <div><dt>External inbound</dt><dd>$0.004 USDC</dd></div>
          <div><dt>Independent payers</dt><dd>2</dd></div>
        </dl>
      </section>
      <section className="api-panel" id="api">
        <div><p className="eyebrow">CHOOSE BY JOB</p><h2>Start with the outcome.</h2><p>Use Snapshot for merchant diagnosis, Treasury before a Base payment, Verify for one evidence-bearing URL, or Batch for up to ten. Every response is machine-readable and every existing route remains stable.</p><p><b>Remote MCP:</b> <code>https://anywaypossible.com/mcp</code></p><p><a href="/openapi.json">OpenAPI specification ↗</a> · <a href="/llms.txt">Agent instructions ↗</a> · <a href="/guarded-purchase.json">Guarded purchase workflow ↗</a></p></div>
        <pre><code>{`npx awal@latest x402 pay \\
  https://anywaypossible.com/api/merchant-snapshot \\
  -X POST \\
  -d '{"payTo":"0xe5690D37805107C56f6195E65A262b234E0E5e75","queries":["x402 merchant analytics","Base wallet balance"],"excludePayers":["0x44D2DC46f987D1F2fa55e281934aDDd193a1A377"]}' \\
  --max-amount 50000 --json`}</code></pre>
      </section>
      <footer className="public-footer"><b>ANYWAY POSSIBLE</b><span>Decision-ready data for autonomous agents.</span><a href="/api/health">Operational status ↗</a></footer>
    </main>
  );
}
