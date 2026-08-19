import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  PINTEREST_ALT_TEXT_LIMIT,
  PINTEREST_API_URL,
  PINTEREST_AUTH_DOCUMENT,
  PINTEREST_AUTHORIZE_URL,
  PINTEREST_DESCRIPTION_LIMIT,
  PINTEREST_OAUTH_STATES_COLLECTION,
  PINTEREST_SCOPES,
  PINTEREST_TITLE_LIMIT,
  PINTEREST_TOKEN_URL,
  pinterestAppId,
  pinterestAppSecret,
  pinterestBoardIdOverride,
  pinterestBoardName,
  pinterestConfigured,
  pinterestCoverFallbackUrl,
  pinterestRedirectUri,
  type PinterestAuthRecord,
  type PinterestConnectionStatus,
} from "@/lib/adminPinterest";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { loadLibraryVideo } from "@/app/api/admin/_lib/libraryVideo";
import { DREAMLY_SOCIAL_URL } from "@/lib/socialCta";

const PINTEREST_PUBLISH_LOCK_MS = 15 * 60 * 1000;

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  refresh_token_expires_at?: number;
  scope?: string;
  response_type?: string;
  message?: string;
  code?: number;
};

type PinterestErrorPayload = {
  message?: string;
  code?: number;
  status?: string;
};

type BoardRecord = {
  id?: string;
  name?: string;
};

function authRef() {
  return adminDb().doc(PINTEREST_AUTH_DOCUMENT);
}

function basicAuthHeader() {
  return `Basic ${Buffer.from(`${pinterestAppId()}:${pinterestAppSecret()}`).toString("base64")}`;
}

function pinterestError(payload: unknown, fallback = "Pinterest request failed") {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as PinterestErrorPayload & { error?: string; error_description?: string };
  return (
    record.message ||
    record.error_description ||
    record.error ||
    (typeof record.code === "number" ? `Pinterest error ${record.code}` : "") ||
    fallback
  );
}

function clip(value: string, max: number) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}

export function getPinterestConfig() {
  if (!pinterestConfigured()) {
    throw new Error("Pinterest is not configured. Set PINTEREST_APP_ID and PINTEREST_APP_SECRET.");
  }
  return {
    appId: pinterestAppId(),
    appSecret: pinterestAppSecret(),
    redirectUri: pinterestRedirectUri(),
  };
}

async function tokenRequest(body: Record<string, string>, fallback: string) {
  const response = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(pinterestError(payload, fallback));
  }
  return payload;
}

async function pinterestFetch<T>(
  path: string,
  accessToken: string,
  init?: { method?: string; body?: unknown; query?: Record<string, string> },
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${PINTEREST_API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(init?.query || {})) {
    if (value) url.searchParams.set(key, value);
  }
  const method = init?.method || "GET";
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (response.status === 204) return {} as T;
  const payload = (await response.json().catch(() => ({}))) as T & PinterestErrorPayload;
  if (!response.ok || payload.status === "failure") {
    throw new Error(pinterestError(payload, `Pinterest ${method} ${url.pathname} failed (${response.status})`));
  }
  return payload;
}

export async function getPinterestStatus(): Promise<PinterestConnectionStatus> {
  const configured = pinterestConfigured();
  const snapshot = await authRef().get();
  if (!snapshot.exists) {
    return {
      connected: false,
      configured,
      accountId: "",
      username: "",
      boardId: "",
      boardName: pinterestBoardName(),
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
    };
  }
  const data = snapshot.data() as PinterestAuthRecord;
  return {
    connected: Boolean(data.refreshToken && data.accessToken),
    configured,
    accountId: data.accountId || "",
    username: data.username || "",
    boardId: data.boardId || "",
    boardName: data.boardName || pinterestBoardName(),
    scope: data.scope || "",
    accessTokenExpiresAt: data.accessTokenExpiresAt || null,
    connectedAt: data.connectedAt || null,
  };
}

