import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  TIKTOK_AUTH_DOCUMENT,
  TIKTOK_AUTHORIZE_URL,
  TIKTOK_CREATOR_INFO_URL,
  TIKTOK_OAUTH_STATES_COLLECTION,
  TIKTOK_PUBLISH_INIT_URL,
  TIKTOK_PUBLISH_STATUS_URL,
  TIKTOK_SCOPES,
  TIKTOK_TOKEN_URL,
  buildTikTokCaption,
  chunkPlan,
  tiktokClientKey,
  tiktokClientSecret,
  tiktokConfigured,
  tiktokRedirectUri,
  type TikTokAuthRecord,
  type TikTokConnectionStatus,
} from "@/lib/adminTikTok";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  error?: string;
  error_description?: string;
};

function authRef() {
  return adminDb().doc(TIKTOK_AUTH_DOCUMENT);
}

function apiError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "TikTok request failed";
  const record = payload as {
    error?: string | { code?: string; message?: string };
    error_description?: string;
  };
  if (typeof record.error === "string") {
    return record.error_description || record.error;
  }
  if (record.error && typeof record.error === "object") {
    return record.error.message || record.error.code || "TikTok request failed";
  }
  return "TikTok request failed";
}

async function exchangeToken(body: Record<string, string>) {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token || !payload.refresh_token || !payload.open_id) {
    throw new Error(apiError(payload));
  }
  return payload;
}

export function getTikTokConfig() {
  if (!tiktokConfigured()) {
    throw new Error("TikTok is not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.");
  }
  return {
    clientKey: tiktokClientKey(),
    clientSecret: tiktokClientSecret(),
    redirectUri: tiktokRedirectUri(),
  };
}

export async function getTikTokStatus(): Promise<TikTokConnectionStatus> {
  const configured = tiktokConfigured();
  const snapshot = await authRef().get();
  if (!snapshot.exists) {
    return {
      connected: false,
      configured,
      openId: "",
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
      displayName: "",
    };
  }
  const data = snapshot.data() as TikTokAuthRecord;
  return {
    connected: Boolean(data.accessToken && data.refreshToken),
    configured,
    openId: data.openId || "",
    scope: data.scope || "",
    accessTokenExpiresAt: data.accessTokenExpiresAt || null,
    connectedAt: data.connectedAt || null,
    displayName: data.displayName || "",
  };
}

export async function resetTikTokConnection() {
  const db = adminDb();
  await authRef().delete().catch(() => undefined);
  const states = await db.collection(TIKTOK_OAUTH_STATES_COLLECTION).listDocuments();
  await Promise.all(states.map((doc) => doc.delete().catch(() => undefined)));
  return { ok: true as const };
}

