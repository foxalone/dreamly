import {
  Agent,
  CredentialSession,
  RichText,
  type AppBskyEmbedVideo,
  type BlobRef,
} from "@atproto/api";

import { DREAMLY_SOCIAL_URL, stripDreamlySocialCta } from "./socialCta";

export const BLUESKY_SERVICE_URL = "https://bsky.social";
export const BLUESKY_VIDEO_SERVICE_URL = "https://video.bsky.app";
export const BLUESKY_VIDEO_SERVICE_DID = "did:web:video.bsky.app";
export const BLUESKY_POST_GRAPHEME_LIMIT = 300;
// Current app.bsky.embed.video Lexicon limit. Keep this isolated because the
// limit has changed before and older Node-20-compatible SDK types still say 100 MB.
export const BLUESKY_VIDEO_MAX_BYTES = 300_000_000;
export const BLUESKY_VIDEO_ASPECT_RATIO = { width: 720, height: 1280 } as const;
export const BLUESKY_PUBLISH_LOCK_MS = 15 * 60 * 1000;

const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export type BlueskyPublishPhase =
  | "authentication"
  | "readiness"
  | "download"
  | "upload"
  | "processing"
  | "publishing";

export class BlueskyPublishError extends Error {
  constructor(
    public readonly phase: BlueskyPublishPhase,
    message: string,
    public readonly retryable = false,
    public readonly status = 0,
  ) {
    super(message);
    this.name = "BlueskyPublishError";
  }
}

export type BlueskyConnectionStatus = {
  configured: boolean;
  connected: boolean;
  ready: boolean;
  handle: string;
  did: string;
  emailConfirmed: boolean;
  canUpload: boolean;
  remainingDailyVideos: number | null;
  remainingDailyBytes: number | null;
  message: string;
  error: string;
};

export type BlueskyUploadLimits = {
  canUpload: boolean;
  remainingDailyVideos?: number;
  remainingDailyBytes?: number;
  message?: string;
  error?: string;
};

export type BlueskyJobStatus = {
  jobId: string;
  did: string;
  state: string;
  progress?: number;
  blob?: BlobRef;
  error?: string;
  failureCode?: string;
  message?: string;
};

export type AuthenticatedBluesky = {
  agent: Agent;
  session: CredentialSession;
  did: string;
  handle: string;
  emailConfirmed: boolean;
};

export type BlueskyVideoBytes = {
  bytes: Uint8Array;
  size: number;
  contentType: "video/mp4";
};

export type BlueskyPublishedFields = {
  blueskyStatus: "published";
  blueskyError: "";
  blueskyUri: string;
  blueskyCid: string;
  blueskyRkey: string;
  blueskyDid: string;
  blueskyHandle: string;
  blueskyPostUrl: string;
  blueskyPublishedAt: string;
  blueskyPublishedBy: string;
};

type FetchLike = typeof fetch;

function env(name: "BLUESKY_HANDLE" | "BLUESKY_APP_PASSWORD") {
  return String(process.env[name] || "").trim();
}

export function blueskyConfig() {
  const handle = normalizeBlueskyHandle(env("BLUESKY_HANDLE"));
  const appPassword = env("BLUESKY_APP_PASSWORD");
  if (!handle) throw new BlueskyPublishError("authentication", "Missing BLUESKY_HANDLE");
  if (!appPassword) throw new BlueskyPublishError("authentication", "Missing BLUESKY_APP_PASSWORD");
  return { handle, appPassword };
}

export function normalizeBlueskyHandle(value: string) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function graphemes(value: string) {
  return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value)].map((part) => part.segment);
}

export function clipBlueskyText(value: string, maximum: number) {
  const parts = graphemes(String(value || "").trim());
  if (parts.length <= maximum) return parts.join("");
  if (maximum <= 1) return parts.slice(0, maximum).join("");
  return `${parts.slice(0, maximum - 1).join("").trimEnd()}…`;
}

