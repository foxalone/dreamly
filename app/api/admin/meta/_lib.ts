import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  META_AUTH_DOCUMENT,
  META_OAUTH_STATES_COLLECTION,
  META_SCOPES,
  metaAppId,
  metaAppSecret,
  metaAuthorizeUrl,
  metaConfigured,
  metaGraphUrl,
  metaGraphVersion,
  metaIgUserIdOverride,
  metaPageIdOverride,
  metaRedirectUri,
  type MetaAuthRecord,
  type MetaConnectionStatus,
} from "@/lib/adminMeta";
import { loadLibraryVideo } from "@/app/api/admin/_lib/libraryVideo";
import {
  instagramFeedImageUrl,
  loadLibraryImage,
  markLibraryImageFailed,
  markLibraryImagePublished,
} from "@/app/api/admin/_lib/libraryImage";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

type GraphErrorPayload = {
  error?: { message?: string; type?: string; code?: number; error_user_msg?: string };
};

type TokenPayload = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type PageRecord = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id?: string; username?: string };
};

export type MetaPublishTarget = "instagram" | "facebook";

function authRef() {
  return adminDb().doc(META_AUTH_DOCUMENT);
}

function metaError(payload: unknown, fallback = "Meta request failed") {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as {
    error?: string | { message?: string; type?: string; error_user_msg?: string };
    error_description?: string;
  };
  if (typeof record.error === "string") {
    return record.error_description || record.error;
  }
  if (record.error && typeof record.error === "object") {
    return record.error.error_user_msg || record.error.message || record.error.type || fallback;
  }
  return fallback;
}

