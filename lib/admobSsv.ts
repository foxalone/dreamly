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
  const parts = /^(.+)&signature=([A-Za-z0-9_-]+(?:=|%3[Dd]){0,2})&key_id=(\d{1,10})$/.exec(url.slice(queryStart + 1));
  if (!parts) return null;
  const [, signedQuery, signature, keyId] = parts;
  if (/%(?:26|3d)/i.test(signedQuery)) return null;
  const params = new URLSearchParams(signedQuery);
  if (params.has("signature") || params.has("key_id") || new Set(params.keys()).size !== [...params].length) return null;
  const key = await getKey(keyId);
  if (!key) return null;
  // Google's verifier uses the URI query decoded as UTF-8, preserving order and literal plus signs.
  let content: string;
  try { content = decodeURIComponent(signedQuery); }
  catch { return null; }
  return verify("sha256", Buffer.from(content), key, Buffer.from(decodeURIComponent(signature), "base64url"))
    ? params
    : null;
}

export function configuredAdMobUnit() {
  const unit = process.env.ADMOB_ANALYSIS_REWARDED_UNIT_ID?.trim();
  return unit && /^ca-app-pub-\d{16}\/\d+$/.test(unit) && !unit.startsWith("ca-app-pub-3940256099942544/") ? unit : null;
}

export function adMobTimestampMs(value: string | null) {
  if (!value || !/^\d{13}(?:\d{3})?$/.test(value)) return NaN;
  // The Google parameter table specifies milliseconds but also gives a microsecond example.
  return value.length === 16 ? Math.floor(Number(value) / 1000) : Number(value);
}