function cleanDescription(value: string) {
  return stripDreamlySocialCta(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^get your dream meaning/i.test(line) && !/pexels\.com/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(value: string) {
  const match = value.match(/^.*?[.!?](?:\s|$)/u);
  return (match?.[0] || value).trim();
}

export function buildBlueskyCaption(input: { title?: string; topic?: string; description?: string }) {
  const sourceTitle = String(input.title || input.topic || "Dream meaning").trim();
  const hook = clipBlueskyText(sourceTitle, 105);
  const description = firstSentence(cleanDescription(String(input.description || "")));
  const linkBlock = `\n\n${DREAMLY_SOCIAL_URL}`;
  const hookBlock = hook || "Dream meaning";
  const remaining = BLUESKY_POST_GRAPHEME_LIMIT - graphemes(hookBlock + linkBlock).length;
  const teaser = remaining > 4 && description && description.toLowerCase() !== hookBlock.toLowerCase()
    ? clipBlueskyText(description, remaining - 2)
    : "";
  const text = teaser ? `${hookBlock}\n\n${teaser}${linkBlock}` : `${hookBlock}${linkBlock}`;
  return clipBlueskyText(text, BLUESKY_POST_GRAPHEME_LIMIT);
}

export function buildBlueskyRkey(libraryId: string) {
  const safe = String(libraryId || "")
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 480);
  if (!safe) throw new Error("Invalid video id");
  return `dreamly-${safe}`;
}

export function blueskyPostUrl(handle: string, uri: string) {
  const match = String(uri || "").match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([^/?#]+)$/);
  if (!match?.[1]) return "";
  return `https://bsky.app/profile/${normalizeBlueskyHandle(handle)}/post/${match[1]}`;
}

export function buildBlueskyPublishedPatch(input: {
  uri: string;
  cid: string;
  did: string;
  handle: string;
  adminUid: string;
  publishedAt: string;
}): BlueskyPublishedFields {
  const rkey = String(input.uri).split("/").pop() || "";
  return {
    blueskyStatus: "published",
    blueskyError: "",
    blueskyUri: input.uri,
    blueskyCid: input.cid,
    blueskyRkey: rkey,
    blueskyDid: input.did,
    blueskyHandle: normalizeBlueskyHandle(input.handle),
    blueskyPostUrl: blueskyPostUrl(input.handle, input.uri),
    blueskyPublishedAt: input.publishedAt,
    blueskyPublishedBy: input.adminUid,
  };
}

export function sanitizeBlueskyError(error: unknown, secrets: string[] = []) {
  let message = error instanceof Error ? error.message : String(error || "Bluesky request failed");
  message = message
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/((?:access|refresh|service)[-_ ]?(?:jwt|token))\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
  for (const secret of secrets.filter(Boolean)) message = message.split(secret).join("[redacted]");
  return message.slice(0, 500);
}

export function normalizeBlueskyJobStatus(payload: unknown): BlueskyJobStatus | null {
  if (!payload || typeof payload !== "object") return null;
  const outer = payload as Record<string, unknown>;
  const source = outer.jobStatus && typeof outer.jobStatus === "object"
    ? (outer.jobStatus as Record<string, unknown>)
    : outer;
  const blob = source.blob && typeof source.blob === "object" ? (source.blob as BlobRef) : undefined;
  const jobId = String(source.jobId || "").trim();
  if (!jobId && !blob) return null;
  return {
    jobId,
    did: String(source.did || ""),
    state: String(source.state || ""),
    ...(Number.isFinite(Number(source.progress)) ? { progress: Number(source.progress) } : {}),
    ...(blob ? { blob } : {}),
    ...(source.error ? { error: String(source.error) } : {}),
    ...(source.failureCode ? { failureCode: String(source.failureCode) } : {}),
    ...(source.message ? { message: String(source.message) } : {}),
  };
}

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const source = payload as Record<string, unknown>;
  return String(source.message || source.error || source.error_description || fallback);
}

function retryAfterMs(response: Response) {
  const raw = response.headers.get("retry-after");
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 300) };
  }
}

async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  phase: BlueskyPublishPhase,
  fetchImpl: FetchLike,
  attempts = 3,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { ...init, signal: init.signal || AbortSignal.timeout(90_000) });
      const payload = await jsonResponse(response);
      if (response.ok) return { payload, status: response.status };
      const retryable = RETRYABLE_HTTP_STATUS.has(response.status);
      const error = new BlueskyPublishError(
        phase,
        responseMessage(payload, `Bluesky ${phase} failed (${response.status})`),
        retryable,
        response.status,
      );
      // video.bsky.app may return a useful existing BlobRef together with 409.
      if (response.status === 409 && normalizeBlueskyJobStatus(payload)?.blob) {
        return { payload, status: response.status };
      }
      if (!retryable || attempt === attempts) throw error;
      lastError = error;
      await delay(Math.min(30_000, retryAfterMs(response) || 500 * 2 ** (attempt - 1)));
    } catch (error) {
      if (error instanceof BlueskyPublishError && !error.retryable) throw error;
      lastError = error;
      if (attempt === attempts) break;
      await delay(500 * 2 ** (attempt - 1));
    }
  }
  if (lastError instanceof BlueskyPublishError) throw lastError;
  throw new BlueskyPublishError(
    phase,
    lastError instanceof Error ? lastError.message : `Bluesky ${phase} failed`,
    true,
  );
}

