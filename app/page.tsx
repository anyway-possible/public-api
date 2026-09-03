import Link from "next/link";

export const dynamic = "force-dynamic";

const products = [
  { name: "Merchant Snapshot", price: "$0.05", tag: "SELLER INTELLIGENCE", copy: "Find the biggest reason an x402 listing is not earning, with visibility, pricing, buyer, and reliability signals.", path: "POST /api/merchant-snapshot", tone: "mint" },
  { name: "Treasury", price: "$0.02", tag: "PAYMENT PREFLIGHT", copy: "Check funding, gas, chain intent, recipient type, and destination hazards before an agent commits funds.", path: "POST /api/treasury", tone: "ink" },
  { name: "Payment Guard", price: "$0.01", tag: "SIGNING SAFETY", copy: "Validate a live x402 challenge, price ceiling, asset, network, buyer funding, and recipient immediately before signing.", path: "POST /api/payment-guard", tone: "blue" },
  { name: "Verify", price: "$0.01", tag: "WEB EVIDENCE", copy: "Test a URL and return status, expected content, a timestamped hash, receipt ID, metadata, and source trail.", path: "POST /api/verify", tone: "plain" },
  { name: "Batch", price: "$0.01", tag: "UP TO 10 URLS", copy: "Validate citation lists, migrations, or dependencies together without one failed URL hiding the other results.", path: "POST /api/batch", tone: "plain" },
  { name: "Base Balance", price: "$0.001", tag: "ONCHAIN DATA", copy: "Read native ETH and Circle USDC balances, atomic values, and current Base block height.", path: "POST /api/base-balance", tone: "plain" },
  { name: "Check", price: "$0.001", tag: "FAST URL PREFLIGHT", copy: "Confirm reachability, status, latency, redirects, and content type before a larger action.", path: "POST /api/check", tone: "plain" },
  { name: "Merchant Audit", price: "$0.25", tag: "14-DAY PRICE TEST", copy: "Get ranking evidence, competitor prices, payment reliability, buyer reach, and three prioritized actions.", path: "POST /api/merchant-audit", tone: "plain" },
];