export async function createOAuthStart(adminUid: string) {
  const { clientKey, redirectUri } = getTikTokConfig();
  const state = randomBytes(24).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await adminDb().collection(TIKTOK_OAUTH_STATES_COLLECTION).doc(state).set({
    adminUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  const url = new URL(TIKTOK_AUTHORIZE_URL);
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("disable_auto_auth", "1");
  return { authorizeUrl: url.toString(), state };
}

export async function completeOAuthCallback(code: string, state: string) {
  const { clientKey, clientSecret, redirectUri } = getTikTokConfig();
  const stateRef = adminDb().collection(TIKTOK_OAUTH_STATES_COLLECTION).doc(state);
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

  const token = await exchangeToken({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const now = Date.now();
  const record: TikTokAuthRecord = {
    openId: String(token.open_id),
    accessToken: String(token.access_token),
    refreshToken: String(token.refresh_token),
    scope: String(token.scope || ""),
    accessTokenExpiresAt: new Date(now + Number(token.expires_in || 86400) * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(now + Number(token.refresh_expires_in || 31536000) * 1000).toISOString(),
    connectedBy: adminUid,
    connectedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await authRef().set(record, { merge: true });
  await stateRef.delete().catch(() => undefined);
  return record;
}

async function readAuth(): Promise<TikTokAuthRecord> {
  const snapshot = await authRef().get();
  if (!snapshot.exists) throw new Error("TikTok is not connected");
  return snapshot.data() as TikTokAuthRecord;
}

export async function getValidAccessToken() {
  const { clientKey, clientSecret } = getTikTokConfig();
  const current = await readAuth();
  const expiresAt = Date.parse(current.accessTokenExpiresAt || "") || 0;
  if (expiresAt - 60_000 > Date.now() && current.accessToken) {
    return current.accessToken;
  }

  const token = await exchangeToken({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: current.refreshToken,
  });
  const now = Date.now();
  const next: Partial<TikTokAuthRecord> = {
    openId: String(token.open_id || current.openId),
    accessToken: String(token.access_token),
    refreshToken: String(token.refresh_token || current.refreshToken),
    scope: String(token.scope || current.scope || ""),
    accessTokenExpiresAt: new Date(now + Number(token.expires_in || 86400) * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(now + Number(token.refresh_expires_in || 31536000) * 1000).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await authRef().set(next, { merge: true });
  return String(token.access_token);
}

async function loadLibraryVideo(libraryId: string) {
  const [kind, rawId] = libraryId.split(":");
  if (!rawId || (kind !== "free" && kind !== "ai")) {
    throw new Error("Invalid video id");
  }
  const collection = kind === "free" ? "adminVideoJobs" : AI_VIDEO_COLLECTION;
  const snapshot = await adminDb().collection(collection).doc(rawId).get();
  if (!snapshot.exists) throw new Error("Video not found");
  const data = snapshot.data() as {
    status?: string;
    videoUrl?: string;
    topic?: string;
    youtubeMetadata?: { title?: string; hashtags?: string[] };
  };
  const videoUrl = String(data.videoUrl || "");
  if (data.status !== "completed" || !videoUrl) throw new Error("Video is not ready");
  const title = String(data.youtubeMetadata?.title || data.topic || "Dreamly Short").trim();
  const hashtags = Array.isArray(data.youtubeMetadata?.hashtags)
    ? data.youtubeMetadata!.hashtags.map((tag) => `#${String(tag).replace(/^#/, "")}`).join(" ")
    : "";
  const captionBase = hashtags ? `${title}\n\n${hashtags}\n\nGet your dream meaning → link in bio` : buildTikTokCaption(title, String(data.topic || ""));
  return {
    kind,
    jobId: rawId,
    collection,
    videoUrl,
    title,
    caption: captionBase.slice(0, 2200),
  };
}

async function queryCreatorInfo(accessToken: string) {
  const response = await fetch(TIKTOK_CREATOR_INFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: "{}",
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    data?: {
      privacy_level_options?: string[];
      creator_nickname?: string;
      max_video_post_duration_sec?: number;
      comment_disabled?: boolean;
      duet_disabled?: boolean;
      stitch_disabled?: boolean;
    };
    error?: { code?: string; message?: string };
  };
  if (!response.ok || payload.error?.code !== "ok") {
    throw new Error(apiError(payload));
  }
  return payload.data || {};
}

function pickPrivacyLevel(options: string[] | undefined) {
  const list = options || [];
  // Unaudited / sandbox clients can only publish SELF_ONLY. Prefer it whenever available.
  if (list.includes("SELF_ONLY")) return "SELF_ONLY";
  if (list.includes("MUTUAL_FOLLOW_FRIENDS")) return "MUTUAL_FOLLOW_FRIENDS";
  if (list.includes("PUBLIC_TO_EVERYONE")) return "PUBLIC_TO_EVERYONE";
  return "SELF_ONLY";
}

async function uploadVideoChunks(uploadUrl: string, bytes: Uint8Array, chunkSize: number) {
  const total = bytes.byteLength;
  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    const chunk = bytes.subarray(offset, end);
    const body = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${offset}-${end - 1}/${total}`,
      },
      body,
      cache: "no-store",
    });
    if (!response.ok && response.status !== 201 && response.status !== 206) {
      const text = await response.text().catch(() => "");
      throw new Error(`TikTok upload failed (${response.status}): ${text.slice(0, 300)}`);
    }
    offset = end;
  }
}

async function waitForPublish(accessToken: string, publishId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2_000 : 3_000));
    const response = await fetch(TIKTOK_PUBLISH_STATUS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      data?: { status?: string; fail_reason?: string };
      error?: { code?: string; message?: string };
    };
    if (!response.ok || (payload.error && payload.error.code !== "ok")) {
      throw new Error(apiError(payload));
    }
    const status = String(payload.data?.status || "");
    if (status === "PUBLISH_COMPLETE" || status === "SEND_TO_USER_INBOX") {
      return { status, failReason: "" };
    }
    if (status === "FAILED") {
      throw new Error(payload.data?.fail_reason || "TikTok publish failed");
    }
  }
  return { status: "PROCESSING_DOWNLOAD", failReason: "" };
}

export async function publishLibraryVideoToTikTok(libraryId: string, adminUid: string) {
  const video = await loadLibraryVideo(libraryId);
  const accessToken = await getValidAccessToken();
  const creator = await queryCreatorInfo(accessToken);
  const privacyLevel = pickPrivacyLevel(creator.privacy_level_options);
  const privacyOptions = creator.privacy_level_options || [];
  if (privacyOptions.length > 0 && !privacyOptions.includes(privacyLevel)) {
    throw new Error(
      `TikTok does not allow privacy=${privacyLevel}. Available: ${privacyOptions.join(", ")}. For sandbox/unaudited apps use a private TikTok account and SELF_ONLY.`,
    );
  }

  const mediaResponse = await fetch(video.videoUrl, { cache: "no-store" });
  if (!mediaResponse.ok) throw new Error("Failed to download video for TikTok upload");
  const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
  const { chunkSize, totalChunkCount } = chunkPlan(bytes.byteLength);

  const initResponse = await fetch(TIKTOK_PUBLISH_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: video.caption,
        privacy_level: privacyLevel,
        // Defaults match TikTok integration guidelines: interactions off unless user enables them.
        disable_duet: true,
        disable_comment: true,
        disable_stitch: true,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: bytes.byteLength,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }),
    cache: "no-store",
  });
  const initPayload = (await initResponse.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (!initResponse.ok || initPayload.error?.code !== "ok" || !initPayload.data?.publish_id || !initPayload.data?.upload_url) {
    const message = apiError(initPayload);
    if (/integration guidelines/i.test(message)) {
      throw new Error(
        `${message} Tip: for sandbox/unaudited posting set @dreamly.art to Private account and retry Publish (SELF_ONLY only).`,
      );
    }
    throw new Error(message);
  }

  await uploadVideoChunks(initPayload.data.upload_url, bytes, chunkSize);
  const result = await waitForPublish(accessToken, initPayload.data.publish_id);

  const publishMeta = {
    tiktokPublishId: initPayload.data.publish_id,
    tiktokStatus: result.status,
    tiktokPrivacyLevel: privacyLevel,
    tiktokPublishedAt: new Date().toISOString(),
    tiktokPublishedBy: adminUid,
    tiktokError: "",
  };
  await adminDb().collection(video.collection).doc(video.jobId).set(publishMeta, { merge: true });

  if (creator.creator_nickname) {
    await authRef().set({ displayName: creator.creator_nickname, updatedAt: new Date().toISOString() }, { merge: true });
  }

  return {
    publishId: initPayload.data.publish_id,
    status: result.status,
    privacyLevel,
    title: video.title,
    caption: video.caption,
    videoFingerprint: createHash("sha1").update(bytes.subarray(0, Math.min(bytes.byteLength, 1024 * 1024))).digest("hex").slice(0, 12),
  };
}
