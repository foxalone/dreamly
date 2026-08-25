import { appendDreamlySocialCta } from "@/lib/socialCta";

/** Preferred Buffer TikTok channel handle (without @). */
export const BUFFER_TIKTOK_USERNAME_DEFAULT = "dreamly_art";

/** Optional non-secret cache of resolved Buffer TikTok channel id. */
export const BUFFER_TIKTOK_CHANNEL_DOCUMENT = "adminSystem/bufferTikTokChannel";

export const BUFFER_API_URL = "https://api.buffer.com";

export type TikTokConnectionStatus = {
  configured: boolean;
  connected: boolean;
  platform: "tiktok";
  channel: string;
  channelId: string;
  error: string;
};

export function bufferEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function bufferApiKey() {
  return bufferEnv("BUFFER_API_KEY");
}

export function bufferConfigured() {
  return Boolean(bufferApiKey());
}

export function bufferTikTokUsername() {
  return (bufferEnv("BUFFER_TIKTOK_USERNAME") || BUFFER_TIKTOK_USERNAME_DEFAULT).replace(/^@/, "").toLowerCase();
}

/** Env-only TikTok readiness. Never contacts Buffer — status polls must not burn the API quota. */
export function bufferTikTokReadiness(): TikTokConnectionStatus {
  const configured = bufferConfigured();
  const channel = bufferTikTokUsername();
  if (!configured) {
    return {
      configured: false,
      connected: false,
      platform: "tiktok",
      channel: "",
      channelId: "",
      error: "BUFFER_API_KEY is not configured",
    };
  }
  return {
    configured: true,
    connected: true,
    platform: "tiktok",
    channel,
    channelId: "",
    error: "",
  };
}

function retryAfterWaitLabel(retryAfterHeader?: string | null): string {
  const raw = String(retryAfterHeader || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return `${seconds} second${seconds === 1 ? "" : "s"} (Retry-After)`;
  }
  const when = Date.parse(raw);
  if (!Number.isFinite(when)) return "";
  const seconds = Math.max(1, Math.ceil((when - Date.now()) / 1000));
  return `${seconds} second${seconds === 1 ? "" : "s"} (Retry-After)`;
}

/** HTTP 429 from Buffer is a quota wait, not a broken TikTok connection. */
export function bufferRateLimitMessage(retryAfterHeader?: string | null): string {
  const wait = retryAfterWaitLabel(retryAfterHeader);
  if (wait) {
    return `Buffer rate-limited TikTok publishing. Wait ${wait}, then click TikTok again.`;
  }
  return "Buffer rate-limited TikTok publishing. Wait, then click TikTok again.";
}

export function isBufferRateLimitMessage(message: string) {
  return /rate-limited TikTok publishing|rate.?limit|too many requests/i.test(message);
}

export function buildTikTokCaption(title: string, topic: string) {
  const headline = String(title || topic || "Dream meaning").trim().slice(0, 120);
  return appendDreamlySocialCta(`${headline}\n\n#dreams #dreammeaning #dreamly`, 2200);
}
