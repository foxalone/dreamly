import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_TOKEN_URL,
  YOUTUBE_API_URL,
  YOUTUBE_AUTH_DOCUMENT,
  YOUTUBE_DESCRIPTION_LIMIT,
  YOUTUBE_OAUTH_STATES_COLLECTION,
  YOUTUBE_TITLE_LIMIT,
  YOUTUBE_UPLOAD_URL,
  youtubeCategoryId,
  youtubeClientId,
  youtubeClientSecret,
  youtubeConfigured,
  youtubePrivacyStatus,
  youtubeRedirectUri,
  youtubeScopes,
  type YouTubeAuthRecord,
  type YouTubeConnectionStatus,
} from "@/lib/adminYouTube";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { loadLibraryVideo } from "@/app/api/admin/_lib/libraryVideo";

const YOUTUBE_PUBLISH_LOCK_MS = 30 * 60 * 1000;

type GoogleTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function authRef() {
  return adminDb().doc(YOUTUBE_AUTH_DOCUMENT);
}

function googleError(payload: unknown, fallback = "YouTube request failed") {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as {
    error?: string | { message?: string; status?: string };
    error_description?: string;
  };
  if (typeof record.error === "string") return record.error_description || record.error;
  if (record.error && typeof record.error === "object") {
    return record.error.message || record.error.status || fallback;
  }
  return fallback;
}

export function getYouTubeConfig() {
  if (!youtubeConfigured()) {
    throw new Error("YouTube is not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.");
  }
  return {
    clientId: youtubeClientId(),
    clientSecret: youtubeClientSecret(),
    redirectUri: youtubeRedirectUri(),
  };
}

export async function getYouTubeStatus(): Promise<YouTubeConnectionStatus> {
  const configured = youtubeConfigured();
  const privacyStatus = youtubePrivacyStatus();
  const snapshot = await authRef().get();
  if (!snapshot.exists) {
    return {
      connected: false,
      configured,
      channelId: "",
      channelTitle: "",
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
      privacyStatus,
    };
  }
  const data = snapshot.data() as YouTubeAuthRecord;
  return {
    // Without a refresh token every upload would need a fresh consent, so a
    // record without one does not count as connected.
    connected: Boolean(data.refreshToken && data.accessToken),
    configured,
    channelId: data.channelId || "",
    channelTitle: data.channelTitle || "",
    scope: data.scope || "",
    accessTokenExpiresAt: data.accessTokenExpiresAt || null,
    connectedAt: data.connectedAt || null,
    privacyStatus,
  };
}

export async function resetYouTubeConnection() {
  const db = adminDb();
  await authRef().delete().catch(() => undefined);
  const states = await db.collection(YOUTUBE_OAUTH_STATES_COLLECTION).listDocuments();
  await Promise.all(states.map((doc) => doc.delete().catch(() => undefined)));
  return { ok: true as const };
}

