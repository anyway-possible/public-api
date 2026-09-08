import { getRawDb } from "../db";
import { auditMerchant, type MerchantAuditInput } from "./merchant-audit";
import { compareMerchantAudit } from "./merchant-monitoring-core.mjs";

type AuditResult = Awaited<ReturnType<typeof auditMerchant>>;

type HistoryRow = {
  observed_at: string;
  score: number;
  grade: string;
  listing_count: number;
  indexed_calls_30d: number;
  max_resource_unique_payers_30d: number;
  external_inbound_usdc: number;
};

async function fingerprint(input: MerchantAuditInput) {
  const normalizedQueries = [...input.queries].map((query) => query.trim().toLowerCase()).sort();
  const material = `merchant-monitor:v1:${input.payTo.toLowerCase()}:${normalizedQueries.join("|")}`;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function historyPoint(result: AuditResult) {
  return {
    observedAt: result.observedAt,
    score: result.score,
    grade: result.grade,
    listingCount: result.summary.listingCount,
    indexedCalls30d: result.summary.indexedCalls30d,
    maxResourceUniquePayers30d: result.summary.maxResourceUniquePayers30d,
    externalInboundUsdc: result.summary.externalInboundUsdc,
  };
}

async function addMerchantMonitoring(result: AuditResult, input: MerchantAuditInput) {
  const merchantKey = await fingerprint(input);
  const db = getRawDb();
  const [historyResult, countResult] = await Promise.all([
    db.prepare("SELECT observed_at, score, grade, listing_count, indexed_calls_30d, max_resource_unique_payers_30d, external_inbound_usdc FROM merchant_audit_history WHERE merchant_key = ? ORDER BY observed_at DESC LIMIT 11").bind(merchantKey).all<HistoryRow>(),
    db.prepare("SELECT COUNT(*) AS total FROM merchant_audit_history WHERE merchant_key = ?").bind(merchantKey).first<{ total: number }>(),
  ]);
  const previous = historyResult.results[0];
  const current = historyPoint(result);
  await db.prepare("INSERT OR IGNORE INTO merchant_audit_history (audit_id, merchant_key, score, grade, listing_count, indexed_calls_30d, max_resource_unique_payers_30d, external_inbound_usdc, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(result.auditId, merchantKey, current.score, current.grade, current.listingCount, current.indexedCalls30d, current.maxResourceUniquePayers30d, current.externalInboundUsdc, current.observedAt)
    .run();
  const comparison = compareMerchantAudit(current, previous);
  const history = [current, ...historyResult.results.map((row: HistoryRow) => ({
    observedAt: row.observed_at,
    score: row.score,
    grade: row.grade,
    listingCount: row.listing_count,
    indexedCalls30d: row.indexed_calls_30d,
    maxResourceUniquePayers30d: row.max_resource_unique_payers_30d,
    externalInboundUsdc: row.external_inbound_usdc,
  }))];
  return {
    ...result,
    monitoring: {
      tracked: true,
      comparableRunCount: Number(countResult?.total ?? 0) + 1,
      previousObservedAt: previous?.observed_at ?? null,
      previousScore: previous?.score ?? null,
      ...comparison,
      history,
      nextRecommendedCheck: new Date(Date.parse(result.observedAt) + 7 * 86_400_000).toISOString(),
      privacy: "History is keyed by a one-way wallet-and-query fingerprint; no contact details are stored.",
    },
  };
}

export async function auditAndMonitorMerchant(input: MerchantAuditInput) {
  const result = await auditMerchant(input);
  try {
    return await addMerchantMonitoring(result, input);
  } catch (error) {
    console.error("Merchant monitoring persistence failed", error);
    return {
      ...result,
      monitoring: {
        tracked: false,
        comparableRunCount: 1,
        previousObservedAt: null,
        previousScore: null,
        direction: "unavailable" as const,
        scoreDelta: null,
        alerts: ["Score history is temporarily unavailable; the current audit result is complete."],
        history: [historyPoint(result)],
        nextRecommendedCheck: new Date(Date.parse(result.observedAt) + 7 * 86_400_000).toISOString(),
        privacy: "No contact details are stored.",
      },
    };
  }
}
