export const THREADS_AUTH_DOCUMENT = "adminSystem/threadsAuth";
export const THREADS_OAUTH_STATES_COLLECTION = "adminThreadsOAuthStates";
export const THREADS_PRIVACY_REQUESTS_COLLECTION = "adminThreadsPrivacyRequests";

export const THREADS_SCOPES = ["threads_basic", "threads_content_publish"].join(",");

export const THREADS_AUTHORIZE_URL = "https://threads.net/oauth/authorize";
export const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
export const THREADS_LONG_LIVED_TOKEN_URL = "https://graph.threads.net/access_token";
export const THREADS_REFRESH_TOKEN_URL = "https://graph.threads.net/refresh_access_token";
export const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";

export type ThreadsAuthRecord = {
  userId: string;
  username: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  scope: string;
  connectedBy: string;
  connectedAt: string;
  updatedAt: string;
};

export type ThreadsConnectionStatus = {
  connected: boolean;
  configured: boolean;
  userId: string;
  username: string;
  scope: string;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
};

export type ThreadsPrivacyRequestKind = "deauthorize" | "delete";

export type ThreadsPrivacyRequestRecord = {
  kind: ThreadsPrivacyRequestKind;
  threadsUserId: string;
  status: "completed";
  receivedAt: string;
  completedAt: string;
  tokenRemoved: boolean;
};

export function threadsEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function threadsAppId() {
  return threadsEnv("THREADS_APP_ID");
}

export function threadsAppSecret() {
  return threadsEnv("THREADS_APP_SECRET");
}

export function threadsRedirectUri() {
  return threadsEnv("THREADS_REDIRECT_URI") || "https://dreamly.art/api/admin/threads/callback";
}

export function threadsSiteUrl() {
  return threadsEnv("THREADS_SITE_URL") || "https://dreamly.art";
}

export function threadsConfigured() {
  return Boolean(threadsAppId() && threadsAppSecret());
}

export function threadsDeletionStatusUrl(confirmationCode: string) {
  return `${threadsSiteUrl()}/api/admin/threads/delete?code=${encodeURIComponent(confirmationCode)}`;
}
