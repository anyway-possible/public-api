import { parsePublicUrl } from "./verification";

const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const COINBASE = "https://api.cdp.coinbase.com/platform/v2/x402/discovery";
const BLOCKSCOUT = "https://base.blockscout.com/api/v2";

type Resource = {
  resource: string;
  serviceName?: string;
  description?: string;
  tags?: string[];
  lastUpdated?: string;
  accepts?: Array<{ amount?: string; network?: string; asset?: string }>;
  quality?: { l30DaysTotalCalls?: number; l30DaysUniquePayers?: number; lastCalledAt?: string };
  extensions?: { bazaar?: { info?: { input?: { method?: string; body?: unknown }; output?: { example?: unknown } } } };
};

export type MerchantAuditInput = { payTo: string; queries: string[]; excludePayers?: string[] };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "AnywayPossible-MerchantAudit/1.0" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function priceUsd(resource: Resource) {
  const accept = resource.accepts?.find((item) => item.network === "eip155:8453") ?? resource.accepts?.[0];
  return accept?.amount && /^\d+$/.test(accept.amount) ? Number(accept.amount) / 1_000_000 : null;
}

function metadata(resource: Resource) {
  const info = resource.extensions?.bazaar?.info;
  const points = [!!resource.serviceName, (resource.description?.length ?? 0) >= 80, (resource.tags?.length ?? 0) >= 3, !!info?.input, !!info?.output?.example, !!resource.lastUpdated];
  return Math.round(points.filter(Boolean).length / points.length * 100);
}

function resourceIssues(resource: Resource) {
  const issues: string[] = [];
  if (!resource.serviceName) issues.push("Missing service name.");
  if ((resource.description?.length ?? 0) < 80) issues.push("Description is too short for strong semantic discovery.");
  if ((resource.tags?.length ?? 0) < 3) issues.push("Add at least three buyer-intent tags.");
  if (!resource.extensions?.bazaar?.info?.input) issues.push("Missing Bazaar input example.");
  if (!resource.extensions?.bazaar?.info?.output?.example) issues.push("Missing Bazaar output example.");
  if ((resource.quality?.l30DaysTotalCalls ?? 0) === 0) issues.push("No indexed calls in the last 30 days.");
  return issues;
}

