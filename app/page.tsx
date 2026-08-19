import Link from "next/link";
import SourceRequestForm from "./source-request-form";

export const dynamic = "force-dynamic";

export default function PublicHome() {
  return (
    <main className="source-shell">
      <nav className="source-nav">
        <Link href="/">ANYWAY POSSIBLE</Link>
        <div><a href="#how">HOW IT WORKS</a><a href="#request">START A REQUEST</a><a href="/openapi.json">AGENT API</a></div>
      </nav>

      <section className="source-hero">
        <div className="source-hero-copy">
          <p className="eyebrow">CUSTOM PART SOURCING · PRIVATE BETA</p>
          <h1>Hard to find.<br /><span>Not impossible.</span></h1>
          <p className="source-lede">Send us the part, material, quantity, and deadline. We identify capable suppliers and return real options you can act on—not a list invented by an AI.</p>
          <div className="source-actions"><a href="#request">Submit a sourcing request →</a><span>No charge to submit. We price accepted work before starting.</span></div>
        </div>
        <aside className="source-ticket" aria-label="Example sourcing brief">
          <p>REQUEST / 001</p>
          <strong>Obsolete stainless impeller</strong>
          <dl>
            <div><dt>Quantity</dt><dd>4</dd></div>
            <div><dt>Material</dt><dd>316 SS</dd></div>
            <div><dt>Deadline</dt><dd>14 days</dd></div>
            <div><dt>Deliverable</dt><dd>Confirmed supplier options</dd></div>
          </dl>
          <small>Example only · no fabricated supplier claims</small>
        </aside>
      </section>

      <section className="source-proof" id="how">
        <article><span>01 / BRIEF</span><h2>Describe the blocker</h2><p>Tell us what the part does, what you know about it, how many you need, and when it must arrive.</p></article>
        <article><span>02 / SOURCE</span><h2>We find capable shops</h2><p>Accepted requests are researched against real supplier capabilities. We contact candidates instead of merely generating names.</p></article>
        <article><span>03 / DECIDE</span><h2>You receive real options</h2><p>We return comparable responses, constraints, and next steps. You decide whether to proceed with a supplier.</p></article>
      </section>

      <section className="source-fit">
        <div><p className="eyebrow">STARTING VERTICAL</p><h2>Parts that stop<br />real work.</h2></div>
        <div className="source-fit-grid">
          <article><b>GOOD FIT</b><p>Obsolete replacement parts, custom-machined components, short production runs, specialty materials, reverse-engineering leads, and unusual fabrication requests.</p></article>
          <article><b>NOT YET</b><p>Consumer shopping, regulated weapons, medical emergencies, prohibited goods, or requests without enough information to evaluate safely.</p></article>
          <article><b>PRICING</b><p>Submitting is free. If the request is feasible, we quote the sourcing work before contacting suppliers. Our beta target is $49 for a standard request.</p></article>
        </div>
      </section>

      <section className="source-request" id="request">
        <div className="source-request-copy">
          <p className="eyebrow">THE FIRST FIVE ACCEPTED REQUESTS SHAPE THE SERVICE</p>
          <h2>What do you need?</h2>
          <p>Specific briefs get useful answers. Include dimensions, material, tolerances, operating conditions, an existing part number, or a link to drawings when available.</p>
          <div className="source-promise"><b>You will not be charged here.</b><span>We review the brief first and send a clear scope and price only if it is a request we can credibly fulfill.</span></div>
        </div>
        <SourceRequestForm />
      </section>

      <section className="agent-continuity">
        <div><p className="eyebrow">ALSO LIVE</p><h2>Agent payment infrastructure</h2><p>Our Base/x402 verification, treasury, merchant-audit, and Payment Guard APIs remain operational while this human-market demand test runs.</p></div>
        <div><a href="/openapi.json">OpenAPI specification ↗</a><a href="/llms.txt">Agent instructions ↗</a><a href="/api/health">System status ↗</a></div>
      </section>

      <footer className="source-footer"><b>ANYWAY POSSIBLE</b><span>Real sourcing for difficult parts.</span><a href="#request">Start a request ↑</a></footer>
    </main>
  );
}
