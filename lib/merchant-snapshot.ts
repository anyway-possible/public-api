import { auditMerchant, type MerchantAuditInput } from "./merchant-audit";

export async function createMerchantSnapshot(input: MerchantAuditInput) {
  const audit = await auditMerchant(input);
  return {
    snapshotId: audit.auditId,
    merchant: audit.merchant,
    network: audit.network,
    observedAt: audit.observedAt,
    score: audit.score,
    grade: audit.grade,
    signals: {
      listingCount: audit.summary.listingCount,
      analyzedListingCount: audit.summary.analyzedListingCount,
      indexedCalls30d: audit.summary.indexedCalls30d,
      maxResourceUniquePayers30d: audit.summary.maxResourceUniquePayers30d,
      externalInboundUsdc: audit.summary.externalInboundUsdc,
      uniqueExternalPayers: audit.summary.uniqueExternalPayers,
      latestActivity: audit.summary.latestActivity,
      reliableListings: audit.listings.filter((listing) => listing.reliability.x402Ready).length,
    },
    visibility: audit.rankings.map(({ query, rank, matchedResource }) => ({ query, rank, matchedResource })),
    biggestIssue: audit.actions[0] ?? "No critical listing issue was detected in the sampled public signals.",
    upgrade: {
      endpoint: "https://anywaypossible.com/api/merchant-audit",
      priceUsd: 0.25,
      includes: ["competitor pricing", "listing-by-listing defects", "onchain transfer evidence", "three prioritized actions"],
    },
    limitations: audit.limitations,
  };
}
