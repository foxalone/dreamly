import { appendDreamlySocialCta } from "@/lib/socialCta";

export const TIKTOK_AUTH_DOCUMENT = "adminSystem/tiktokAuth";
export const TIKTOK_OAUTH_STATES_COLLECTION = "adminTikTokOAuthStates";
export const TIKTOK_SCOPES = "user.info.basic,video.publish";
export const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_CREATOR_INFO_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
export const TIKTOK_PUBLISH_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
export const TIKTOK_PUBLISH_STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

export type TikTokAuthRecord = {
  openId: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  connectedBy: string;
  connectedAt: string;
  updatedAt: string;
  displayName?: string;
};

export type TikTokConnectionStatus = {
  connected: boolean;
  configured: boolean;
  openId: string;
  scope: string;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
  displayName: string;
};

export function tiktokEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function tiktokClientKey() {
  return tiktokEnv("TIKTOK_CLIENT_KEY");
}

export function tiktokClientSecret() {
  return tiktokEnv("TIKTOK_CLIENT_SECRET");
}

export function tiktokRedirectUri() {
  return tiktokEnv("TIKTOK_REDIRECT_URI") || "https://dreamly.art/api/admin/tiktok/callback";
}

export function tiktokConfigured() {
  return Boolean(tiktokClientKey() && tiktokClientSecret());
}

export function buildTikTokCaption(title: string, topic: string) {
  const headline = String(title || topic || "Dream meaning").trim().slice(0, 120);
  return appendDreamlySocialCta(`${headline}\n\n#dreams #dreammeaning #dreamly`, 2200);
}

export function chunkPlan(videoSize: number) {
  const FIVE_MB = 5 * 1024 * 1024;
  const SIXTY_FOUR_MB = 64 * 1024 * 1024;
  if (videoSize <= 0) throw new Error("Video file is empty");
  if (videoSize < FIVE_MB || videoSize <= SIXTY_FOUR_MB) {
    return { chunkSize: videoSize, totalChunkCount: 1 };
  }
  const chunkSize = SIXTY_FOUR_MB;
  const totalChunkCount = Math.ceil(videoSize / chunkSize);
  return { chunkSize, totalChunkCount };
}
