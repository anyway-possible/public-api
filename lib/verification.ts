const MAX_BYTES = 128 * 1024;
const MAX_REDIRECTS = 3;

const blockedHosts = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function parsePublicUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) throw new Error("url must be a valid HTTP(S) URL under 2,048 characters");
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("only HTTP(S) URLs are supported");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not supported");
  if (blockedHosts.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "::1" || hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd") || isPrivateIpv4(hostname)) {
    throw new Error("private and local network targets are not supported");
  }
  return url;
}

async function readLimitedText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_BYTES - bytes;
    chunks.push(value.length > remaining ? value.slice(0, remaining) : value);
    bytes += Math.min(value.length, remaining);
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

async function fetchPublic(url: URL, redirects = 0): Promise<{ response: Response; finalUrl: URL }> {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { "user-agent": "AnywayPossible-Verify/1.0", accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.5" },
    signal: AbortSignal.timeout(9_000),
  });
  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) throw new Error("redirect limit exceeded");
    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: url };
    await response.body?.cancel().catch(() => undefined);
    return fetchPublic(parsePublicUrl(new URL(location, url).toString()), redirects + 1);
  }
  return { response, finalUrl: url };
}

export type VerificationInput = {
  url: string;
  expectedStatus?: number;
  expectedText?: string;
};

export async function verifyUrl(input: VerificationInput) {
  const requestedUrl = parsePublicUrl(input.url);
  if (input.expectedStatus !== undefined && (!Number.isInteger(input.expectedStatus) || input.expectedStatus < 100 || input.expectedStatus > 599)) {
    throw new Error("expectedStatus must be an integer from 100 to 599");
  }
  if (input.expectedText !== undefined && (typeof input.expectedText !== "string" || input.expectedText.length > 500)) {
    throw new Error("expectedText must be 500 characters or fewer");
  }

  const started = Date.now();
  const { response, finalUrl } = await fetchPublic(requestedUrl);
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "unknown";
  const body = await readLimitedText(response);
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 240) ?? null;
  const expectedTextFound = input.expectedText === undefined ? null : body.toLocaleLowerCase().includes(input.expectedText.toLocaleLowerCase());
  const statusMatch = input.expectedStatus === undefined ? null : response.status === input.expectedStatus;
  const observedAt = new Date().toISOString();

  return {
    verified: (statusMatch ?? true) && (expectedTextFound ?? true),
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    status: response.status,
    statusMatch,
    expectedTextFound,
    title,
    contentType,
    responseTimeMs: Date.now() - started,
    bytesInspected: new TextEncoder().encode(body).length,
    observedAt,
    evidence: [{ source: finalUrl.toString(), observedAt }],
  };
}