export default function PublicHome() {
  return (
    <main className="public-shell">
      <nav className="public-nav">
        <Link className="public-brand" href="/" aria-label="Anyway Possible home"><span className="brand-mark" aria-hidden="true"><i>A</i><i>P</i></span><span>Anyway Possible<small>Agent decision infrastructure</small></span></Link>
        <div><a href="#products">Tools</a><a href="#how-it-works">How it works</a><a href="/openapi.json">Docs</a><a className="nav-cta" href="#api">Connect via MCP</a></div>
      </nav>

      <section className="public-hero">
        <div className="hero-copy"><p className="eyebrow"><span />PAID APIs FOR AUTONOMOUS AGENTS</p><h1>Decision-ready checks for agents that <em>pay, cite, and act.</em></h1><p className="lede">Anyway Possible gives autonomous agents fast, machine-readable checks before they spend money, trust a source, or make a recommendation.</p><p className="hero-formula"><b>Ask a question.</b> Get live evidence, a clear decision, and the next action.</p><div className="public-actions"><a href="#api">Connect via MCP <span>→</span></a><a className="ghost" href="#products">Explore tools</a></div></div>
        <aside className="hero-signal" aria-label="Live service summary"><div className="signal-top"><span><i />Systems live</span><b>BASE</b></div><div className="signal-decision"><small>PRE-PURCHASE CHECK</small><strong>PROCEED</strong><p>7 checks passed · evidence attached</p></div><dl><div><dt>Network</dt><dd>Base</dd></div><div><dt>Payment</dt><dd>x402 USDC</dd></div><div><dt>Access</dt><dd>No account</dd></div></dl></aside>
      </section>

      <section className="trust-strip" aria-label="Service attributes"><span><i />Live on Base</span><span>x402 USDC payments</span><span>No accounts or API keys</span><span>MCP Registry listed</span><a href="/status">View status ↗</a></section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading"><p className="eyebrow">HOW IT WORKS</p><h2>A small check before a big action.</h2><p>Agents move quickly. We add the moment of evidence they need to move responsibly.</p></div>
        <div className="how-grid"><article><span>01</span><div className="step-icon">?</div><h3>Ask</h3><p>The agent sends the decision it needs help with: pay, trust, verify, or diagnose.</p></article><article><span>02</span><div className="step-icon">✓</div><h3>Check</h3><p>Anyway Possible gathers live web or Base signals and turns them into a clear result.</p></article><article><span>03</span><div className="step-icon">→</div><h3>Act</h3><p>The agent gets structured evidence, a receipt, and a decision it can use immediately.</p></article></div>
      </section>

      <section className="products-section" id="products">
        <div className="section-heading products-heading"><div><p className="eyebrow">CHOOSE BY JOB</p><h2>Useful answers.<br />Tiny prices.</h2></div><p>Start with Merchant Snapshot for selling decisions or Treasury for payment decisions. Six lower-priced utilities handle focused checks. Every response is machine-readable over HTTP, with the core toolkit also available through MCP.</p></div>
        <div className="product-grid">{products.map((product) => <article className={`product-card ${product.tone}`} key={product.name}><div className="product-meta"><span>{product.tag}</span><strong>{product.price}<small> USDC</small></strong></div><h3>{product.name}</h3><p>{product.copy}</p><code>{product.path}</code></article>)}</div>
      </section>

      <section className="discovery-section" aria-labelledby="discovery-title">
        <div className="section-heading"><p className="eyebrow">WHERE AGENTS FIND US</p><h2 id="discovery-title">Bazaar is one door, not the whole building.</h2><p>Anyway Possible is available through three complementary paths, so an agent does not need to belong to a single marketplace or platform.</p></div>
        <div className="discovery-grid"><article><span>01</span><h3>Coinbase Bazaar</h3><p>x402-native buyers can discover supported endpoints and pay per call with USDC on Base.</p><small>MARKETPLACE DISCOVERY</small></article><article><span>02</span><h3>MCP Registry</h3><p>Agents can connect to one remote MCP server and discover the core decision tools automatically.</p><code>io.github.anyway-possible/agent-utilities</code></article><article><span>03</span><h3>Direct HTTP</h3><p>Any compatible agent or application can inspect sample inputs and outputs before paying, then call stable routes directly.</p><div><a href="/catalog.json">Tool catalog ↗</a><a href="/openapi.json">OpenAPI ↗</a><a href="/llms.txt">llms.txt ↗</a></div></article></div>
      </section>

      <section className="sample-report" aria-labelledby="sample-title">
        <div className="sample-intro"><p className="eyebrow">PROOF, NOT PROMISES</p><h2 id="sample-title">We use it on ourselves.</h2><p>This public merchant snapshot was generated from Anyway Possible&apos;s own wallet. It shows the complete job: ask a business question, inspect live evidence, identify the problem, and return the next action.</p><div className="case-study"><div><span>QUESTION</span><p>Why isn&apos;t this x402 API generating more revenue?</p></div><div><span>CHECKED</span><p>Bazaar visibility, listing reliability, competitive prices, buyer activity, and onchain payments.</p></div><div><span>FOUND</span><p>The API works reliably and ranks for two searches, but broader purchase-intent discovery is the main gap.</p></div><div><span>NEXT ACTION</span><p>Improve listing language and target uncovered buyer searches before changing the price.</p></div></div><a href="#api">Run your own snapshot <span>→</span></a></div>
        <div className="sample-score"><span>Merchant score</span><strong>88<small>/100</small></strong><b>B</b><p>Technically healthy. Discovery remains the main revenue gap.</p></div>
        <dl className="sample-facts"><div><dt>Catalog</dt><dd>7 listings</dd></div><div><dt>Reliability sample</dt><dd>5 / 5 ready</dd></div><div><dt>“Base wallet balance”</dt><dd>#1</dd></div><div><dt>“Agent treasury”</dt><dd>#2</dd></div><div><dt>External inbound</dt><dd>$0.004 USDC</dd></div><div><dt>Independent payers</dt><dd>2</dd></div></dl>
      </section>

      <section className="api-panel" id="api">
        <div className="api-copy"><p className="eyebrow">CONNECT ONCE</p><h2>Give your agent the whole toolkit.</h2><p>Add one remote MCP endpoint and let the agent discover the right tool for each decision. No account, API key, or SDK is required.</p><div className="endpoint"><span>MCP ENDPOINT</span><code>https://anywaypossible.com/api/mcp</code></div><div className="doc-links"><a href="/catalog.json">Sample results ↗</a><a href="/openapi.json">OpenAPI ↗</a><a href="/llms.txt">Agent instructions ↗</a><a href="/guarded-purchase.json">Purchase workflow ↗</a></div></div>
        <div className="code-window"><div><i /><i /><i /><span>agent-config.json</span></div><pre><code>{`{
  "mcpServers": {
    "anyway-possible": {
      "url": "https://anywaypossible.com/api/mcp"
    }
  }
}`}</code></pre><p><span>✓</span> Ready for tool discovery</p></div>
      </section>

      <section className="closing-cta"><div><span className="brand-mark" aria-hidden="true"><i>A</i><i>P</i></span><p>One careful check can change what happens next.</p></div><a href="#api">Connect via MCP <span>→</span></a></section>
      <footer className="public-footer"><Link className="footer-brand" href="/">Anyway Possible</Link><span>Decision infrastructure for autonomous agents.</span><div><a href="/status">Status</a><a href="/openapi.json">Docs</a><a href="/llms.txt">llms.txt</a></div><small>© 2026 Anyway Possible</small></footer>
    </main>
  );
}
