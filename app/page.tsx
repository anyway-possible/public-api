import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { tools as products } from "../lib/product-catalog.mjs";

export const dynamic = "force-dynamic";

function Wordmark({ detail = "Agent decision infrastructure" }: { detail?: string }) {
  return <span className="quiet-wordmark"><BrandMark /><span><strong>Anyway Possible</strong><small>{detail}</small></span></span>;
}

export default function PublicHome() {
  return (
    <main className="quiet-shell">
      <nav className="quiet-nav">
        <Link href="/" aria-label="Anyway Possible home"><Wordmark /></Link>
        <div><a href="#products">Tools</a><a href="#how-it-works">How it works</a><Link href="/guides">Guides</Link><Link href="/docs">Docs</Link><a className="quiet-nav-cta" href="#api">Connect agent</a></div>
      </nav>

      <section className="quiet-hero">
        <div className="quiet-orbit" aria-hidden="true"><span>PAY</span><span>CITE</span><span>ACT</span></div>
        <div className="quiet-hero-copy">
          <p className="quiet-label">PAID APIs FOR AUTONOMOUS AGENTS</p>
          <h1>Confidence for<br />the decisions<br /><em>agents make.</em></h1>
          <div className="quiet-hero-bottom"><p>Anyway Possible gives autonomous agents a trusted second opinion before money moves, evidence is cited, or an action becomes irreversible.</p><div><a href="#api">Connect via MCP <span>→</span></a><a href="/examples">Preview every result</a></div></div>
        </div>
        <aside className="quiet-result" aria-label="Example decision-ready result">
          <header><span><i /> LIVE DECISION</span><code>treasury_preflight</code></header>
          <div><small>RECOMMENDATION</small><strong>SAFE TO PAY</strong><p>Funding, network, and destination checks passed.</p></div>
          <dl><div><dt>Network</dt><dd>Base · 8453</dd></div><div><dt>Spend</dt><dd>0.05 USDC</dd></div><div><dt>Risk</dt><dd className="result-safe">LOW</dd></div><div><dt>Receipt</dt><dd>af7c…91d2</dd></div></dl>
          <footer><span>Machine-readable JSON</span><b>$0.02 USDC</b></footer>
        </aside>
      </section>

      <section className="quiet-trust" aria-label="Service attributes"><span><i />Gateway responding</span><span>Base mainnet · USDC</span><span>No accounts or API keys</span><span>MCP + HTTP + x402</span><a href="/status">View status ↗</a></section>
      <aside className="quiet-gloss"><strong>New to x402?</strong><p>It is a web payment standard that lets software pay for one API answer at a time—without opening an account or managing an API key.</p><Link href="/guides/what-is-x402">Plain-English guide ↗</Link></aside>

      <section className="quiet-how" id="how-it-works">
        <header><p className="quiet-label">HOW IT WORKS</p><h2>A small check before<br />a consequential action.</h2><p>Agents move quickly. We add the moment of current, structured evidence they need to move responsibly.</p></header>
        <div className="quiet-steps"><article><span>01</span><h3>Ask a question</h3><p>The agent describes the decision: pay, trust, verify, or diagnose.</p><code>{`{ "plannedSpendUsdc": "0.05" }`}</code></article><article><span>02</span><h3>Check live evidence</h3><p>Anyway Possible inspects the relevant web, merchant, payment, or Base signals.</p><code>status · funding · destination</code></article><article><span>03</span><h3>Receive the next action</h3><p>The agent gets a clear result, supporting evidence, and a receipt it can cite.</p><code>{`{ "decision": "safe_to_pay" }`}</code></article></div>
      </section>

      <section className="quiet-difference" aria-labelledby="difference-title">
        <header><p className="quiet-label">WHY AN AGENT CANNOT JUST DO THIS ALONE</p><h2 id="difference-title">Reasoning needs<br /><em>current evidence.</em></h2><p>An agent can think through a decision, but it cannot safely invent live wallet balances, payment terms, marketplace rankings, or the contents of a webpage. Anyway Possible performs those external checks and returns a bounded, auditable answer.</p></header>
        <div className="quiet-difference-grid"><article><span>01</span><h3>Independent observation</h3><p>Fresh web, marketplace, and Base data—not facts recalled from a model.</p></article><article><span>02</span><h3>Contract enforcement</h3><p>Price, network, asset, recipient, and funding are checked against explicit limits.</p></article><article><span>03</span><h3>Decision-ready output</h3><p>A stable schema says proceed, fund, review, or reject instead of returning loose research.</p></article><article><span>04</span><h3>Evidence to keep</h3><p>Timestamps, checks, limitations, hashes, and receipts let another system verify the result.</p></article></div>
      </section>

      <section className="quiet-products" id="products">
        <header><div><p className="quiet-label">CHOOSE BY JOB</p><h2>Decision-ready checks.<br /><em>Priced per answer.</em></h2></div><p>Start with Merchant Snapshot for selling decisions or Treasury for payment decisions. Six focused utilities handle the smaller checks. Every response is machine-readable.</p></header>
        <div className="quiet-product-grid">{products.map((product, index) => <article className={["merchant-snapshot", "treasury", "payment-guard"].includes(product.id) ? "featured" : ""} id={`tool-${product.id}`} key={product.name}><header><span>{String(index + 1).padStart(2, "0")} · {product.tag}</span><strong>{product.price}<small> USDC</small></strong></header><h3>{product.name}</h3><h4>{product.question}</h4><p>{product.description}</p><code>POST {product.endpoint}</code></article>)}</div>
      </section>

      <section className="quiet-proof" aria-labelledby="proof-title">
        <div className="quiet-proof-copy"><p className="quiet-label">PROOF, NOT PROMISES</p><h2 id="proof-title">We use it<br />on ourselves.</h2><p>This public merchant snapshot shows the complete job: ask a business question, inspect live evidence, identify the problem, and return the next action.</p><div><a href="/docs#merchant-snapshot">Get the request example <span>→</span></a><a href="/examples#merchant-snapshot">See the complete result</a></div></div>
        <article className="quiet-proof-card"><header><span>MERCHANT SNAPSHOT</span><code>$0.05 USDC</code></header><p className="proof-question"><small>QUESTION</small>Why isn&apos;t this x402 API generating more revenue?</p><div className="proof-decision"><small>NEXT ACTION</small><strong>IMPROVE BUYER-SEARCH VISIBILITY</strong><p>The service is reliable. Broader purchase-intent discovery is the main gap.</p></div><dl><div><dt>Merchant score</dt><dd>88 / 100</dd></div><div><dt>Reliable listings</dt><dd>5 / 5</dd></div><div><dt>Independent payers</dt><dd>2</dd></div></dl><footer><span>Evidence observed live</span><b>GRADE B</b></footer></article>
      </section>

      <section className="quiet-discovery" aria-labelledby="discovery-title">
        <header><p className="quiet-label">WHERE AGENTS FIND US</p><h2 id="discovery-title">One service.<br />Three entrances.</h2><p>Agents do not need to belong to one marketplace or platform. Discovery works through Coinbase Bazaar, the MCP Registry, and stable Direct HTTP contracts.</p></header>
        <div><article><span>01</span><h3>Coinbase Bazaar</h3><p>x402-native buyers discover all eight endpoints and pay per call with USDC on Base.</p><footer><a href="https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=0xe5690D37805107C56f6195E65A262b234E0E5e75">Verify Bazaar record ↗</a></footer></article><article><span>02</span><h3>MCP Registry</h3><p>Connect one remote server and discover all eight decision tools automatically.</p><code>com.anywaypossible/agent-utilities</code><footer><a href="https://registry.modelcontextprotocol.io/?q=com.anywaypossible%2Fagent-utilities">Verify registry record ↗</a></footer></article><article><span>03</span><h3>Direct HTTP</h3><p>Inspect exact requests and results before paying, then call any of eight stable routes.</p><footer><a href="/docs">Human docs ↗</a><a href="/catalog.json">Catalog ↗</a><a href="/openapi.json">OpenAPI ↗</a></footer></article></div>
      </section>

      <section className="quiet-api" id="api">
        <div><p className="quiet-label">CONNECT ONCE</p><h2>Give your agent<br />the whole toolkit.</h2><p>Add one remote MCP endpoint. The agent can inspect the available tools, choose the right one, pay per call, and receive structured evidence—without an account or SDK.</p><div className="quiet-endpoint"><span>MCP ENDPOINT</span><code>https://anywaypossible.com/api/mcp</code></div><nav><a href="/docs">Integration guide ↗</a><a href="/examples">Result examples ↗</a><a href="/openapi.json">OpenAPI ↗</a><a href="/llms.txt">Agent instructions ↗</a></nav></div>
        <div className="quiet-code"><header><i /><i /><i /><span>agent-config.json</span></header><pre><code>{`{
  "mcpServers": {
    "anyway-possible": {
      "url": "https://anywaypossible.com/api/mcp"
    }
  }
}`}</code></pre><footer><span><i /> READY</span><b>Tool discovery enabled</b></footer></div>
      </section>

      <section className="quiet-closing"><BrandMark /><p>One careful check can change what happens next.</p><a href="#api">Connect via MCP <span>→</span></a></section>
      <footer className="quiet-footer"><Link href="/"><Wordmark detail="Decision infrastructure for agents" /></Link><span>Base mainnet · x402 USDC</span><nav><Link href="/guides">Guides</Link><Link href="/status">Status</Link><Link href="/examples">Examples</Link><Link href="/docs">Docs</Link><a href="/llms.txt">llms.txt</a></nav><small>© 2026 Anyway Possible</small></footer>
    </main>
  );
}
