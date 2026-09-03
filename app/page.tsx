import Link from "next/link";
import { BrandMark } from "./brand-mark";

export const dynamic = "force-dynamic";

const products = [
  { name: "Merchant Snapshot", price: "$0.05", tag: "SELLER INTELLIGENCE", question: "Why is my x402 API not selling?", copy: "Find the largest revenue problem using discovery, pricing, buyer, payment, and reliability evidence.", path: "POST /api/merchant-snapshot", featured: true },
  { name: "Treasury", price: "$0.02", tag: "PAYMENT PREFLIGHT", question: "Is this Base payment safe and funded?", copy: "Check balance, gas, chain intent, recipient type, and destination hazards before signing.", path: "POST /api/treasury", featured: true },
  { name: "Payment Guard", price: "$0.01", tag: "SIGNING SAFETY", question: "Does this challenge match my intent?", copy: "Validate a live x402 challenge, price ceiling, asset, network, funding, and recipient.", path: "POST /api/payment-guard" },
  { name: "Verify", price: "$0.01", tag: "WEB EVIDENCE", question: "Can this page be trusted and cited?", copy: "Return live status, expected content, timestamped hash, metadata, and a stable receipt.", path: "POST /api/verify" },
  { name: "Batch", price: "$0.01", tag: "UP TO 10 URLS", question: "Are all these sources usable now?", copy: "Validate citations, links, or dependencies together while keeping partial failures isolated.", path: "POST /api/batch" },
  { name: "Base Balance", price: "$0.001", tag: "ONCHAIN DATA", question: "What does this Base wallet hold?", copy: "Read native ETH and Circle USDC balances, atomic values, and current block height.", path: "POST /api/base-balance" },
  { name: "Check", price: "$0.001", tag: "FAST URL PREFLIGHT", question: "Is this URL reachable?", copy: "Confirm status, latency, redirects, and content type before a larger action.", path: "POST /api/check" },
  { name: "Merchant Audit", price: "$0.25", tag: "14-DAY PRICE TEST", question: "What exactly should this merchant change?", copy: "Get ranking evidence, competitor prices, buyer reach, reliability, and prioritized fixes.", path: "POST /api/merchant-audit" },
];

function Wordmark({ detail = "Agent decision infrastructure" }: { detail?: string }) {
  return <span className="quiet-wordmark"><BrandMark /><span><strong>Anyway Possible</strong><small>{detail}</small></span></span>;
}

