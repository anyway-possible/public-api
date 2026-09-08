export function compareMerchantAudit(current, previous) {
  if (!previous) return { direction: "first_observation", scoreDelta: null, alerts: [] };
  const scoreDelta = current.score - previous.score;
  const alerts = [];
  if (scoreDelta < 0) alerts.push(`Merchant score dropped ${Math.abs(scoreDelta)} point${Math.abs(scoreDelta) === 1 ? "" : "s"} since the previous comparable audit.`);
  if (current.listingCount < previous.listing_count) alerts.push("The number of discoverable merchant listings decreased.");
  if (current.indexedCalls30d < previous.indexed_calls_30d) alerts.push("Indexed 30-day call activity decreased.");
  if (current.maxResourceUniquePayers30d < previous.max_resource_unique_payers_30d) alerts.push("The strongest listing now shows fewer unique 30-day payers.");
  return { direction: scoreDelta > 0 ? "improved" : scoreDelta < 0 ? "declined" : "stable", scoreDelta, alerts };
}