export async function authenticateBluesky(options?: {
  handle?: string;
  appPassword?: string;
  fetchImpl?: FetchLike;
}): Promise<AuthenticatedBluesky> {
  const configured = options?.handle !== undefined || options?.appPassword !== undefined
    ? {
        handle: normalizeBlueskyHandle(options.handle || ""),
        appPassword: String(options.appPassword || "").trim(),
      }
    : blueskyConfig();
  if (!configured.handle) throw new BlueskyPublishError("authentication", "Missing BLUESKY_HANDLE");
  if (!configured.appPassword) throw new BlueskyPublishError("authentication", "Missing BLUESKY_APP_PASSWORD");

  try {
    const session = new CredentialSession(new URL(BLUESKY_SERVICE_URL), options?.fetchImpl || fetch);
    const login = await session.login({ identifier: configured.handle, password: configured.appPassword });
    const agent = new Agent(session);
    const did = String(login.data.did || agent.did || "");
    if (!did) throw new Error("Bluesky authentication did not return a DID");
    const [profile, sessionInfo] = await Promise.all([
      agent.getProfile({ actor: did }),
      agent.com.atproto.server.getSession(),
    ]);
    const authenticatedHandle = normalizeBlueskyHandle(profile.data.handle || login.data.handle || "");
    if (authenticatedHandle !== configured.handle) {
      throw new Error(`Unexpected Bluesky account: @${authenticatedHandle || "unknown"}`);
    }
    return {
      agent,
      session,
      did,
      handle: authenticatedHandle,
      emailConfirmed: sessionInfo.data.emailConfirmed === true,
    };
  } catch (error) {
    if (error instanceof BlueskyPublishError) throw error;
    throw new BlueskyPublishError(
      "authentication",
      sanitizeBlueskyError(error, [configured.appPassword]),
      false,
    );
  }
}

async function videoServiceAuth(auth: AuthenticatedBluesky, lxm: string, seconds = 120) {
  try {
    const result = await auth.agent.com.atproto.server.getServiceAuth({
      aud: BLUESKY_VIDEO_SERVICE_DID,
      lxm,
      exp: Math.floor(Date.now() / 1000) + seconds,
    });
    if (!result.data.token) throw new Error("Bluesky did not return service authentication");
    return result.data.token;
  } catch (error) {
    throw new BlueskyPublishError("readiness", sanitizeBlueskyError(error), false);
  }
}

export async function getBlueskyUploadLimits(
  auth: AuthenticatedBluesky,
  fetchImpl: FetchLike = fetch,
): Promise<BlueskyUploadLimits> {
  const token = await videoServiceAuth(auth, "app.bsky.video.getUploadLimits");
  const { payload } = await fetchJsonWithRetry(
    `${BLUESKY_VIDEO_SERVICE_URL}/xrpc/app.bsky.video.getUploadLimits`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    "readiness",
    fetchImpl,
  );
  const limits = payload as BlueskyUploadLimits;
  if (typeof limits.canUpload !== "boolean") {
    throw new BlueskyPublishError("readiness", "Bluesky returned invalid upload limits");
  }
  return limits;
}

export async function downloadBlueskyVideo(
  videoUrl: string,
  limits?: BlueskyUploadLimits,
  fetchImpl: FetchLike = fetch,
): Promise<BlueskyVideoBytes> {
  if (!String(videoUrl || "").trim()) throw new BlueskyPublishError("download", "MP4 URL missing");
  let response: Response;
  try {
    response = await fetchImpl(videoUrl, { cache: "no-store", signal: AbortSignal.timeout(120_000) });
  } catch (error) {
    throw new BlueskyPublishError(
      "download",
      `MP4 download failed: ${error instanceof Error ? error.message : "network error"}`,
      true,
    );
  }
  if (!response.ok) {
    throw new BlueskyPublishError("download", `MP4 download failed (${response.status})`, RETRYABLE_HTTP_STATUS.has(response.status), response.status);
  }
  const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType && contentType !== "video/mp4" && contentType !== "application/octet-stream") {
    throw new BlueskyPublishError("download", `Unsupported video MIME type: ${contentType}`);
  }
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > BLUESKY_VIDEO_MAX_BYTES) {
    throw new BlueskyPublishError("download", `Video exceeds Bluesky's ${BLUESKY_VIDEO_MAX_BYTES}-byte limit`);
  }
  if (limits?.remainingDailyBytes !== undefined && declaredSize > limits.remainingDailyBytes) {
    throw new BlueskyPublishError("download", "Bluesky account video byte limit reached");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) throw new BlueskyPublishError("download", "Video is empty");
  if (bytes.byteLength > BLUESKY_VIDEO_MAX_BYTES) {
    throw new BlueskyPublishError("download", `Video exceeds Bluesky's ${BLUESKY_VIDEO_MAX_BYTES}-byte limit`);
  }
  if (limits?.remainingDailyBytes !== undefined && bytes.byteLength > limits.remainingDailyBytes) {
    throw new BlueskyPublishError("download", "Bluesky account video byte limit reached");
  }
  if (bytes.byteLength < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") {
    throw new BlueskyPublishError("download", "Downloaded media is not a valid MP4 file");
  }
  return { bytes, size: bytes.byteLength, contentType: "video/mp4" };
}

