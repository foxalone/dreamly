import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  TUMBLR_API_URL,
  TUMBLR_AUTH_DOCUMENT,
  TUMBLR_CAPTION_LIMIT,
  TUMBLR_MAX_VIDEO_BYTES,
  TUMBLR_OAUTH_STATES_COLLECTION,
  TUMBLR_PUBLISH_LOCK_MS,
  TUMBLR_SCOPE_STRING,
  TUMBLR_TOKEN_URL,
  TUMBLR_USER_AGENT,
  TumblrPublishError,
  buildTumblrAuthorizeUrl,
  buildTumblrMultipartBody,
  buildTumblrNpfPost,
  buildTumblrTags,
  classifyTumblrError,
  isMp4,
  isTumblrAccessTokenStale,
  normalizeTumblrBlogs,
  readMp4Dimensions,
  sanitizeTumblrError,
  selectTumblrBlog,
  tumblrBlogIdentifierOverride,
  tumblrClientId,
  tumblrClientSecret,
  tumblrConfigured,
  tumblrErrorMessage,
  tumblrPostUrl,
  tumblrRedirectUri,
  tumblrTokenExpiryIso,
  type TumblrAuthRecord,
  type TumblrConnectionStatus,
} from "@/lib/adminTumblr";
import { SocialPublishPendingError } from "@/lib/socialPublishPending";
import { publicPublishUrl } from "@/lib/socialPublishLog";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { loadLibraryVideo } from "@/app/api/admin/_lib/libraryVideo";
import { trackDreamlyPublish } from "@/app/api/admin/_lib/notionPublishLog";

const DOWNLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_TIMEOUT_MS = 180_000;
const API_TIMEOUT_MS = 20_000;
const RECOVERY_POST_SCAN = 20;

type TumblrTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function authRef() {
  return adminDb().doc(TUMBLR_AUTH_DOCUMENT);
}

export function getTumblrConfig() {
  if (!tumblrConfigured()) {
    throw new Error("Tumblr is not configured. Set TUMBLR_CLIENT_ID and TUMBLR_CLIENT_SECRET.");
  }
  return {
    clientId: tumblrClientId(),
    clientSecret: tumblrClientSecret(),
    redirectUri: tumblrRedirectUri(),
  };
}

function tumblrHeaders(accessToken = "") {
  return {
    Accept: "application/json",
    // Tumblr expects one stable User-Agent per integration.
    "User-Agent": TUMBLR_USER_AGENT,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function tokenRequest(body: Record<string, string>, fallback: string) {
  let response: Response;
  try {
    response = await fetch(TUMBLR_TOKEN_URL, {
      method: "POST",
      headers: {
        ...tumblrHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    throw new TumblrPublishError("authentication", sanitizeTumblrError(error), true);
  }
  const payload = (await response.json().catch(() => ({}))) as TumblrTokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new TumblrPublishError(
      "authentication",
      sanitizeTumblrError(new Error(tumblrErrorMessage(payload, response.status, fallback))),
      response.status >= 500 || response.status === 429,
      response.status,
    );
  }
  return payload;
}

type TumblrFetchInit = {
  method?: string;
  query?: Record<string, string>;
  json?: unknown;
  body?: BodyInit;
  // Set by the multipart upload, which builds its own boundary.
  contentType?: string;
  timeoutMs?: number;
};

async function tumblrFetch<T>(path: string, accessToken: string, init: TumblrFetchInit = {}): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${TUMBLR_API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(init.query || {})) {
    if (value) url.searchParams.set(key, value);
  }
  const method = init.method || "GET";
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...tumblrHeaders(accessToken),
        ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.contentType ? { "Content-Type": init.contentType } : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? API_TIMEOUT_MS),
    });
  } catch (error) {
    // Timeouts and socket errors are the ambiguous case: the post may or may
    // not exist. They are retryable, and the retry re-checks the blog first.
    throw new TumblrPublishError("publishing", sanitizeTumblrError(error), true);
  }

  const raw = await response.text().catch(() => "");
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      if (response.ok) {
        throw new TumblrPublishError("publishing", "Tumblr returned a malformed response", false, response.status);
      }
      payload = {};
    }
  }
  if (!response.ok) {
    const classified = classifyTumblrError(
      response.status,
      sanitizeTumblrError(new Error(tumblrErrorMessage(payload, response.status, `Tumblr ${method} failed`))),
    );
    throw new TumblrPublishError(classified.phase, classified.message, classified.retryable, response.status);
  }
  const envelope = payload as { response?: T };
  if (!envelope || typeof envelope !== "object" || envelope.response === undefined) {
    throw new TumblrPublishError("publishing", "Tumblr returned a malformed response", false, response.status);
  }
  return envelope.response;
}

