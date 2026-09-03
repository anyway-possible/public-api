import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "../../brand-mark";
import { findGuide, guides } from "../content";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  return { title: `${guide.title} — Anyway Possible`, description: guide.description, alternates: { canonical: `/guides/${guide.slug}` }, openGraph: { title: guide.title, description: guide.description, url: `https://anywaypossible.com/guides/${guide.slug}`, images: [] }, twitter: { title: guide.title, description: guide.description, images: [] } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: guide.title, description: guide.description, author: { "@type": "Organization", name: "Anyway Possible" }, publisher: { "@type": "Organization", name: "Anyway Possible" }, mainEntityOfPage: `https://anywaypossible.com/guides/${guide.slug}` }, { "@type": "FAQPage", mainEntity: guide.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }] };
  return <main className="guide-shell"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><nav className="guide-nav"><Link href="/"><BrandMark /><strong>Anyway Possible</strong></Link><Link href="/guides">All guides</Link></nav><article className="guide-article"><header><p>{guide.eyebrow}</p><h1>{guide.title}</h1><span>{guide.intro}</span></header>{guide.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}<aside><small>RELATED DECISION TOOL</small><h2>{guide.relatedTool.name}</h2><p>{guide.relatedTool.reason}</p><div><code>POST {guide.relatedTool.endpoint}</code><strong>{guide.relatedTool.price}</strong></div><Link href="/#api">Connect your agent →</Link></aside><section className="guide-faq"><small>COMMON QUESTIONS</small><h2>Questions, answered.</h2>{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section></article><footer className="guide-footer"><BrandMark /><span>Decision infrastructure for autonomous agents.</span><Link href="/">Explore all tools</Link></footer></main>;
}
