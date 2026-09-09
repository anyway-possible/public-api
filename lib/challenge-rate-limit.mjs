export const CHALLENGE_LIMIT = 60;
export const CHALLENGE_WINDOW_MS = 60_000;
const MAX_CHALLENGE_BUCKETS = 4_096;
const buckets = new Map();

function makeRoom(now, incomingKey) {
  if (buckets.has(incomingKey) || buckets.size < MAX_CHALLENGE_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetsAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_CHALLENGE_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }
}

export function consumeChallengeToken(key, now = Date.now()) {
  makeRoom(now, key);
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetsAt <= now
    ? { count: 1, resetsAt: now + CHALLENGE_WINDOW_MS }
    : { count: existing.count + 1, resetsAt: existing.resetsAt };
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= CHALLENGE_LIMIT,
    remaining: Math.max(0, CHALLENGE_LIMIT - bucket.count),
    resetsAt: bucket.resetsAt,
  };
}

export function resetChallengeLimitsForTest() {
  buckets.clear();
}