export async function getTumblrStatus(): Promise<TumblrConnectionStatus> {
  const configured = tumblrConfigured();
  const snapshot = await authRef().get();
  if (!snapshot.exists) {
    return {
      connected: false,
      configured,
      userName: "",
      blogIdentifier: "",
      blogName: "",
      blogTitle: "",
      blogUrl: "",
      blogs: [],
      blogAmbiguous: false,
      scope: "",
      accessTokenExpiresAt: null,
      tokenHealthy: false,
      connectedAt: null,
    };
  }
  const data = snapshot.data() as TumblrAuthRecord;
  // Only non-secret fields leave this function — never a token.
  return {
    connected: Boolean(data.refreshToken && data.accessToken && data.blogIdentifier),
    configured,
    userName: data.userName || "",
    blogIdentifier: data.blogIdentifier || "",
    blogName: data.blogName || "",
    blogTitle: data.blogTitle || "",
    blogUrl: data.blogUrl || "",
    blogs: Array.isArray(data.blogs) ? data.blogs : [],
    blogAmbiguous: Boolean(data.blogAmbiguous),
    scope: data.scope || "",
    accessTokenExpiresAt: data.accessTokenExpiresAt || null,
    // A refresh token is what keeps unattended publishing alive; an expired
    // access token on its own is healthy because it is refreshed on demand.
    tokenHealthy: Boolean(data.refreshToken),
    connectedAt: data.connectedAt || null,
  };
}

export async function resetTumblrConnection() {
  const db = adminDb();
  // Removes the stored credentials and the blog selection. Posts already
  // published to Tumblr are untouched.
  await authRef().delete().catch(() => undefined);
  const states = await db.collection(TUMBLR_OAUTH_STATES_COLLECTION).listDocuments();
  await Promise.all(states.map((doc) => doc.delete().catch(() => undefined)));
  return { ok: true as const };
}