async function graphFetch<T>(
  path: string,
  accessToken: string,
  init?: { method?: string; params?: Record<string, string>; headers?: Record<string, string>; body?: BodyInit | null },
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : metaGraphUrl(path));
  const method = init?.method || "GET";
  const params = { access_token: accessToken, ...(init?.params || {}) };
  let body = init?.body ?? null;
  const headers = { ...(init?.headers || {}) };
  if (!body) {
    if (method === "GET") {
      for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
      }
    } else {
      body = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, value]) => Boolean(value))),
      );
      headers["Content-Type"] = headers["Content-Type"] || "application/x-www-form-urlencoded";
    }
  } else {
    url.searchParams.set("access_token", accessToken);
  }
  const response = await fetch(url, {
    method,
    headers,
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & GraphErrorPayload;
  if (!response.ok || payload.error) {
    throw new Error(metaError(payload));
  }
  return payload;
}

export function getMetaConfig() {
  if (!metaConfigured()) {
    throw new Error("Meta is not configured. Set META_APP_ID and META_APP_SECRET.");
  }
  return {
    appId: metaAppId(),
    appSecret: metaAppSecret(),
    redirectUri: metaRedirectUri(),
  };
}

export async function getMetaStatus(): Promise<MetaConnectionStatus> {
  const configured = metaConfigured();
  const snapshot = await authRef().get();
  if (!snapshot.exists) {
    return {
      connected: false,
      configured,
      facebookReady: false,
      instagramReady: false,
      pageId: "",
      pageName: "",
      igUserId: "",
      igUsername: "",
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
    };
  }
  const data = snapshot.data() as MetaAuthRecord;
  const connected = Boolean(data.userAccessToken && data.pageAccessToken && data.pageId);
  return {
    connected,
    configured,
    facebookReady: connected,
    instagramReady: connected && Boolean(data.igUserId),
    pageId: data.pageId || "",
    pageName: data.pageName || "",
    igUserId: data.igUserId || "",
    igUsername: data.igUsername || "",
    scope: data.scope || "",
    accessTokenExpiresAt: data.userAccessTokenExpiresAt || null,
    connectedAt: data.connectedAt || null,
  };
}

export async function resetMetaConnection() {
  const db = adminDb();
  await authRef().delete().catch(() => undefined);
  const states = await db.collection(META_OAUTH_STATES_COLLECTION).listDocuments();
  await Promise.all(states.map((doc) => doc.delete().catch(() => undefined)));
  return { ok: true as const };
}

export async function createOAuthStart(adminUid: string) {
  const { appId, redirectUri } = getMetaConfig();
  const state = randomBytes(24).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await adminDb().collection(META_OAUTH_STATES_COLLECTION).doc(state).set({
    adminUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  const url = new URL(metaAuthorizeUrl());
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("auth_type", "rerequest");
  return { authorizeUrl: url.toString(), state };
}

async function exchangeCode(code: string) {
  const { appId, appSecret, redirectUri } = getMetaConfig();
  const url = new URL(metaGraphUrl("/oauth/access_token"));
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(metaError(payload, "Failed to exchange Meta OAuth code"));
  }
  return payload;
}

async function exchangeLongLived(shortLivedToken: string) {
  const { appId, appSecret } = getMetaConfig();
  const url = new URL(metaGraphUrl("/oauth/access_token"));
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(metaError(payload, "Failed to create long-lived Meta token"));
  }
  return payload;
}

async function fetchPages(userAccessToken: string): Promise<PageRecord[]> {
  const payload = await graphFetch<{ data?: PageRecord[] }>("/me/accounts", userAccessToken, {
    params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50" },
  });
  return Array.isArray(payload.data) ? payload.data.filter((page) => page.id && page.access_token) : [];
}

function pickPage(pages: PageRecord[]) {
  if (pages.length === 0) {
    throw new Error(
      "No Facebook Page found. Create a Page, grant pages_show_list / pages_manage_posts, then reconnect Meta.",
    );
  }
  const pageId = metaPageIdOverride();
  const igUserId = metaIgUserIdOverride();
  const byPageId = pageId ? pages.find((page) => page.id === pageId) : undefined;
  const byIg = igUserId
    ? pages.find((page) => page.instagram_business_account?.id === igUserId)
    : undefined;
  const withIg = pages.find((page) => page.instagram_business_account?.id);
  return byPageId || byIg || withIg || pages[0];
}

async function fetchUserId(userAccessToken: string) {
  const payload = await graphFetch<{ id?: string }>("/me", userAccessToken, { params: { fields: "id" } });
  return String(payload.id || "");
}

function tokenExpiryIso(expiresIn: number | undefined, fallbackDays: number) {
  const seconds = Number(expiresIn || fallbackDays * 24 * 60 * 60);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function saveAuth(adminUid: string, userToken: TokenPayload, scope: string, previous?: MetaAuthRecord) {
  const userAccessToken = String(userToken.access_token);
  const [userId, pages] = await Promise.all([fetchUserId(userAccessToken), fetchPages(userAccessToken)]);
  const page = pickPage(pages);
  const now = new Date().toISOString();
  const record: MetaAuthRecord = {
    userId,
    userAccessToken,
    userAccessTokenExpiresAt: tokenExpiryIso(userToken.expires_in, 60),
    pageId: page.id,
    pageName: page.name || "",
    pageAccessToken: page.access_token,
    igUserId: String(page.instagram_business_account?.id || metaIgUserIdOverride() || ""),
    igUsername: String(page.instagram_business_account?.username || ""),
    scope,
    connectedBy: adminUid,
    connectedAt: previous?.connectedAt || now,
    updatedAt: now,
  };
  await authRef().set(record);
  return record;
}

export async function completeOAuthCallback(code: string, state: string) {
  const stateRef = adminDb().collection(META_OAUTH_STATES_COLLECTION).doc(state);
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

  const shortLived = await exchangeCode(code);
  const longLived = await exchangeLongLived(String(shortLived.access_token));
  const record = await saveAuth(adminUid, longLived, META_SCOPES);
  await stateRef.delete().catch(() => undefined);
  return record;
}

async function readAuth(): Promise<MetaAuthRecord> {
  const snapshot = await authRef().get();
  if (!snapshot.exists) throw new Error("Meta is not connected");
  return snapshot.data() as MetaAuthRecord;
}

async function getValidAuth() {
  const current = await readAuth();
  const expiresAt = Date.parse(current.userAccessTokenExpiresAt || "") || 0;
  if (expiresAt - 7 * 24 * 60 * 60 * 1000 > Date.now() && current.userAccessToken && current.pageAccessToken) {
    return current;
  }
  try {
    const refreshed = await exchangeLongLived(current.userAccessToken);
    return await saveAuth(current.connectedBy, refreshed, current.scope || META_SCOPES, current);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta token expired";
    throw new Error(`${message}. Reconnect Meta.`);
  }
}

async function downloadVideoBytes(videoUrl: string) {
  const response = await fetch(videoUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to download video for Meta upload");
  return new Uint8Array(await response.arrayBuffer());
}

function isFetchableVideoError(message: string) {
  return /download|fetch|url|2207050|2207026|cannot retrieve/i.test(message);
}

async function createInstagramContainer(auth: MetaAuthRecord, video: Awaited<ReturnType<typeof loadLibraryVideo>>) {
  const params: Record<string, string> = {
    media_type: "REELS",
    video_url: video.videoUrl,
    caption: video.caption,
    share_to_feed: "true",
    thumb_offset: "1000",
  };
  if (video.thumbnailUrl) params.cover_url = video.thumbnailUrl;
  return graphFetch<{ id?: string }>(`/${auth.igUserId}/media`, auth.userAccessToken, {
    method: "POST",
    params,
  });
}

async function createInstagramResumableContainer(
  auth: MetaAuthRecord,
  video: Awaited<ReturnType<typeof loadLibraryVideo>>,
  bytes: Uint8Array,
) {
  const params: Record<string, string> = {
    media_type: "REELS",
    upload_type: "resumable",
    caption: video.caption,
    share_to_feed: "true",
    thumb_offset: "1000",
  };
  if (video.thumbnailUrl) params.cover_url = video.thumbnailUrl;
  const created = await graphFetch<{ id?: string }>(`/${auth.igUserId}/media`, auth.userAccessToken, {
    method: "POST",
    params,
  });
  const containerId = String(created.id || "");
  if (!containerId) throw new Error("Instagram did not return a media container");

  const versionedUrl = `https://rupload.facebook.com/ig-api-upload/${metaGraphVersion()}/${containerId}`;
  const response = await fetch(versionedUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${auth.userAccessToken}`,
      offset: "0",
      file_size: String(bytes.byteLength),
      "Content-Type": "application/octet-stream",
    },
    body: Buffer.from(bytes),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as GraphErrorPayload & { success?: boolean };
  if (!response.ok || payload.error || payload.success === false) {
    throw new Error(metaError(payload, "Instagram resumable upload failed"));
  }
  return { id: containerId };
}

async function waitForInstagramContainer(accessToken: string, containerId: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 3_000 : 4_000));
    const payload = await graphFetch<{ status_code?: string; status?: string }>(`/${containerId}`, accessToken, {
      params: { fields: "status_code,status" },
    });
    const status = String(payload.status_code || payload.status || "").toUpperCase();
    if (status === "FINISHED" || status === "PUBLISHED") return status;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Instagram container ${status.toLowerCase()}`);
    }
  }
  throw new Error("Instagram is still processing the video. Retry publish in a minute.");
}

async function publishInstagram(libraryId: string, adminUid: string) {
  const video = await loadLibraryVideo(libraryId);
  const auth = await getValidAuth();
  if (!auth.igUserId) {
    throw new Error(
      "Instagram is not linked. Convert the account to Professional, attach it to the Facebook Page, then reconnect Meta.",
    );
  }

  let containerId = "";
  try {
    const created = await createInstagramContainer(auth, video);
    containerId = String(created.id || "");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isFetchableVideoError(message)) throw error;
    const bytes = await downloadVideoBytes(video.videoUrl);
    const created = await createInstagramResumableContainer(auth, video, bytes);
    containerId = created.id;
  }
  if (!containerId) throw new Error("Instagram did not return a media container");

  await waitForInstagramContainer(auth.userAccessToken, containerId);
  const published = await graphFetch<{ id?: string }>(`/${auth.igUserId}/media_publish`, auth.userAccessToken, {
    method: "POST",
    params: { creation_id: containerId },
  });
  const mediaId = String(published.id || containerId);
  await adminDb().collection(video.collection).doc(video.jobId).set(
    {
      instagramMediaId: mediaId,
      instagramContainerId: containerId,
      instagramStatus: "PUBLISHED",
      instagramPublishedAt: new Date().toISOString(),
      instagramPublishedBy: adminUid,
      instagramError: "",
    },
    { merge: true },
  );
  return {
    target: "instagram" as const,
    mediaId,
    status: "PUBLISHED",
    title: video.title,
    caption: video.caption,
    igUsername: auth.igUsername,
  };
}