export default function PublicHome() {
  return (
    <main className="quiet-shell">
      <nav className="quiet-nav">
        <Link href="/" aria-label="Anyway Possible home"><Wordmark /></Link>
        <div><a href="#products">Tools</a><a href="#how-it-works">How it works</a><a href="/openapi.json">Docs</a><a className="quiet-nav-cta" href="#api">Connect agent</a></div>
      </nav>

      <section className="quiet-hero">
        <div className="quiet-orbit" aria-hidden="true"><span>PAY</span><span>CITE</span><span>ACT</span></div>
        <div className="quiet-hero-copy">
          <p className="quiet-label">PAID APIs FOR AUTONOMOUS AGENTS</p>
          <h1>Confidence for<br />the decisions<br /><em>agents make.</em></h1>
          <div className="quiet-hero-bottom"><p>Anyway Possible gives autonomous agents a trusted second opinion before money moves, evidence is cited, or an action becomes irreversible.</p><div><a href="#api">Connect via MCP <span>→</span></a><a href="/catalog.json">Preview every result</a></div></div>
        </div>
        <aside className="quiet-result" aria-label="Example decision-ready result">
          <header><span><i /> LIVE DECISION</span><code>treasury_preflight</code></header>
          <div><small>RECOMMENDATION</small><strong>SAFE TO PAY</strong><p>Funding, network, and destination checks passed.</p></div>
          <dl><div><dt>Network</dt><dd>Base · 8453</dd></div><div><dt>Spend</dt><dd>0.05 USDC</dd></div><div><dt>Risk</dt><dd className="result-safe">LOW</dd></div><div><dt>Receipt</dt><dd>af7c…91d2</dd></div></dl>
          <footer><span>Machine-readable JSON</span><b>$0.02 USDC</b></footer>
        </aside>
      </section>

      <section className="quiet-trust" aria-label="Service attributes"><span><i />Systems operational</span><span>Base mainnet · USDC</span><span>No accounts or API keys</span><span>MCP + HTTP + x402</span><a href="/status">View status ↗</a></section>

      <section className="quiet-how" id="how-it-works">
        <header><p className="quiet-label">HOW IT WORKS</p><h2>A small check before<br />a consequential action.</h2><p>Agents move quickly. We add the moment of current, structured evidence they need to move responsibly.</p></header>
        <div className="quiet-steps"><article><span>01</span><h3>Ask a question</h3><p>The agent describes the decision: pay, trust, verify, or diagnose.</p><code>{`{ "plannedSpendUsdc": "0.05" }`}</code></article><article><span>02</span><h3>Check live evidence</h3><p>Anyway Possible inspects the relevant web, merchant, payment, or Base signals.</p><code>status · funding · destination</code></article><article><span>03</span><h3>Receive the next action</h3><p>The agent gets a clear result, supporting evidence, and a receipt it can cite.</p><code>{`{ "decision": "safe_to_pay" }`}</code></article></div>
      </section>

      <section className="quiet-products" id="products">
        <header><div><p className="quiet-label">CHOOSE BY JOB</p><h2>Decision-ready checks.<br /><em>Priced per answer.</em></h2></div><p>Start with Merchant Snapshot for selling decisions or Treasury for payment decisions. Six focused utilities handle the smaller checks. Every response is machine-readable.</p></header>
        <div className="quiet-product-grid">{products.map((product, index) => <article className={product.featured ? "featured" : ""} key={product.name}><header><span>{String(index + 1).padStart(2, "0")} · {product.tag}</span><strong>{product.price}<small> USDC</small></strong></header><h3>{product.name}</h3><h4>{product.question}</h4><p>{product.copy}</p><code>{product.path}</code></article>)}</div>
      </section>

      <section className="quiet-proof" aria-labelledby="proof-title">
        <div className="quiet-proof-copy"><p className="quiet-label">PROOF, NOT PROMISES</p><h2 id="proof-title">We use it<br />on ourselves.</h2><p>This public merchant snapshot shows the complete job: ask a business question, inspect live evidence, identify the problem, and return the next action.</p><div><a href="#api">Run your own snapshot <span>→</span></a><a href="/catalog.json">See the sample JSON</a></div></div>
        <article className="quiet-proof-card"><header><span>MERCHANT SNAPSHOT</span><code>$0.05 USDC</code></header><p className="proof-question"><small>QUESTION</small>Why isn&apos;t this x402 API generating more revenue?</p><div className="proof-decision"><small>NEXT ACTION</small><strong>IMPROVE BUYER-SEARCH VISIBILITY</strong><p>The service is reliable. Broader purchase-intent discovery is the main gap.</p></div><dl><div><dt>Merchant score</dt><dd>88 / 100</dd></div><div><dt>Reliable listings</dt><dd>5 / 5</dd></div><div><dt>Independent payers</dt><dd>2</dd></div></dl><footer><span>Evidence observed live</span><b>GRADE B</b></footer></article>
      </section>

      <section className="quiet-discovery" aria-labelledby="discovery-title">
        <header><p className="quiet-label">WHERE AGENTS FIND US</p><h2 id="discovery-title">One service.<br />Three entrances.</h2><p>Agents do not need to belong to one marketplace or platform. Discovery works through Coinbase Bazaar, the MCP Registry, and stable Direct HTTP contracts.</p></header>
        <div><article><span>01</span><h3>Coinbase Bazaar</h3><p>x402-native buyers discover endpoints and pay per call with USDC on Base.</p><small>MARKETPLACE DISCOVERY</small></article><article><span>02</span><h3>MCP Registry</h3><p>Connect one remote server and discover the four core decision tools automatically.</p><code>io.github.anyway-possible/agent-utilities</code></article><article><span>03</span><h3>Direct HTTP</h3><p>Inspect sample requests and results before paying, then call any of eight stable routes.</p><footer><a href="/catalog.json">Catalog ↗</a><a href="/openapi.json">OpenAPI ↗</a><a href="/llms.txt">llms.txt ↗</a></footer></article></div>
      </section>

      <section className="quiet-api" id="api">
        <div><p className="quiet-label">CONNECT ONCE</p><h2>Give your agent<br />the whole toolkit.</h2><p>Add one remote MCP endpoint. The agent can inspect the available tools, choose the right one, pay per call, and receive structured evidence—without an account or SDK.</p><div className="quiet-endpoint"><span>MCP ENDPOINT</span><code>https://anywaypossible.com/api/mcp</code></div><nav><a href="/catalog.json">Sample results ↗</a><a href="/openapi.json">OpenAPI ↗</a><a href="/llms.txt">Agent instructions ↗</a><a href="/guarded-purchase.json">Purchase workflow ↗</a></nav></div>
        <div className="quiet-code"><header><i /><i /><i /><span>agent-config.json</span></header><pre><code>{`{
  "mcpServers": {
    "anyway-possible": {
      "url": "https://anywaypossible.com/api/mcp"
    }
  }
}`}</code></pre><footer><span><i /> READY</span><b>Tool discovery enabled</b></footer></div>
      </section>

      <section className="quiet-closing"><BrandMark /><p>One careful check can change what happens next.</p><a href="#api">Connect via MCP <span>→</span></a></section>
      <footer className="quiet-footer"><Link href="/"><Wordmark detail="Decision infrastructure for agents" /></Link><span>Base mainnet · x402 USDC</span><nav><a href="/status">Status</a><a href="/catalog.json">Catalog</a><a href="/openapi.json">Docs</a><a href="/llms.txt">llms.txt</a></nav><small>© 2026 Anyway Possible</small></footer>
    </main>
  );
}