export async function createTumblrOAuthStart(adminUid: string) {
  const { clientId, redirectUri } = getTumblrConfig();
  const state = randomBytes(24).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await adminDb().collection(TUMBLR_OAUTH_STATES_COLLECTION).doc(state).set({
    adminUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
  return {
    authorizeUrl: buildTumblrAuthorizeUrl({ clientId, redirectUri, state }),
    state,
  };
}

async function fetchTumblrUserInfo(accessToken: string) {
  const payload = await tumblrFetch<{ user?: { name?: string; blogs?: unknown } }>("/user/info", accessToken);
  return {
    userName: String(payload.user?.name || ""),
    blogs: normalizeTumblrBlogs(payload.user?.blogs),
  };
}

function blogFieldsFrom(accessTokenBlogs: ReturnType<typeof normalizeTumblrBlogs>) {
  const selection = selectTumblrBlog(accessTokenBlogs, tumblrBlogIdentifierOverride());
  return {
    blogIdentifier: selection.blog?.identifier || "",
    blogName: selection.blog?.name || "",
    blogTitle: selection.blog?.title || "",
    blogUrl: selection.blog?.url || "",
    blogs: accessTokenBlogs,
    // Surfaced in the admin status so a multi-blog account can be pointed at
    // an explicit blog later without another code change.
    blogAmbiguous: selection.ambiguous || (!selection.blog && accessTokenBlogs.length > 1),
  };
}

export async function completeTumblrOAuthCallback(code: string, state: string) {
  const { clientId, clientSecret, redirectUri } = getTumblrConfig();
  if (!String(code || "").trim()) throw new Error("Missing OAuth code");
  const stateRef = adminDb().collection(TUMBLR_OAUTH_STATES_COLLECTION).doc(String(state || "unknown"));
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

  const token = await tokenRequest(
    {
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    },
    "Failed to exchange the Tumblr OAuth code",
  );
  if (!token.refresh_token) {
    throw new Error(
      "Tumblr did not return a refresh token. Reconnect and approve the offline_access scope.",
    );
  }

  const accessToken = String(token.access_token);
  const info = await fetchTumblrUserInfo(accessToken);
  const blogFields = blogFieldsFrom(info.blogs);
  if (!blogFields.blogIdentifier) {
    throw new Error(
      info.blogs.length
        ? "Could not pick a Tumblr blog automatically. Set TUMBLR_BLOG_IDENTIFIER to the blog Dreamly should post to."
        : "This Tumblr account has no blog that Dreamly can post to.",
    );
  }

  const now = new Date().toISOString();
  const record: TumblrAuthRecord = {
    userName: info.userName,
    accessToken,
    accessTokenExpiresAt: tumblrTokenExpiryIso(token.expires_in),
    refreshToken: String(token.refresh_token),
    scope: String(token.scope || TUMBLR_SCOPE_STRING),
    ...blogFields,
    connectedBy: adminUid,
    connectedAt: now,
    updatedAt: now,
  };
  await authRef().set(record, { merge: true });
  await stateRef.delete().catch(() => undefined);
  // Nothing about the token is returned to the caller.
  return {
    ok: true as const,
    userName: record.userName,
    blogIdentifier: record.blogIdentifier,
    blogUrl: record.blogUrl,
    blogAmbiguous: record.blogAmbiguous,
  };
}

async function readTumblrAuth(): Promise<TumblrAuthRecord> {
  const snapshot = await authRef().get();
  if (!snapshot.exists) throw new Error("Tumblr is not connected");
  return snapshot.data() as TumblrAuthRecord;
}

// One refresh at a time inside a warm serverless instance; the Firestore
// transaction below covers the cross-instance case.
let refreshInFlight: Promise<TumblrAuthRecord> | null = null;

async function persistRefreshedTokens(usedRefreshToken: string, next: Partial<TumblrAuthRecord>) {
  return adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(authRef());
    const stored = (snapshot.data() || {}) as TumblrAuthRecord;
    // Another process already rotated the credentials while this refresh was in
    // flight — its tokens are the live ones, ours are stale. Keep theirs.
    if (
      stored.refreshToken &&
      stored.refreshToken !== usedRefreshToken &&
      !isTumblrAccessTokenStale(stored.accessTokenExpiresAt)
    ) {
      return stored;
    }
    transaction.set(authRef(), next, { merge: true });
    return { ...stored, ...next } as TumblrAuthRecord;
  });
}

