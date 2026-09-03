import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "../brand-mark";
import { tools } from "../../lib/product-catalog.mjs";

export const metadata: Metadata = {
  title: "Agent Result Examples — Anyway Possible",
  description: "Preview representative inputs and decision-ready outputs for all eight Anyway Possible agent tools before paying.",
  alternates: { canonical: "/examples" },
};

export default function ExamplesPage() {
  return <main className="reference-shell"><nav className="reference-nav"><Link href="/" aria-label="Anyway Possible home"><span className="quiet-wordmark"><BrandMark /><span><strong>Anyway Possible</strong><small>Result examples</small></span></span></Link><div><Link href="/docs">Docs</Link><Link href="/guides">Guides</Link><Link href="/status">Status</Link><a className="reference-cta" href="#examples">Preview results</a></div></nav><section className="reference-hero"><p className="reference-eyebrow">SEE THE SHAPE BEFORE YOU PAY</p><h1>Eight tools.<br />Predictable answers.</h1><p>These representative examples show what each tool needs and the kind of structured decision it returns. Live results include current observations and explicit limitations.</p></section><section className="reference-grid" id="examples">{tools.map((tool) => <article className="reference-card" id={tool.id} key={tool.id}><header><div><span>{tool.mcpTool}</span><h2>{tool.name}</h2><p className="reference-question">{tool.question}</p></div><strong className="reference-price">{tool.price} USDC</strong></header><p>{tool.useWhen}</p><div className="reference-code-grid"><div className="reference-code"><span>INPUT</span><pre><code>{JSON.stringify(tool.sampleRequest, null, 2)}</code></pre></div><div className="reference-code"><span>DECISION-READY OUTPUT</span><pre><code>{JSON.stringify(tool.sampleResponse, null, 2)}</code></pre></div></div><div className="reference-meta"><Link href={`/docs#${tool.id}`}>Read integration details →</Link><a href={`${tool.endpoint}`}>Free endpoint metadata →</a></div></article>)}</section><footer className="reference-footer"><Link href="/">Anyway Possible</Link><span>Inspect first. Pay only when the tool fits.</span><Link href="/docs">Connect an agent →</Link></footer></main>;
}