async function uploadFacebookReel(auth: MetaAuthRecord, videoUrl: string, uploadUrl: string) {
  const hosted = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${auth.pageAccessToken}`,
      file_url: videoUrl,
    },
    cache: "no-store",
  });
  const hostedPayload = (await hosted.json().catch(() => ({}))) as GraphErrorPayload & { success?: boolean };
  if (hosted.ok && !hostedPayload.error && hostedPayload.success !== false) {
    return;
  }

  const bytes = await downloadVideoBytes(videoUrl);
  const binary = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${auth.pageAccessToken}`,
      offset: "0",
      file_size: String(bytes.byteLength),
      "Content-Type": "application/octet-stream",
    },
    body: Buffer.from(bytes),
    cache: "no-store",
  });
  const binaryPayload = (await binary.json().catch(() => ({}))) as GraphErrorPayload & { success?: boolean };
  if (!binary.ok || binaryPayload.error || binaryPayload.success === false) {
    throw new Error(metaError(binaryPayload, metaError(hostedPayload, "Facebook Reels upload failed")));
  }
}

async function publishFacebook(libraryId: string, adminUid: string) {
  const video = await loadLibraryVideo(libraryId);
  const auth = await getValidAuth();
  if (!auth.pageId || !auth.pageAccessToken) {
    throw new Error("Facebook Page is not connected. Reconnect Meta and grant Page permissions.");
  }

  const started = await graphFetch<{ video_id?: string; upload_url?: string }>(
    `/${auth.pageId}/video_reels`,
    auth.pageAccessToken,
    { method: "POST", params: { upload_phase: "start" } },
  );
  const videoId = String(started.video_id || "");
  const uploadUrl = String(started.upload_url || "");
  if (!videoId || !uploadUrl) throw new Error("Facebook did not return a Reels upload session");

  await uploadFacebookReel(auth, video.videoUrl, uploadUrl);

  const finished = await graphFetch<{ success?: boolean; post_id?: string; video_id?: string }>(
    `/${auth.pageId}/video_reels`,
    auth.pageAccessToken,
    {
      method: "POST",
      params: {
        upload_phase: "finish",
        video_id: videoId,
        video_state: "PUBLISHED",
        description: video.caption,
        title: video.title.slice(0, 255),
      },
    },
  );
  const postId = String(finished.post_id || videoId);
  await adminDb().collection(video.collection).doc(video.jobId).set(
    {
      facebookVideoId: videoId,
      facebookPostId: postId,
      facebookStatus: "PUBLISHED",
      facebookPublishedAt: new Date().toISOString(),
      facebookPublishedBy: adminUid,
      facebookError: "",
    },
    { merge: true },
  );
  return {
    target: "facebook" as const,
    videoId,
    postId,
    status: "PUBLISHED",
    title: video.title,
    caption: video.caption,
    pageName: auth.pageName,
  };
}