async function refreshTumblrAuth(current: TumblrAuthRecord): Promise<TumblrAuthRecord> {
  if (refreshInFlight) return refreshInFlight;
  const { clientId, clientSecret } = getTumblrConfig();
  const usedRefreshToken = String(current.refreshToken || "");
  if (!usedRefreshToken) throw new Error("Tumblr is not connected");

  const run = (async () => {
    const token = await tokenRequest(
      {
        grant_type: "refresh_token",
        refresh_token: usedRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
      "Failed to refresh the Tumblr access token",
    );
    const next: Partial<TumblrAuthRecord> = {
      accessToken: String(token.access_token),
      accessTokenExpiresAt: tumblrTokenExpiryIso(token.expires_in),
      // Tumblr rotates refresh tokens: always persist the newest one.
      refreshToken: String(token.refresh_token || usedRefreshToken),
      scope: String(token.scope || current.scope || TUMBLR_SCOPE_STRING),
      updatedAt: new Date().toISOString(),
    };
    return persistRefreshedTokens(usedRefreshToken, next);
  })();

  refreshInFlight = run;
  try {
    return await run;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Reads the stored credentials, refreshes them slightly before they expire,
 * persists the rotated pair atomically and returns a record with a usable
 * access token. `force` is used once after a Tumblr 401.
 */
export async function getValidTumblrAuth(force = false): Promise<TumblrAuthRecord> {
  getTumblrConfig();
  const current = await readTumblrAuth();
  if (!current.refreshToken) throw new Error("Tumblr is not connected");
  if (!force && current.accessToken && !isTumblrAccessTokenStale(current.accessTokenExpiresAt)) {
    return current;
  }
  const refreshed = await refreshTumblrAuth(current);
  return { ...current, ...refreshed };
}

// The helper the rest of the codebase asks for by name.
export async function getValidTumblrAccessToken(force = false) {
  return (await getValidTumblrAuth(force)).accessToken;
}

/**
 * Runs one Tumblr API call and, if Tumblr answers 401, refreshes once and
 * repeats it exactly once. `run` rebuilds its request body every call so a
 * multipart upload can be replayed. There is no third attempt — a second 401
 * means the connection is genuinely broken.
 */
async function withFreshTumblrToken<T>(
  auth: TumblrAuthRecord,
  run: (accessToken: string) => Promise<T>,
): Promise<{ result: T; auth: TumblrAuthRecord }> {
  try {
    return { result: await run(auth.accessToken), auth };
  } catch (error) {
    const unauthorized = error instanceof TumblrPublishError && error.status === 401;
    if (!unauthorized) throw error;
    const refreshed = await getValidTumblrAuth(true);
    return { result: await run(refreshed.accessToken), auth: refreshed };
  }
}

async function downloadTumblrVideo(videoUrl: string) {
  const url = String(videoUrl || "").trim();
  if (!url) throw new TumblrPublishError("download", "The Dreamly MP4 is unavailable for this video");
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch (error) {
    throw new TumblrPublishError("download", `MP4 download failed: ${sanitizeTumblrError(error)}`, true);
  }
  if (!response.ok) {
    throw new TumblrPublishError(
      "download",
      `MP4 download failed (${response.status})`,
      response.status >= 500 || response.status === 429,
      response.status,
    );
  }
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > TUMBLR_MAX_VIDEO_BYTES) {
    throw new TumblrPublishError("limits", `Video exceeds Tumblr's ${TUMBLR_MAX_VIDEO_BYTES}-byte upload limit`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 1024) throw new TumblrPublishError("download", "Video file is empty");
  if (bytes.byteLength > TUMBLR_MAX_VIDEO_BYTES) {
    throw new TumblrPublishError("limits", `Video exceeds Tumblr's ${TUMBLR_MAX_VIDEO_BYTES}-byte upload limit`);
  }
  if (!isMp4(bytes)) throw new TumblrPublishError("download", "Downloaded media is not a valid MP4 file");
  return bytes;
}

type TumblrNpfPostRecord = {
  id?: number | string;
  id_string?: string;
  post_url?: string;
  summary?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function postIdOf(record: { id?: number | string; id_string?: string } | undefined) {
  // Tumblr ids overflow JS numbers, so the string form is the one that is kept.
  return String(record?.id_string || record?.id || "").trim();
}

function npfText(record: TumblrNpfPostRecord) {
  return (record.content || [])
    .filter((block) => block?.type === "text")
    .map((block) => String(block.text || "").trim())
    .join("\n")
    .trim();
}

/**
 * After an ambiguous failure (timeout, socket reset) the post may already
 * exist. Before uploading again, look through the blog's newest posts for the
 * exact caption this job would publish — that turns a duplicate into a
 * recovery.
 */
async function findExistingTumblrPost(accessToken: string, blogIdentifier: string, caption: string) {
  const wanted = String(caption || "").trim();
  if (!wanted) return null;
  const payload = await tumblrFetch<{ posts?: TumblrNpfPostRecord[] }>(
    `/blog/${encodeURIComponent(blogIdentifier)}/posts`,
    accessToken,
    { query: { npf: "true", limit: String(RECOVERY_POST_SCAN) } },
  );
  const match = (payload.posts || []).find((post) => npfText(post) === wanted);
  if (!match) return null;
  const postId = postIdOf(match);
  return postId ? { postId, postUrl: String(match.post_url || "") } : null;
}

async function canonicalTumblrPostUrl(
  accessToken: string,
  blogIdentifier: string,
  blogUrl: string,
  postId: string,
) {
  try {
    const payload = await tumblrFetch<{ posts?: TumblrNpfPostRecord[] }>(
      `/blog/${encodeURIComponent(blogIdentifier)}/posts`,
      accessToken,
      { query: { id: postId, npf: "true" } },
    );
    const found = (payload.posts || []).find((post) => postIdOf(post) === postId) || (payload.posts || [])[0];
    const url = String(found?.post_url || "").trim();
    if (url) return url;
  } catch {
    // Reading the permalink back is a nicety, never a reason to fail a publish
    // that Tumblr already accepted.
  }
  return tumblrPostUrl(blogUrl, blogIdentifier, postId);
}

type PublishOptions = { deadlineMs?: number };

export async function publishLibraryVideoToTumblr(
  libraryId: string,
  adminUid: string,
  options: PublishOptions = {},
) {
  // The exact MP4 and caption every other network already publishes.
  const video = await loadLibraryVideo(libraryId, TUMBLR_CAPTION_LIMIT);
  let auth = await getValidTumblrAuth();
  const blogIdentifier = String(auth.blogIdentifier || "");
  if (!blogIdentifier) {
    throw new Error("Tumblr blog is not selected. Reconnect Tumblr or set TUMBLR_BLOG_IDENTIFIER.");
  }

  const jobRef = adminDb().collection(video.collection).doc(video.jobId);
  const initial = ((await jobRef.get()).data() || {}) as {
    tumblrStatus?: string;
    tumblrPostId?: string;
    tumblrPostUrl?: string;
    tumblrPublishedAt?: string;
    tumblrPublishStartedAt?: string;
    tumblrPublishAttempts?: number;
  };

  // Idempotency, first gate: a stored post id means Tumblr already has it.
  if (initial.tumblrPostId) {
    return {
      target: "tumblr" as const,
      status: "PUBLISHED" as const,
      alreadyPublished: true,
      postId: initial.tumblrPostId,
      postUrl: initial.tumblrPostUrl || tumblrPostUrl(auth.blogUrl, blogIdentifier, initial.tumblrPostId),
      blogIdentifier,
    };
  }
  if (initial.tumblrPublishedAt || initial.tumblrStatus === "published") {
    throw new Error("This video is already published to Tumblr");
  }

  const startedAt = new Date().toISOString();
  let attempts = Number(initial.tumblrPublishAttempts || 0);

  // Idempotency, second gate: a transactional claim so two workers (cron tick
  // and an admin click) can never upload the same video at the same time.
  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    const data = (snapshot.data() || {}) as {
      tumblrStatus?: string;
      tumblrPostId?: string;
      tumblrPublishedAt?: string;
      tumblrPublishStartedAt?: string;
      tumblrPublishRequestedAt?: string;
      tumblrPublishAttempts?: number;
    };
    if (data.tumblrPostId || data.tumblrPublishedAt || data.tumblrStatus === "published") {
      throw new Error("This video is already published to Tumblr");
    }
    if (["uploading", "publishing", "processing"].includes(String(data.tumblrStatus || ""))) {
      const lockedAt = Date.parse(data.tumblrPublishStartedAt || "") || 0;
      if (Date.now() - lockedAt < TUMBLR_PUBLISH_LOCK_MS) {
        throw new SocialPublishPendingError("A Tumblr publish is already running for this video");
      }
    }
    attempts = Number(data.tumblrPublishAttempts || 0) + 1;
    transaction.set(
      jobRef,
      {
        tumblrStatus: "uploading",
        tumblrPublishRequestedAt: data.tumblrPublishRequestedAt || startedAt,
        tumblrPublishStartedAt: startedAt,
        tumblrPublishedBy: adminUid,
        tumblrBlogIdentifier: blogIdentifier,
        tumblrPublishAttempts: attempts,
        tumblrError: "",
      },
      { merge: true },
    );
  });

  const caption = video.caption;
  const tags = buildTumblrTags({
    hashtags: video.hashtagList,
    tags: video.tags,
    topic: video.topic || video.title,
  });

  try {
    // Idempotency, third gate: on any retry, check whether a previous attempt
    // already created the post before uploading the file again.
    if (attempts > 1) {
      const recovery = await withFreshTumblrToken(auth, (token) =>
        findExistingTumblrPost(token, blogIdentifier, caption),
      );
      auth = recovery.auth;
      if (recovery.result) {
        const postUrl =
          recovery.result.postUrl ||
          (await canonicalTumblrPostUrl(auth.accessToken, blogIdentifier, auth.blogUrl, recovery.result.postId));
        await persistTumblrPublished({
          jobRef,
          libraryId,
          title: video.title,
          blogIdentifier,
          postId: recovery.result.postId,
          postUrl,
          adminUid,
        });
        return {
          target: "tumblr" as const,
          status: "PUBLISHED" as const,
          recovered: true,
          postId: recovery.result.postId,
          postUrl,
          blogIdentifier,
          tags,
        };
      }
    }

    const bytes = await downloadTumblrVideo(video.videoUrl);
    // Dimensions come from the rendered file itself, never from a constant.
    const dimensions = readMp4Dimensions(bytes);
    const npf = buildTumblrNpfPost({
      text: caption,
      tags,
      width: dimensions?.width,
      height: dimensions?.height,
    });

    await jobRef.set({ tumblrStatus: "publishing", tumblrError: "" }, { merge: true });

    const timeoutMs = options.deadlineMs
      ? Math.max(30_000, Math.min(UPLOAD_TIMEOUT_MS, options.deadlineMs - Date.now()))
      : UPLOAD_TIMEOUT_MS;

    // multipart/form-data: a `json` part with the NPF body, plus the MP4 under
    // a field name identical to the NPF media identifier.
    const multipart = buildTumblrMultipartBody(npf, bytes);

    const created = await withFreshTumblrToken(auth, (token) =>
      tumblrFetch<{ id?: number | string; id_string?: string; state?: string }>(
        `/blog/${encodeURIComponent(blogIdentifier)}/posts`,
        token,
        { method: "POST", body: multipart.body, contentType: multipart.contentType, timeoutMs },
      ),
    );
    auth = created.auth;
    const postId = postIdOf(created.result);
    if (!postId) throw new TumblrPublishError("publishing", "Tumblr did not return a post id");

    const postUrl = await canonicalTumblrPostUrl(auth.accessToken, blogIdentifier, auth.blogUrl, postId);
    await persistTumblrPublished({
      jobRef,
      libraryId,
      title: video.title,
      blogIdentifier,
      postId,
      postUrl,
      adminUid,
    });

    return {
      target: "tumblr" as const,
      status: "PUBLISHED" as const,
      postId,
      postUrl,
      blogIdentifier,
      blogName: auth.blogName,
      tags,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    };
  } catch (error) {
    if (error instanceof SocialPublishPendingError) throw error;
    const message = sanitizeTumblrError(error);
    const retryable = error instanceof TumblrPublishError && error.retryable;
    // The lock is always released so the queue's next attempt (and a manual
    // retry from the admin card) is not blocked by a stale claim.
    await jobRef
      .set(
        {
          tumblrStatus: "failed",
          tumblrError: retryable ? `Temporary Tumblr error, will retry: ${message}` : message,
          tumblrPublishStartedAt: FieldValue.delete(),
        },
        { merge: true },
      )
      .catch(() => undefined);
    if (retryable) throw new SocialPublishPendingError(message);
    throw new Error(message);
  }
}

async function persistTumblrPublished(input: {
  jobRef: FirebaseFirestore.DocumentReference;
  libraryId: string;
  title: string;
  blogIdentifier: string;
  postId: string;
  postUrl: string;
  adminUid: string;
}) {
  const publishedAt = new Date().toISOString();
  await input.jobRef.set(
    {
      tumblrStatus: "published",
      tumblrPostId: input.postId,
      tumblrPostUrl: input.postUrl,
      tumblrBlogIdentifier: input.blogIdentifier,
      tumblrPublishedAt: publishedAt,
      tumblrPublishedBy: input.adminUid,
      tumblrError: "",
      tumblrPublishStartedAt: FieldValue.delete(),
    },
    { merge: true },
  );
  await trackDreamlyPublish({
    kind: "video",
    assetId: input.libraryId,
    platform: "tumblr",
    title: input.title,
    publishedAt,
    url: publicPublishUrl("tumblr", { tumblrPostUrl: input.postUrl }),
    notes: `video ${input.libraryId} · ${input.blogIdentifier} · ${input.postId}`,
  });
  return publishedAt;
}