export async function uploadBlueskyVideo(
  auth: AuthenticatedBluesky,
  video: BlueskyVideoBytes,
  name: string,
  fetchImpl: FetchLike = fetch,
) {
  let token: string;
  try {
    const pdsDid = `did:web:${auth.session.dispatchUrl.host}`;
    const result = await auth.agent.com.atproto.server.getServiceAuth({
      aud: pdsDid,
      lxm: "com.atproto.repo.uploadBlob",
      exp: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    token = result.data.token;
    if (!token) throw new Error("Bluesky did not return service authentication");
  } catch (error) {
    throw new BlueskyPublishError("upload", `Bluesky service authentication failed: ${sanitizeBlueskyError(error)}`);
  }

  const url = new URL(`${BLUESKY_VIDEO_SERVICE_URL}/xrpc/app.bsky.video.uploadVideo`);
  url.searchParams.set("did", auth.did);
  url.searchParams.set("name", String(name || "dreamly-video.mp4").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120));
  const { payload } = await fetchJsonWithRetry(
    url.toString(),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "video/mp4",
        "Content-Length": String(video.size),
      },
      body: video.bytes.buffer.slice(
        video.bytes.byteOffset,
        video.bytes.byteOffset + video.bytes.byteLength,
      ) as ArrayBuffer,
    },
    "upload",
    fetchImpl,
  );
  const job = normalizeBlueskyJobStatus(payload);
  if (!job) throw new BlueskyPublishError("upload", "Bluesky returned an invalid video upload response");
  return job;
}

export async function waitForBlueskyVideoProcessing(
  jobId: string,
  options?: {
    initial?: BlueskyJobStatus | null;
    fetchImpl?: FetchLike;
    pollIntervalMs?: number;
    timeoutMs?: number;
    deadlineMs?: number;
  },
): Promise<BlobRef> {
  if (options?.initial?.blob) return options.initial.blob;
  if (!jobId) throw new BlueskyPublishError("processing", "Bluesky video job id is missing");
  const fetchImpl = options?.fetchImpl || fetch;
  const interval = Math.max(100, options?.pollIntervalMs ?? 3_000);
  const timeoutAt = Date.now() + Math.max(interval, options?.timeoutMs ?? 210_000);
  const stopAt = Math.min(timeoutAt, options?.deadlineMs ?? Number.POSITIVE_INFINITY);

  for (;;) {
    if (Date.now() + interval >= stopAt) {
      throw new BlueskyPublishError("processing", "Bluesky video processing timed out", true);
    }
    const url = new URL(`${BLUESKY_VIDEO_SERVICE_URL}/xrpc/app.bsky.video.getJobStatus`);
    url.searchParams.set("jobId", jobId);
    const { payload } = await fetchJsonWithRetry(
      url.toString(),
      { cache: "no-store", signal: AbortSignal.timeout(30_000) },
      "processing",
      fetchImpl,
      2,
    );
    const status = normalizeBlueskyJobStatus(payload);
    if (!status) throw new BlueskyPublishError("processing", "Bluesky returned an invalid processing response");
    // The service documents already_exists/failed responses that still contain
    // the reusable processed BlobRef, so blob presence wins over state.
    if (status.blob) return status.blob;
    if (status.state === "JOB_STATE_FAILED") {
      const detail = status.message || status.error || status.failureCode || "unknown processing error";
      throw new BlueskyPublishError("processing", `Bluesky video processing failed: ${detail}`);
    }
    await delay(interval);
  }
}

export async function createBlueskyVideoPost(input: {
  auth: AuthenticatedBluesky;
  text: string;
  blob: BlobRef;
  alt: string;
  rkey: string;
  createdAt?: string;
}) {
  const richText = new RichText({ text: input.text });
  richText.detectFacetsWithoutResolution();
  if (richText.graphemeLength > BLUESKY_POST_GRAPHEME_LIMIT) {
    throw new BlueskyPublishError("publishing", "Bluesky post text is too long");
  }
  const embed = {
    $type: "app.bsky.embed.video",
    video: input.blob,
    alt: clipBlueskyText(input.alt, 1_000),
    aspectRatio: BLUESKY_VIDEO_ASPECT_RATIO,
  } satisfies AppBskyEmbedVideo.Main;
  try {
    return await input.auth.agent.app.bsky.feed.post.create(
      { repo: input.auth.did, rkey: input.rkey },
      {
        text: richText.text,
        facets: richText.facets,
        langs: ["en"],
        embed,
        createdAt: input.createdAt || new Date().toISOString(),
      },
    );
  } catch (error) {
    throw new BlueskyPublishError("publishing", `Bluesky post creation failed: ${sanitizeBlueskyError(error)}`);
  }
}