export async function publishLibraryVideoToMeta(
  libraryId: string,
  adminUid: string,
  target: MetaPublishTarget,
) {
  if (target === "instagram") return publishInstagram(libraryId, adminUid);
  if (target === "facebook") return publishFacebook(libraryId, adminUid);
  throw new Error("Unknown Meta publish target");
}

async function publishInstagramImage(jobId: string, adminUid: string) {
  const image = await loadLibraryImage(jobId);
  const auth = await getValidAuth();
  if (!auth.igUserId) {
    throw new Error(
      "Instagram is not linked. Convert the account to Professional, attach it to the Facebook Page, then reconnect Meta.",
    );
  }
  const existing = await adminDb().collection(image.collection).doc(image.jobId).get();
  if ((existing.data() as { instagramPublishedAt?: string } | undefined)?.instagramPublishedAt) {
    throw new Error("This image is already published to Instagram");
  }

  const imageUrl = await instagramFeedImageUrl(image);
  const created = await graphFetch<{ id?: string }>(`/${auth.igUserId}/media`, auth.userAccessToken, {
    method: "POST",
    params: {
      image_url: imageUrl,
      caption: image.caption,
    },
  });
  const containerId = String(created.id || "");
  if (!containerId) throw new Error("Instagram did not return a media container");

  await waitForInstagramContainer(auth.userAccessToken, containerId);
  const published = await graphFetch<{ id?: string }>(`/${auth.igUserId}/media_publish`, auth.userAccessToken, {
    method: "POST",
    params: { creation_id: containerId },
  });
  const mediaId = String(published.id || containerId);
  await markLibraryImagePublished(image.jobId, "instagram", adminUid, {
    instagramMediaId: mediaId,
    instagramContainerId: containerId,
  });
  return {
    target: "instagram" as const,
    mediaId,
    status: "PUBLISHED" as const,
    title: image.title,
    caption: image.caption,
    pageUrl: image.pageUrl,
    igUsername: auth.igUsername,
  };
}