export async function resetPinterestConnection() {
  const db = adminDb();
  await authRef().delete().catch(() => undefined);
  const states = await db.collection(PINTEREST_OAUTH_STATES_COLLECTION).listDocuments();
  await Promise.all(states.map((doc) => doc.delete().catch(() => undefined)));
  return { ok: true as const };
}

export async function createPinterestOAuthStart(adminUid: string) {
  const { appId, redirectUri } = getPinterestConfig();
  const state = randomBytes(24).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await adminDb().collection(PINTEREST_OAUTH_STATES_COLLECTION).doc(state).set({
    adminUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  const url = new URL(PINTEREST_AUTHORIZE_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", PINTEREST_SCOPES);
  url.searchParams.set("state", state);
  return { authorizeUrl: url.toString(), state };
}

async function fetchUserAccount(accessToken: string) {
  const payload = await pinterestFetch<{ id?: string; username?: string }>("/user_account", accessToken);
  return {
    id: String(payload.id || ""),
    username: String(payload.username || ""),
  };
}

async function listBoards(accessToken: string) {
  const boards: BoardRecord[] = [];
  let bookmark = "";
  for (let page = 0; page < 8; page += 1) {
    const payload = await pinterestFetch<{ items?: BoardRecord[]; bookmark?: string }>("/boards", accessToken, {
      query: { page_size: "100", ...(bookmark ? { bookmark } : {}) },
    });
    boards.push(...(payload.items || []));
    bookmark = String(payload.bookmark || "");
    if (!bookmark) break;
  }
  return boards;
}

async function createBoard(accessToken: string, name: string) {
  const created = await pinterestFetch<BoardRecord>("/boards", accessToken, {
    method: "POST",
    body: {
      name,
      description: "Dream meanings and interpretation videos from Dreamly.",
      privacy: "PUBLIC",
    },
  });
  const id = String(created.id || "");
  if (!id) throw new Error(`Pinterest did not return an id for board «${name}»`);
  return { id, name: String(created.name || name) };
}

async function resolveBoard(accessToken: string, current?: { boardId?: string; boardName?: string }) {
  const overrideId = pinterestBoardIdOverride();
  const wantedName = pinterestBoardName();
  if (overrideId) {
    return { id: overrideId, name: current?.boardName || wantedName };
  }
  if (current?.boardId) {
    try {
      const existing = await pinterestFetch<BoardRecord>(`/boards/${current.boardId}`, accessToken);
      if (existing.id) {
        return { id: String(existing.id), name: String(existing.name || current.boardName || wantedName) };
      }
    } catch {
      // Board was deleted or the stored id is stale — fall through to lookup/create.
    }
  }

  const boards = await listBoards(accessToken);
  const match = boards.find((board) => String(board.name || "").trim().toLowerCase() === wantedName.toLowerCase());
  if (match?.id) {
    return { id: String(match.id), name: String(match.name || wantedName) };
  }
  return createBoard(accessToken, wantedName);
}

function tokenExpiryIso(seconds: number | undefined, fallbackSeconds: number) {
  return new Date(Date.now() + Number(seconds || fallbackSeconds) * 1000).toISOString();
}

export async function completePinterestOAuthCallback(code: string, state: string) {
  const { redirectUri } = getPinterestConfig();
  const stateRef = adminDb().collection(PINTEREST_OAUTH_STATES_COLLECTION).doc(state);
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
      redirect_uri: redirectUri,
      continuous_refresh: "true",
    },
    "Failed to exchange the Pinterest OAuth code",
  );
  if (!token.access_token || !token.refresh_token) {
    throw new Error("Pinterest did not return a refresh token. Reconnect and approve all requested scopes.");
  }
  const accessToken = token.access_token;
  const refreshToken = token.refresh_token;

  const account = await fetchUserAccount(accessToken);
  const board = await resolveBoard(accessToken);
  const now = new Date().toISOString();
  const record: PinterestAuthRecord = {
    accountId: account.id,
    username: account.username,
    accessToken,
    accessTokenExpiresAt: tokenExpiryIso(token.expires_in, 2592000),
    refreshToken,
    refreshTokenExpiresAt: tokenExpiryIso(token.refresh_token_expires_in, 5184000),
    scope: String(token.scope || PINTEREST_SCOPES),
    boardId: board.id,
    boardName: board.name,
    connectedBy: adminUid,
    connectedAt: now,
    updatedAt: now,
  };
  await authRef().set(record, { merge: true });
  await stateRef.delete().catch(() => undefined);
  return record;
}

async function readAuth(): Promise<PinterestAuthRecord> {
  const snapshot = await authRef().get();
  if (!snapshot.exists) throw new Error("Pinterest is not connected");
  return snapshot.data() as PinterestAuthRecord;
}

async function getValidPinterestAuth(): Promise<PinterestAuthRecord> {
  getPinterestConfig();
  const current = await readAuth();
  if (!current.refreshToken) throw new Error("Pinterest is not connected");
  const expiresAt = Date.parse(current.accessTokenExpiresAt || "") || 0;
  if (expiresAt - 60_000 > Date.now() && current.accessToken) {
    return current;
  }

  const token = await tokenRequest(
    {
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    },
    "Failed to refresh the Pinterest access token",
  );
  const next: Partial<PinterestAuthRecord> = {
    accessToken: String(token.access_token),
    accessTokenExpiresAt: tokenExpiryIso(token.expires_in, 2592000),
    refreshToken: String(token.refresh_token || current.refreshToken),
    refreshTokenExpiresAt: tokenExpiryIso(token.refresh_token_expires_in, 5184000),
    scope: String(token.scope || current.scope || ""),
    updatedAt: new Date().toISOString(),
  };
  await authRef().set(next, { merge: true });
  return { ...current, ...next } as PinterestAuthRecord;
}

async function registerMedia(accessToken: string) {
  const payload = await pinterestFetch<{
    media_id?: string;
    upload_url?: string;
    upload_parameters?: Record<string, string>;
  }>("/media", accessToken, {
    method: "POST",
    body: { media_type: "video" },
  });
  const mediaId = String(payload.media_id || "");
  const uploadUrl = String(payload.upload_url || "");
  if (!mediaId || !uploadUrl || !payload.upload_parameters) {
    throw new Error("Pinterest did not return a video upload session");
  }
  return { mediaId, uploadUrl, uploadParameters: payload.upload_parameters };
}

async function uploadVideoToPinterest(
  uploadUrl: string,
  uploadParameters: Record<string, string>,
  bytes: Uint8Array,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(uploadParameters)) {
    if (value) form.append(key, value);
  }
  form.append("file", new Blob([Buffer.from(bytes)], { type: "video/mp4" }), "video.mp4");
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  if (!response.ok && response.status !== 204) {
    const text = await response.text().catch(() => "");
    throw new Error(`Pinterest video upload failed (${response.status}): ${text.slice(0, 300)}`);
  }
}

