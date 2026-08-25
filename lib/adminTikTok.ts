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

export function buildTikTokCaption(title: string, topic: string) {
  const headline = String(title || topic || "Dream meaning").trim().slice(0, 120);
  return appendDreamlySocialCta(`${headline}\n\n#dreams #dreammeaning #dreamly`, 2200);
}