async function publishFacebookImage(jobId: string, adminUid: string) {
  const image = await loadLibraryImage(jobId);
  const auth = await getValidAuth();
  if (!auth.pageId || !auth.pageAccessToken) {
    throw new Error("Facebook Page is not connected. Reconnect Meta and grant Page permissions.");
  }
  const existing = await adminDb().collection(image.collection).doc(image.jobId).get();
  if ((existing.data() as { facebookPublishedAt?: string } | undefined)?.facebookPublishedAt) {
    throw new Error("This image is already published to Facebook");
  }

  const posted = await graphFetch<{ id?: string; post_id?: string }>(`/${auth.pageId}/photos`, auth.pageAccessToken, {
    method: "POST",
    params: {
      url: image.imageUrl,
      caption: image.caption,
      published: "true",
    },
  });
  const photoId = String(posted.id || "");
  const postId = String(posted.post_id || photoId);
  if (!photoId && !postId) throw new Error("Facebook did not return a photo id");
  await markLibraryImagePublished(image.jobId, "facebook", adminUid, {
    facebookPhotoId: photoId,
    facebookPostId: postId,
  });
  return {
    target: "facebook" as const,
    photoId,
    postId,
    status: "PUBLISHED" as const,
    title: image.title,
    caption: image.caption,
    pageUrl: image.pageUrl,
    pageName: auth.pageName,
  };
}

export async function publishLibraryImageToMeta(
  jobId: string,
  adminUid: string,
  target: MetaPublishTarget,
) {
  try {
    if (target === "instagram") return await publishInstagramImage(jobId, adminUid);
    if (target === "facebook") return await publishFacebookImage(jobId, adminUid);
    throw new Error("Unknown Meta publish target");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta image publish failed";
    if (!/already published/i.test(message)) {
      await markLibraryImageFailed(jobId, target, message);
    }
    throw error;
  }
}
