export const YOUTUBE_AUTH_DOCUMENT = "adminSystem/youtubeAuth";
export const YOUTUBE_OAUTH_STATES_COLLECTION = "adminYouTubeOAuthStates";

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
export const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

// youtube.upload is the minimum scope for videos.insert. youtube.readonly is
// added only so the admin UI can display which channel is connected
// (channels.list?mine=true); drop it from YOUTUBE_SCOPES if the channel name is
// not worth the extra scope.
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

// YouTube metadata limits.
export const YOUTUBE_TITLE_LIMIT = 100;
export const YOUTUBE_DESCRIPTION_LIMIT = 5000;

export type YouTubeAuthRecord = {
  channelId: string;
  channelTitle: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  scope: string;
  connectedBy: string;
  connectedAt: string;
  updatedAt: string;
};

export type YouTubeConnectionStatus = {
  connected: boolean;
  configured: boolean;
  channelId: string;
  channelTitle: string;
  scope: string;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
  privacyStatus: string;
};

export function youtubeEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function youtubeClientId() {
  return youtubeEnv("YOUTUBE_CLIENT_ID");
}

export function youtubeClientSecret() {
  return youtubeEnv("YOUTUBE_CLIENT_SECRET");
}

export function youtubeRedirectUri() {
  return youtubeEnv("YOUTUBE_REDIRECT_URI") || "https://dreamly.art/api/admin/youtube/callback";
}

export function youtubeScopes() {
  return youtubeEnv("YOUTUBE_SCOPES") || YOUTUBE_SCOPES;
}

// YouTube locks uploads from API projects that have not passed the compliance
// audit to private regardless of what is requested here, so this is the
// requested privacy, not a guarantee.
export function youtubePrivacyStatus() {
  const value = youtubeEnv("YOUTUBE_PRIVACY_STATUS").toLowerCase();
  return value === "private" || value === "unlisted" || value === "public" ? value : "public";
}

export function youtubeCategoryId() {
  return youtubeEnv("YOUTUBE_CATEGORY_ID") || "22";
}

export function youtubeConfigured() {
  return Boolean(youtubeClientId() && youtubeClientSecret());
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