async function inspectResource(resource: Resource) {
  const started = Date.now();
  try {
    const url = parsePublicUrl(resource.resource);
    const input = resource.extensions?.bazaar?.info?.input;
    const method = input?.method?.toUpperCase() === "GET" ? "GET" : "POST";
    const response = await fetch(url, {
      method,
      redirect: "manual",
      headers: { accept: "application/json", "content-type": "application/json", "x-awp-self-test": "1" },
      body: method === "POST" ? JSON.stringify(input?.body ?? {}) : undefined,
      signal: AbortSignal.timeout(8_000),
    });
    const result = { status: response.status, x402Ready: response.status === 402, responseTimeMs: Date.now() - started, error: null as string | null };
    await response.body?.cancel().catch(() => undefined);
    return result;
  } catch (error) {
    return { status: null, x402Ready: false, responseTimeMs: Date.now() - started, error: error instanceof Error ? error.message : "Request failed" };
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function grade(score: number) { return score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"; }

export async function auditMerchant(input: MerchantAuditInput) {
  const payTo = input.payTo.toLowerCase();
  const excluded = new Set((input.excludePayers ?? []).map((value) => value.toLowerCase()));
  const merchantUrl = `${COINBASE}/merchant?payTo=${encodeURIComponent(payTo)}`;
  const blockscoutUrl = `${BLOCKSCOUT}/addresses/${payTo}/token-transfers?type=ERC-20`;
  const [merchantRaw, searchResults, transfersRaw] = await Promise.all([
    getJson<{ resources?: Resource[] } | Resource[]>(merchantUrl),
    Promise.all(input.queries.map(async (query) => {
      try { return await getJson<{ resources?: Resource[] } | Resource[]>(`${COINBASE}/search?query=${encodeURIComponent(query)}&limit=10`); }
      catch { return { resources: [] as Resource[] }; }
    })),
    getJson<{ items?: Array<{ token?: { address_hash?: string }; total?: { value?: string; decimals?: string }; from?: { hash?: string }; to?: { hash?: string }; transaction_hash?: string; timestamp?: string }>; next_page_params?: unknown }>(blockscoutUrl).catch(() => ({ items: [] })),
  ]);
  const resources = (Array.isArray(merchantRaw) ? merchantRaw : merchantRaw.resources ?? []).slice(0, 5);
  const reliability = await Promise.all(resources.map(inspectResource));
  const listings = resources.map((resource, index) => ({
    resource: resource.resource, serviceName: resource.serviceName ?? null, description: resource.description ?? null,
    priceUsd: priceUsd(resource), lastUpdated: resource.lastUpdated ?? null, quality: resource.quality ?? {},
    metadataCompleteness: metadata(resource), issues: resourceIssues(resource), reliability: reliability[index],
  }));
  const rankings = input.queries.map((query, index) => {
    const found = searchResults[index];
    const results = (Array.isArray(found) ? found : found.resources ?? []);
    const rank = results.findIndex((resource) => resource.resource && resources.some((mine) => mine.resource === resource.resource));
    return { query, rank: rank < 0 ? null : rank + 1, matchedResource: rank < 0 ? null : results[rank].resource, resultCount: results.length, topCompetitors: results.slice(0, 3).map((resource) => ({ resource: resource.resource, serviceName: resource.serviceName ?? null, priceUsd: priceUsd(resource) })) };
  });
  const inbound = (transfersRaw.items ?? []).filter((item) => item.token?.address_hash?.toLowerCase() === BASE_USDC && item.to?.hash?.toLowerCase() === payTo).map((item) => {
    const decimals = Number(item.total?.decimals ?? 6);
    const amount = Number(item.total?.value ?? 0) / 10 ** decimals;
    const payer = item.from?.hash?.toLowerCase() ?? "unknown";
    return { amountUsdc: amount, payer, excluded: excluded.has(payer), transactionHash: item.transaction_hash ?? null, timestamp: item.timestamp ?? null };
  });
  const external = inbound.filter((item) => !item.excluded);
  const total = (items: typeof inbound) => Number(items.reduce((sum, item) => sum + item.amountUsdc, 0).toFixed(6));
  const latestActivity = [...inbound.map((item) => item.timestamp), ...resources.map((resource) => resource.quality?.lastCalledAt)].filter(Boolean).sort().at(-1) ?? null;
  const averageMetadata = listings.length ? listings.reduce((sum, item) => sum + item.metadataCompleteness, 0) / listings.length : 0;
  const reliabilityScore = listings.length ? reliability.filter((item) => item.x402Ready).length / listings.length : 0;
  const rankingScore = rankings.length ? rankings.reduce((sum, item) => sum + (item.rank && item.rank <= 3 ? 1 : item.rank && item.rank <= 10 ? 0.5 : 0), 0) / rankings.length : 0;
  const maxUniquePayers = Math.max(0, ...resources.map((resource) => resource.quality?.l30DaysUniquePayers ?? 0));
  const age = latestActivity ? (Date.now() - Date.parse(latestActivity)) / 86_400_000 : Infinity;
  const scoreBreakdown = { listings: resources.length ? 20 : 0, reliability: Math.round(reliabilityScore * 20), metadata: Math.round(averageMetadata * 0.2), visibility: Math.round(rankingScore * 20), recency: age <= 7 ? 10 : age <= 30 ? 5 : 0, buyerReach: maxUniquePayers >= 3 ? 10 : maxUniquePayers >= 1 ? 5 : 0 };
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  const actions: string[] = [];
  if (reliability.some((item) => !item.x402Ready)) actions.push("Fix every listed endpoint until an unpaid request reliably returns a valid HTTP 402 challenge.");
  if (averageMetadata < 90) actions.push("Complete Bazaar input/output examples and rewrite short descriptions around explicit buyer intent.");
  if (rankings.some((item) => item.rank === null || item.rank > 3)) actions.push("Target the missing search queries in service names, descriptions, and tags; then complete one marked indexing settlement.");
  if (maxUniquePayers < 3) actions.push("Publish a copy-paste buyer example and recruit three independent agents before adding more endpoints.");
  if (!actions.length) actions.push("Hold the current listing contract and test a higher price with the next five independent buyers.");
  const observedAt = new Date().toISOString();
  const summary = { listingCount: listings.length, indexedCalls30d: resources.reduce((sum, resource) => sum + (resource.quality?.l30DaysTotalCalls ?? 0), 0), maxResourceUniquePayers30d: maxUniquePayers, onchainInboundUsdc: total(inbound), externalInboundUsdc: total(external), excludedInboundUsdc: total(inbound.filter((item) => item.excluded)), uniqueExternalPayers: new Set(external.map((item) => item.payer)).size, latestActivity };
  const auditId = await digest(JSON.stringify({ payTo, observedAt, score, summary, rankings: rankings.map(({ query, rank }) => ({ query, rank })) }));
  return { auditId, merchant: payTo, network: "Base (eip155:8453)", observedAt, score, grade: grade(score), scoreBreakdown, summary, listings, rankings, onchain: { ...summary, sampleLimited: !!transfersRaw.next_page_params, recentInboundUsdc: inbound.slice(0, 10) }, actions: actions.slice(0, 3), limitations: ["Public discovery and onchain transfers cannot prove that every inbound payment is customer revenue.", "Unique payer counts can overlap across resources; the summary reports the largest per-resource Bazaar value.", "Blockscout results may be page-limited; sampleLimited indicates when older transfers were not inspected."] };
}
