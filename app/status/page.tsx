import type { Metadata } from "next";
import { getPublicTrustSnapshot } from "../../db/public-trust";
import { tools } from "../../lib/product-catalog.mjs";
import { SiteFooter, SiteHeader } from "../site-chrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Status & Trust — Anyway Possible",
  description: "Privacy-safe service history, incident reporting, and operating evidence for Anyway Possible APIs and MCP tools.",
  alternates: { canonical: "/status" },
};

function displayDate(value: string | null) {
  if (!value) return "No qualifying call recorded";
  return `${new Date(value).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC`;
}

export default async function StatusPage() {
  const trust = await getPublicTrustSnapshot();
  const checkedAt = new Date();
  const maxCalls = Math.max(1, ...trust.reliability.daily.map((day) => day.successfulPaidCalls));
  return (
    <main className="public-shell status-page">
      <SiteHeader />
      <section className="status-hero">
        <div><p className="eyebrow"><span />CURRENT GATEWAY CHECK</p><h1>The gateway is responding.</h1><p>This page separates what the service can prove from what it does not yet claim, with privacy-safe operating evidence for people and agents.</p></div>
        <aside className="status-summary"><span><i />{trust.openIncidents === 0 ? "Responding" : "Incident open"}</span><strong>Anyway Possible Agent Utilities</strong><dl><div><dt>Network</dt><dd>Base</dd></div><div><dt>Settlement</dt><dd>USDC · x402 v2</dd></div><div><dt>Checked</dt><dd>{checkedAt.toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</dd></div></dl></aside>
      </section>
      <section className="status-content">
        <header className="status-section-heading"><p className="eyebrow">PUBLIC OPERATING EVIDENCE</p><div><h2>Trust should be inspectable.</h2><p>These are aggregate outcomes recorded by the service. They reveal no wallet, payer, agent, transaction, revenue, or request-content details.</p></div></header>
        <div className="status-grid">
          <article><span>SUCCESSFUL PAID CALLS</span><strong>{trust.dataAvailable ? trust.successfulPaidCalls.toLocaleString("en-US") : "Unavailable"}</strong><p>Completed, non-test paid tool calls recorded since service tracking began.</p></article>
          <article><span>30-DAY OBSERVED OUTCOMES</span><strong>{trust.reliability.observedSuccessRate === null ? "Insufficient data" : `${trust.reliability.observedSuccessRate}% successful`}</strong><p>Paid successes divided by paid successes plus recorded service errors—not an uptime SLA.</p></article>
          <article><span>OPEN INCIDENTS</span><strong>{trust.dataAvailable ? trust.openIncidents : "Unavailable"}</strong><p>Publicly recorded service incidents that have not been marked resolved.</p></article>
          <article><span>LAST SUCCESSFUL PAID CALL</span><strong className="status-date-value">{displayDate(trust.lastSuccessfulPaidCallAt)}</strong><p>The most recent completed, non-test paid tool call recorded by the service.</p></article>
        </div>
        <section className="status-history" aria-labelledby="history-title">
          <header><div><p className="eyebrow">30-DAY HISTORY</p><h2 id="history-title">Daily observed outcomes.</h2></div><p>Gold bars show successful paid calls. A red marker shows one or more recorded service errors. An empty day means no qualifying outcome was recorded; it does not prove downtime.</p></header>
          <ol aria-label="Daily successful paid calls and recorded service errors">
            {trust.reliability.daily.map((day) => <li key={day.date} title={`${day.date}: ${day.successfulPaidCalls} successful paid calls, ${day.recordedServiceErrors} recorded service errors`}><div><span style={{ height: `${Math.max(day.successfulPaidCalls ? 4 : 1, (day.successfulPaidCalls / maxCalls) * 100)}%` }} />{day.recordedServiceErrors > 0 ? <i aria-label={`${day.recordedServiceErrors} recorded service errors`} /> : null}</div><time dateTime={day.date}>{day.date.slice(5)}</time></li>)}
          </ol>
        </section>
        <section className="trust-details">
          <article><p className="eyebrow">METHODOLOGY</p><h2>What this evidence means.</h2><ul><li>A successful paid call completed the application route after payment validation.</li><li>A recorded service error is an application-level failure captured while handling a tool request.</li><li>Test traffic is excluded from the paid-call total.</li><li>Counts come from first-party service events and are updated as the application records them.</li></ul><p><strong>Independent availability checks:</strong> GitHub Actions tests the public status, trust, discovery, MCP, and x402 boundaries every 15 minutes. Its public run history is evidence of those checks, not a contractual uptime SLA.</p><a href="/api/trust">Inspect the machine-readable trust evidence →</a></article>
          <article><p className="eyebrow">SECURITY & ACCOUNTABILITY</p><h2>Claims with boundaries.</h2><p>The latest supplied platform assessment, dated September 7, 2026, reviewed the public security and discovery surface. The assessment itself is not published here and is not represented as an independent certification.</p><dl><div><dt>Public-network fetch controls</dt><dd>Active</dd></div><div><dt>Privacy-safe funnel attribution</dt><dd>Active</dd></div><div><dt>Repository identity separation</dt><dd>Active</dd></div><div><dt>Independent availability checks</dt><dd>Every 15 minutes</dd></div><div><dt>Contractual uptime SLA</dt><dd>Not claimed</dd></div></dl><nav aria-label="Trust resources"><a href="https://github.com/anyway-possible/public-api/actions/workflows/production-monitor.yml">External monitor history</a><a href="/.well-known/security.txt">Security contact</a><a href="https://github.com/anyway-possible/public-api">Source repository</a></nav></article>
        </section>
        <div className="endpoint-list"><div><p className="eyebrow">CURRENT CAPABILITY</p><h2>{tools.length} paid routes, stated precisely.</h2><p>The live gateway exposes these account-free HTTP tools with explicit x402 terms. This confirms current advertising and reachability; it does not claim that an end-to-end settlement occurred at this page-render timestamp.</p><p><a href="/api/health">Inspect the raw health JSON →</a></p></div><ul>{tools.map((tool) => <li key={tool.id}><code>{tool.endpoint}</code><span>Advertised</span></li>)}</ul></div>
      </section>
      <SiteFooter />
    </main>
  );
}
