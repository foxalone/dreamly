import { PINTEREST_BOARD_NAME as DEFAULT_BOARD_NAME } from "@/lib/adminVideoLibrary";
import { DREAMLY_SOCIAL_URL } from "@/lib/socialCta";

export const PINTEREST_AUTH_DOCUMENT = "adminSystem/pinterestAuth";
export const PINTEREST_OAUTH_STATES_COLLECTION = "adminPinterestOAuthStates";

// Trial access cannot publish production Pins. Keep the real publish result in
// storage, but do not surface the expected failure in the admin libraries until
// permanent access is approved.
export const SHOW_PINTEREST_PUBLISH_ERRORS = false;

export const PINTEREST_SCOPES = [
  "user_accounts:read",
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
].join(",");

export const PINTEREST_AUTHORIZE_URL = "https://www.pinterest.com/oauth/";
export const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
export const PINTEREST_API_URL = "https://api.pinterest.com/v5";

export const PINTEREST_TITLE_LIMIT = 100;
export const PINTEREST_DESCRIPTION_LIMIT = 800;
export const PINTEREST_ALT_TEXT_LIMIT = 500;

export type PinterestAuthRecord = {
  accountId: string;
  username: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  scope: string;
  boardId: string;
  boardName: string;
  connectedBy: string;
  connectedAt: string;
  updatedAt: string;
};

export type PinterestConnectionStatus = {
  connected: boolean;
  configured: boolean;
  accountId: string;
  username: string;
  boardId: string;
  boardName: string;
  scope: string;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
};

export function pinterestEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function pinterestAppId() {
  return pinterestEnv("PINTEREST_APP_ID");
}

export function pinterestAppSecret() {
  return pinterestEnv("PINTEREST_APP_SECRET");
}

export function pinterestRedirectUri() {
  return pinterestEnv("PINTEREST_REDIRECT_URI") || "https://dreamly.art/api/admin/pinterest/callback";
}

export function pinterestBoardName() {
  return pinterestEnv("PINTEREST_BOARD_NAME") || DEFAULT_BOARD_NAME;
}

export function pinterestBoardIdOverride() {
  return pinterestEnv("PINTEREST_BOARD_ID");
}

export function pinterestCoverFallbackUrl() {
  return pinterestEnv("PINTEREST_COVER_FALLBACK_URL") || `${DREAMLY_SOCIAL_URL}/opengraph-image`;
}

export function pinterestConfigured() {
  return Boolean(pinterestAppId() && pinterestAppSecret());
}

export function pinterestPinUrl(pinId: string) {
  return `https://www.pinterest.com/pin/${encodeURIComponent(pinId)}/`;
}
