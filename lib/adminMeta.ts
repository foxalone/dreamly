export const META_AUTH_DOCUMENT = "adminSystem/metaAuth";
export const META_OAUTH_STATES_COLLECTION = "adminMetaOAuthStates";
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export type MetaAuthRecord = {
  userId: string;
  userAccessToken: string;
  userAccessTokenExpiresAt: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId: string;
  igUsername: string;
  scope: string;
  connectedBy: string;
  connectedAt: string;
  updatedAt: string;
};

export type MetaConnectionStatus = {
  connected: boolean;
  configured: boolean;
  facebookReady: boolean;
  instagramReady: boolean;
  pageId: string;
  pageName: string;
  igUserId: string;
  igUsername: string;
  scope: string;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
};

export function metaEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function metaGraphVersion() {
  return metaEnv("META_GRAPH_VERSION") || "v22.0";
}

export function metaAppId() {
  return metaEnv("META_APP_ID");
}

export function metaAppSecret() {
  return metaEnv("META_APP_SECRET");
}

export function metaRedirectUri() {
  return metaEnv("META_REDIRECT_URI") || "https://dreamly.art/api/admin/meta/callback";
}

export function metaPageIdOverride() {
  return metaEnv("META_PAGE_ID");
}

export function metaIgUserIdOverride() {
  return metaEnv("META_IG_USER_ID");
}

export function metaConfigured() {
  return Boolean(metaAppId() && metaAppSecret());
}

export function metaGraphUrl(path = "") {
  const version = metaGraphVersion();
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `https://graph.facebook.com/${version}${suffix}`;
}

export function metaAuthorizeUrl() {
  return `https://www.facebook.com/${metaGraphVersion()}/dialog/oauth`;
}