export async function createYouTubeOAuthStart(adminUid: string) {
  const { clientId, redirectUri } = getYouTubeConfig();
  const state = randomBytes(24).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await adminDb().collection(YOUTUBE_OAUTH_STATES_COLLECTION).doc(state).set({
    adminUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", youtubeScopes());
  url.searchParams.set("state", state);
  // offline + consent are what make Google return a refresh token, so the
  // channel stays connected without re-authorising before every upload.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return { authorizeUrl: url.toString(), state };
}

async function tokenRequest(params: Record<string, string>, fallback: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(googleError(payload, fallback));
  }
  return payload;
}

async function exchangeCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getYouTubeConfig();
  return tokenRequest(
    {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
    "Failed to exchange the Google OAuth code",
  );
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getYouTubeConfig();
  return tokenRequest(
    {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    },
    "Failed to refresh the YouTube access token",
  );
}

async function fetchChannel(accessToken: string) {
  const url = new URL(`${YOUTUBE_API_URL}/channels`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    items?: Array<{ id?: string; snippet?: { title?: string } }>;
    error?: { message?: string };
  };
  // The channel lookup needs youtube.readonly. If that scope was declined the
  // connection is still usable for uploading, so this stays non-fatal.
  if (!response.ok || payload.error) return { id: "", title: "" };
  const first = payload.items?.[0];
  return { id: String(first?.id || ""), title: String(first?.snippet?.title || "") };
}

export async function completeYouTubeOAuthCallback(code: string, state: string) {
  const stateRef = adminDb().collection(YOUTUBE_OAUTH_STATES_COLLECTION).doc(state);
  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) throw new Error("Invalid OAuth state");
  const stateData = stateSnap.data() as { adminUid?: string; expiresAt?: Timestamp };
  const expiresAt = stateData.expiresAt?.toMillis?.() ?? 0;
  if (!expiresAt || expiresAt < Date.now()) {
    await stateRef.delete().catch(() => undefined);
    throw new Error("OAuth state expired");
  }
  const adminUid = String(stateData.adminUid || "");
  if (!adminUid) throw new Error("Invalid OAuth state");

  const token = await exchangeCode(code);
  const accessToken = String(token.access_token);
  const previous = (await authRef().get()).data() as YouTubeAuthRecord | undefined;
  // Google only returns a refresh token on the first consent, so keep the
  // stored one when a reconnect does not include a new value.
  const refreshToken = String(token.refresh_token || previous?.refreshToken || "");
  if (!refreshToken) {
    throw new Error(
      "Google did not return a refresh token. Remove Dreamly at myaccount.google.com/permissions and connect again.",
    );
  }
  const channel = await fetchChannel(accessToken);
  const now = new Date().toISOString();
  const record: YouTubeAuthRecord = {
    channelId: channel.id || previous?.channelId || "",
    channelTitle: channel.title || previous?.channelTitle || "",
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    refreshToken,
    scope: String(token.scope || youtubeScopes()),
    connectedBy: adminUid,
    connectedAt: previous?.connectedAt || now,
    updatedAt: now,
  };
  await authRef().set(record);
  await stateRef.delete().catch(() => undefined);
  return record;
}

async function getValidYouTubeAuth(): Promise<YouTubeAuthRecord> {
  const snapshot = await authRef().get();
  if (!snapshot.exists) throw new Error("YouTube is not connected");
  const current = snapshot.data() as YouTubeAuthRecord;
  if (!current.refreshToken) throw new Error("YouTube is not connected");

  const expiresAt = Date.parse(current.accessTokenExpiresAt || "") || 0;
  if (expiresAt - 2 * 60 * 1000 > Date.now() && current.accessToken) return current;

  try {
    const refreshed = await refreshAccessToken(current.refreshToken);
    const record: YouTubeAuthRecord = {
      ...current,
      accessToken: String(refreshed.access_token),
      accessTokenExpiresAt: new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString(),
      refreshToken: String(refreshed.refresh_token || current.refreshToken),
      updatedAt: new Date().toISOString(),
    };
    await authRef().set(record);
    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube token expired";
    throw new Error(`${message}. Reconnect YouTube.`);
  }
}

// YouTube rejects angle brackets in title and description.
function sanitize(value: string) {
  return String(value || "").replace(/[<>]/g, "").trim();
}

export function buildYouTubeTitle(title: string, topic: string) {
  const headline = sanitize(title) || sanitize(topic) || "Dream meaning";
  return headline.length > YOUTUBE_TITLE_LIMIT ? `${headline.slice(0, YOUTUBE_TITLE_LIMIT - 1).trimEnd()}…` : headline;
}

// Reuses the shared caption (headline + hashtags + Dreamly CTA) and only
// strips what does not belong in a YouTube description.
export function buildYouTubeDescription(caption: string) {
  return sanitize(caption).slice(0, YOUTUBE_DESCRIPTION_LIMIT);
}