async function waitForMedia(accessToken: string, mediaId: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2_000 : 3_000));
    const payload = await pinterestFetch<{ media_id?: string; status?: string }>(`/media/${mediaId}`, accessToken);
    const status = String(payload.status || "").toLowerCase();
    if (status === "succeeded") return;
    if (status === "failed") throw new Error("Pinterest failed to process the video");
  }
  throw new Error("Pinterest is still processing the video. Wait a minute and retry.");
}

function coverUrlFor(thumbnailUrl: string) {
  return String(thumbnailUrl || "").trim() || pinterestCoverFallbackUrl();
}

async function coverImageSource(thumbnailUrl: string) {
  const url = coverUrlFor(thumbnailUrl);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return { cover_image_url: url };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength < 32 || bytes.byteLength > 8 * 1024 * 1024) return { cover_image_url: url };
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "image/jpeg" && contentType !== "image/jpg" && contentType !== "image/png") {
      return { cover_image_url: url };
    }
    return {
      cover_image_content_type: contentType === "image/png" ? "image/png" : "image/jpeg",
      cover_image_data: bytes.toString("base64"),
    };
  } catch {
    return { cover_image_url: url };
  }
}

export async function publishLibraryVideoToPinterest(libraryId: string, adminUid: string) {
  const video = await loadLibraryVideo(libraryId, PINTEREST_DESCRIPTION_LIMIT);
  const auth = await getValidPinterestAuth();
  const board = await resolveBoard(auth.accessToken, { boardId: auth.boardId, boardName: auth.boardName });
  if (board.id !== auth.boardId || board.name !== auth.boardName) {
    await authRef().set({ boardId: board.id, boardName: board.name, updatedAt: new Date().toISOString() }, { merge: true });
  }

  const jobRef = adminDb().collection(video.collection).doc(video.jobId);
  const startedAt = new Date().toISOString();

  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    const data = (snapshot.data() || {}) as {
      pinterestStatus?: string;
      pinterestPublishedAt?: string;
      pinterestPublishStartedAt?: string;
    };
    if (data.pinterestPublishedAt || data.pinterestStatus === "published") {
      throw new Error("This video is already published to Pinterest");
    }
    if (data.pinterestStatus === "publishing") {
      const lockedAt = Date.parse(data.pinterestPublishStartedAt || "") || 0;
      if (Date.now() - lockedAt < PINTEREST_PUBLISH_LOCK_MS) {
        throw new Error("A Pinterest publish is already running for this video");
      }
    }
    transaction.set(
      jobRef,
      {
        pinterestStatus: "publishing",
        pinterestPublishStartedAt: startedAt,
        pinterestPublishedBy: adminUid,
        pinterestError: "",
      },
      { merge: true },
    );
  });

  try {
    const mediaResponse = await fetch(video.videoUrl, { cache: "no-store" });
    if (!mediaResponse.ok) throw new Error("Failed to download video for the Pinterest upload");
    const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
    if (bytes.byteLength < 1024) throw new Error("Video file is empty");

    const session = await registerMedia(auth.accessToken);
    await uploadVideoToPinterest(session.uploadUrl, session.uploadParameters, bytes);
    await waitForMedia(auth.accessToken, session.mediaId);

    const title = clip(video.title || video.topic || "Dream meaning", PINTEREST_TITLE_LIMIT);
    const created = await pinterestFetch<{ id?: string }>("/pins", auth.accessToken, {
      method: "POST",
      body: {
        board_id: board.id,
        title,
        description: clip(video.caption, PINTEREST_DESCRIPTION_LIMIT),
        alt_text: clip(video.title || video.topic, PINTEREST_ALT_TEXT_LIMIT),
        link: DREAMLY_SOCIAL_URL,
        media_source: {
          source_type: "video_id",
          media_id: session.mediaId,
          ...(await coverImageSource(video.thumbnailUrl)),
        },
      },
    });
    const pinId = String(created.id || "");
    if (!pinId) throw new Error("Pinterest did not return a pin id");

    await jobRef.set(
      {
        pinterestStatus: "published",
        pinterestPinId: pinId,
        pinterestMediaId: session.mediaId,
        pinterestBoardId: board.id,
        pinterestPublishedAt: new Date().toISOString(),
        pinterestPublishedBy: adminUid,
        pinterestError: "",
      },
      { merge: true },
    );

    return {
      target: "pinterest" as const,
      status: "PUBLISHED" as const,
      pinId,
      boardId: board.id,
      boardName: board.name,
      title,
      username: auth.username,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pinterest publish failed";
    await jobRef
      .set({ pinterestStatus: "failed", pinterestError: message.slice(0, 300) }, { merge: true })
      .catch(() => undefined);
    throw error;
  }
}
