import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../site-chrome";
import { tools } from "../../lib/product-catalog.mjs";

export const metadata: Metadata = {
  title: "Agent Result Examples — Anyway Possible",
  description: "Use the free MCP recommender, then preview representative inputs and decision-ready outputs for all eight paid Anyway Possible agent tools.",
  alternates: { canonical: "/examples" },
};

export default function ExamplesPage() {
  return <main className="reference-shell"><SiteHeader /><section className="reference-hero"><p className="reference-eyebrow">SEE THE SHAPE BEFORE YOU PAY</p><h1>Eight paid tools.<br />One free way to choose.</h1><p>Call <code>recommend_tool</code> through MCP for a free recommendation and exact price. These representative examples then show what each paid tool needs and the structured decision it returns.</p></section><section className="reference-grid" id="examples">{tools.map((tool) => <article className="reference-card" id={tool.id} key={tool.id}><header><div><span>{tool.mcpTool}</span><h2>{tool.name}</h2><p className="reference-question">{tool.question}</p></div><strong className="reference-price">{tool.price} USDC</strong></header><p>{tool.useWhen}</p><div className="reference-code-grid"><div className="reference-code"><span>INPUT</span><pre><code>{JSON.stringify(tool.sampleRequest, null, 2)}</code></pre></div><div className="reference-code"><span>DECISION-READY OUTPUT</span><pre><code>{JSON.stringify(tool.sampleResponse, null, 2)}</code></pre></div></div><div className="reference-meta"><Link href={`/docs#${tool.id}`}>Read integration details →</Link><a href={`${tool.endpoint}`}>Free endpoint metadata →</a></div></article>)}</section><SiteFooter /></main>;
}