export function buildYouTubeTags(hashtags: string) {
  return String(hashtags || "")
    .split(/\s+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter((tag) => tag.length > 0 && tag.length <= 100)
    .slice(0, 15);
}

async function downloadVideoBytes(videoUrl: string) {
  const response = await fetch(videoUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to download video for the YouTube upload");
  return new Uint8Array(await response.arrayBuffer());
}

async function resumableUpload(accessToken: string, metadata: unknown, bytes: Uint8Array) {
  const initUrl = new URL(YOUTUBE_UPLOAD_URL);
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");
  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(bytes.byteLength),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(metadata),
    cache: "no-store",
  });
  if (!initResponse.ok) {
    const payload = await initResponse.json().catch(() => ({}));
    throw new Error(googleError(payload, "YouTube rejected the upload session"));
  }
  const sessionUrl = initResponse.headers.get("location") || "";
  if (!sessionUrl) throw new Error("YouTube did not return an upload session URL");

  const uploadResponse = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/mp4",
      "Content-Length": String(bytes.byteLength),
    },
    body: Buffer.from(bytes),
    cache: "no-store",
  });
  const payload = (await uploadResponse.json().catch(() => ({}))) as {
    id?: string;
    status?: { uploadStatus?: string; privacyStatus?: string };
    error?: { message?: string };
  };
  if (!uploadResponse.ok || payload.error || !payload.id) {
    throw new Error(googleError(payload, "YouTube upload failed"));
  }
  return payload;
}

export async function publishLibraryVideoToYouTube(libraryId: string, adminUid: string) {
  const video = await loadLibraryVideo(libraryId, YOUTUBE_DESCRIPTION_LIMIT);
  const auth = await getValidYouTubeAuth();
  const jobRef = adminDb().collection(video.collection).doc(video.jobId);
  const startedAt = new Date().toISOString();

  // Same transactional guard as Threads: an already-published video, or one
  // whose upload is still running, can never be uploaded twice.
  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    const data = (snapshot.data() || {}) as {
      youtubeStatus?: string;
      youtubePublishedAt?: string;
      youtubePublishStartedAt?: string;
    };
    if (data.youtubePublishedAt || data.youtubeStatus === "published") {
      throw new Error("This video is already published to YouTube");
    }
    if (data.youtubeStatus === "publishing") {
      const lockedAt = Date.parse(data.youtubePublishStartedAt || "") || 0;
      if (Date.now() - lockedAt < YOUTUBE_PUBLISH_LOCK_MS) {
        throw new Error("A YouTube upload is already running for this video");
      }
    }
    transaction.set(
      jobRef,
      { youtubeStatus: "publishing", youtubePublishStartedAt: startedAt, youtubePublishedBy: adminUid, youtubeError: "" },
      { merge: true },
    );
  });

  try {
    const tags = buildYouTubeTags(video.hashtags);
    const metadata = {
      snippet: {
        title: buildYouTubeTitle(video.title, video.topic),
        description: buildYouTubeDescription(video.caption),
        categoryId: youtubeCategoryId(),
        ...(tags.length > 0 ? { tags } : {}),
      },
      status: {
        privacyStatus: youtubePrivacyStatus(),
        selfDeclaredMadeForKids: false,
      },
    };

    const bytes = await downloadVideoBytes(video.videoUrl);
    const uploaded = await resumableUpload(auth.accessToken, metadata, bytes);
    const videoId = String(uploaded.id);

    await jobRef.set(
      {
        youtubeStatus: "published",
        youtubeVideoId: videoId,
        youtubePrivacyStatus: String(uploaded.status?.privacyStatus || youtubePrivacyStatus()),
        youtubePublishedAt: new Date().toISOString(),
        youtubePublishedBy: adminUid,
        youtubeError: "",
      },
      { merge: true },
    );

    return {
      target: "youtube" as const,
      status: "PUBLISHED",
      videoId,
      privacyStatus: String(uploaded.status?.privacyStatus || youtubePrivacyStatus()),
      title: metadata.snippet.title,
      channelTitle: auth.channelTitle,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube publish failed";
    await jobRef
      .set({ youtubeStatus: "failed", youtubeError: message.slice(0, 300) }, { merge: true })
      .catch(() => undefined);
    throw error;
  }
}
