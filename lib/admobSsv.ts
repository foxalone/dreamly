import { verify } from "node:crypto";

const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEY_CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { keys: Map<string, string>; expiresAt: number } | undefined;
let loadingKeys: Promise<Map<string, string>> | undefined;
let lastKeyFetch = 0;

async function publicKey(id: string): Promise<string | undefined> {
  const now = Date.now();
  if (cache && now < cache.expiresAt && (cache.keys.has(id) || now - lastKeyFetch < 60_000)) {
    return cache.keys.get(id);
  }
  loadingKeys ??= (async () => {
    lastKeyFetch = now;
    const response = await fetch(KEYS_URL, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("AdMob verification keys unavailable");
    const { keys } = (await response.json()) as { keys: { keyId: number; pem: string }[] };
    const result = new Map(keys.map(({ keyId, pem }) => [String(keyId), pem]));
    cache = { keys: result, expiresAt: Date.now() + KEY_CACHE_MS };
    return result;
  })().finally(() => { loadingKeys = undefined; });
  return (await loadingKeys).get(id);
}

export async function verifyAdMobCallback(
  url: string,
  getKey: (id: string) => Promise<string | undefined> = publicKey,
): Promise<URLSearchParams | null> {
  const queryStart = url.indexOf("?");
  if (queryStart < 0 || url.length - queryStart > 8192) return null;
  const entries = url.slice(queryStart + 1).split("&");
  if (entries.some((entry) => !/^[a-z_][a-z_0-9]*=/.test(entry))) return null;
  const params = new URLSearchParams(url.slice(queryStart + 1));
  if (new Set(params.keys()).size !== entries.length) return null;
  const signature = params.get("signature");
  const keyId = params.get("key_id");
  if (!signature || !/^[A-Za-z0-9_-]+={0,2}$/.test(signature) || !keyId || !/^\d{1,10}$/.test(keyId)) return null;
  const signedEntries = entries.filter((entry) => !entry.startsWith("signature=") && !entry.startsWith("key_id="));
  const signedQuery = signedEntries.join("&");
  if (!signedQuery) return null;
  if (/%(?:26|3d)/i.test(signedQuery)) return null;
  const key = await getKey(keyId);
  if (!key) return null;
  // Google's verifier uses the URI query decoded as UTF-8, preserving order and literal plus signs.
  // A proxy may reorder the query. AdMob sends the signed fields in alphabetical order.
  const canonicalQuery = signedEntries.toSorted().join("&");
  // Some proxies also serialize escaped spaces as form-encoded plus signs.
  const signatureBytes = Buffer.from(signature, "base64url");
  try {
    const candidates = new Set([signedQuery, canonicalQuery, signedQuery.replaceAll("+", "%20"), canonicalQuery.replaceAll("+", "%20")]);
    for (const candidate of candidates) {
      if (verify("sha256", Buffer.from(decodeURIComponent(candidate)), key, signatureBytes)) {
        // Read the same values that passed signature verification, including literal plus signs.
        return new URLSearchParams(candidate.replaceAll("+", "%2B"));
      }
    }
  } catch { return null; }
  return null;
}

export function configuredAdMobUnit(platform: "android" | "ios" = "android") {
  const unit = (platform === "ios" ? process.env.ADMOB_IOS_REWARDED_UNIT_ID : process.env.ADMOB_ANALYSIS_REWARDED_UNIT_ID)?.trim();
  return unit && /^ca-app-pub-\d{16}\/\d+$/.test(unit) && !unit.startsWith("ca-app-pub-3940256099942544/") ? unit : null;
}

export function adMobTimestampMs(value: string | null) {
  if (!value || !/^\d{13}(?:\d{3})?$/.test(value)) return NaN;
  // The Google parameter table specifies milliseconds but also gives a microsecond example.
  return value.length === 16 ? Math.floor(Number(value) / 1000) : Number(value);
}

export function matchesAdMobUnit(value: string | null, configured: string | null): boolean {
  return configured !== null && (value === configured || value === configured.split("/")[1]);
}
