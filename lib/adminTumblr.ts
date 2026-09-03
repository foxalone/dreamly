import { DREAMLY_SOCIAL_URL } from "./socialCta";

// Official Tumblr API v2 (OAuth 2.0 + Neue Post Format). No third-party
// publisher sits between Dreamly and Tumblr.
export const TUMBLR_AUTH_DOCUMENT = "adminSystem/tumblrAuth";
export const TUMBLR_OAUTH_STATES_COLLECTION = "adminTumblrOAuthStates";

export const TUMBLR_AUTHORIZE_URL = "https://www.tumblr.com/oauth2/authorize";
export const TUMBLR_TOKEN_URL = "https://api.tumblr.com/v2/oauth2/token";
export const TUMBLR_API_URL = "https://api.tumblr.com/v2";

// `write` publishes, `offline_access` is what makes Tumblr hand back a refresh
// token — without it this unattended integration would need a manual OAuth
// round trip every few hours.
export const TUMBLR_SCOPES = ["basic", "write", "offline_access"] as const;
export const TUMBLR_SCOPE_STRING = TUMBLR_SCOPES.join(" ");

// Tumblr expects one stable User-Agent per integration. Never derive it from
// a version that changes per deploy.
export const TUMBLR_USER_AGENT = "Dreamly.art Social Publisher/1.0";

// The multipart field name for the MP4. It MUST match the NPF media
// `identifier`, otherwise Tumblr rejects the post with a media error.
export const TUMBLR_MEDIA_IDENTIFIER = "dreamly-video";
export const TUMBLR_MEDIA_FILENAME = "dreamly-video.mp4";
export const TUMBLR_MEDIA_CONTENT_TYPE = "video/mp4";

// Shared caption budget: the same generated Dreamly caption every other
// network gets, clipped to a length Tumblr renders comfortably.
export const TUMBLR_CAPTION_LIMIT = 2000;
export const TUMBLR_MAX_TAGS = 10;
export const TUMBLR_TAG_LIMIT = 139;

// Current Tumblr limits for uploaded video (2026): 500 MB / 10 minutes per
// video, 20 videos and 60 minutes of video per user per day.
export const TUMBLR_MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const TUMBLR_MAX_VIDEO_SECONDS = 600;
export const TUMBLR_DAILY_VIDEO_LIMIT = 20;
export const TUMBLR_DAILY_VIDEO_SECONDS = 60 * 60;

export const TUMBLR_PUBLISH_LOCK_MS = 15 * 60 * 1000;
// Refresh a little early instead of waiting for a 401 mid-upload.
export const TUMBLR_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
export const TUMBLR_ACCESS_TOKEN_FALLBACK_SECONDS = 3600;

export const TUMBLR_FALLBACK_TAGS = [
  "dreams",
  "dream",
  "dream interpretation",
  "dream meaning",
  "AI",
  "Dreamly",
];

export type TumblrBlogSummary = {
  name: string;
  identifier: string;
  title: string;
  url: string;
  primary: boolean;
  admin: boolean;
};

export type TumblrAuthRecord = {
  userName: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  scope: string;
  blogIdentifier: string;
  blogName: string;
  blogTitle: string;
  blogUrl: string;
  blogs: TumblrBlogSummary[];
  blogAmbiguous: boolean;
  connectedBy: string;
  connectedAt: string;
  updatedAt: string;
};

// Never carries tokens — this shape is what the admin dashboard receives.
export type TumblrConnectionStatus = {
  connected: boolean;
  configured: boolean;
  userName: string;
  blogIdentifier: string;
  blogName: string;
  blogTitle: string;
  blogUrl: string;
  blogs: TumblrBlogSummary[];
  blogAmbiguous: boolean;
  scope: string;
  accessTokenExpiresAt: string | null;
  tokenHealthy: boolean;
  connectedAt: string | null;
};

export type TumblrPublishPhase =
  | "configuration"
  | "authentication"
  | "download"
  | "upload"
  | "publishing"
  | "limits";

export class TumblrPublishError extends Error {
  constructor(
    public readonly phase: TumblrPublishPhase,
    message: string,
    public readonly retryable = false,
    public readonly status = 0,
  ) {
    super(message);
    this.name = "TumblrPublishError";
  }
}

function env(name: string) {
  return String(process.env[name] || "").trim();
}

export function tumblrClientId() {
  return env("TUMBLR_CLIENT_ID");
}

export function tumblrClientSecret() {
  return env("TUMBLR_CLIENT_SECRET");
}

// Production callback is fixed; the env var only exists so preview/local
// deployments can point Tumblr somewhere else, exactly like Pinterest/YouTube.
export function tumblrRedirectUri() {
  return env("TUMBLR_REDIRECT_URI") || "https://dreamly.art/api/admin/tumblr/callback";
}

// Only needed when the account owns several writable blogs and automatic
// selection cannot decide on its own.
export function tumblrBlogIdentifierOverride() {
  return env("TUMBLR_BLOG_IDENTIFIER");
}

export function tumblrConfigured() {
  return Boolean(tumblrClientId() && tumblrClientSecret());
}

export function buildTumblrAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}) {
  const url = new URL(TUMBLR_AUTHORIZE_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.scope || TUMBLR_SCOPE_STRING);
  url.searchParams.set("state", input.state);
  url.searchParams.set("redirect_uri", input.redirectUri);
  return url.toString();
}

export function tumblrTokenExpiryIso(expiresIn: unknown, nowMs = Date.now()) {
  const seconds = Number(expiresIn);
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : TUMBLR_ACCESS_TOKEN_FALLBACK_SECONDS;
  return new Date(nowMs + safe * 1000).toISOString();
}

export function isTumblrAccessTokenStale(expiresAt: string | undefined, nowMs = Date.now()) {
  const parsed = Date.parse(String(expiresAt || ""));
  if (!Number.isFinite(parsed)) return true;
  return parsed - TUMBLR_TOKEN_REFRESH_SKEW_MS <= nowMs;
}

function hostFromUrl(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// The stable blog identifier Tumblr documents for /v2/blog/{blog-identifier}:
// the standard `{name}.tumblr.com` hostname. Custom domains keep working
// because the blog name is what Tumblr resolves.
export function normalizeTumblrBlogIdentifier(blog: { name?: string; url?: string }) {
  const name = String(blog.name || "").trim().toLowerCase();
  if (name) return name.includes(".") ? name : `${name}.tumblr.com`;
  return hostFromUrl(String(blog.url || ""));
}

export function normalizeTumblrBlogs(raw: unknown): TumblrBlogSummary[] {
  const source = Array.isArray(raw) ? raw : [];
  const blogs: TumblrBlogSummary[] = [];
  for (const entry of source) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const identifier = normalizeTumblrBlogIdentifier({
      name: String(record.name || ""),
      url: String(record.url || ""),
    });
    if (!identifier) continue;
    blogs.push({
      name: String(record.name || "").trim(),
      identifier,
      title: String(record.title || "").trim(),
      url: String(record.url || `https://${identifier}/`).trim(),
      // `admin` is absent on some payloads; a blog listed under /user/info is
      // writable by the authenticated user unless Tumblr says otherwise.
      primary: record.primary === true,
      admin: record.admin === undefined ? true : record.admin === true,
    });
  }
  return blogs;
}

export type TumblrBlogSelection = {
  blog: TumblrBlogSummary | null;
  ambiguous: boolean;
  candidates: TumblrBlogSummary[];
  reason: "override" | "primary" | "single" | "none" | "ambiguous";
};

// 1) explicit override, 2) the primary blog, 3) the only writable blog.
// Anything else is reported as ambiguous so the admin status can surface the
// list instead of guessing.
export function selectTumblrBlog(blogs: TumblrBlogSummary[], override = ""): TumblrBlogSelection {
  const writable = blogs.filter((blog) => blog.admin);
  const candidates = writable.length ? writable : blogs;
  const wanted = String(override || "").trim().toLowerCase();
  if (wanted) {
    const match =
      candidates.find((blog) => blog.identifier === wanted) ||
      candidates.find((blog) => blog.name.toLowerCase() === wanted) ||
      candidates.find((blog) => normalizeTumblrBlogIdentifier({ name: wanted }) === blog.identifier);
    if (match) return { blog: match, ambiguous: false, candidates, reason: "override" };
  }
  const primary = candidates.find((blog) => blog.primary);
  if (primary) return { blog: primary, ambiguous: candidates.length > 1, candidates, reason: "primary" };
  if (candidates.length === 1) return { blog: candidates[0], ambiguous: false, candidates, reason: "single" };
  if (!candidates.length) return { blog: null, ambiguous: false, candidates, reason: "none" };
  return { blog: null, ambiguous: true, candidates, reason: "ambiguous" };
}

function cleanTag(value: unknown) {
  return String(value || "")
    .replace(/^#/, "")
    .replace(/[,\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TUMBLR_TAG_LIMIT);
}

// Prefers the tags Dreamly's own generator already wrote into
// youtubeMetadata (hashtags first, then the longer tag list), and only falls
// back to the generic dream tags when a job has no metadata at all.
export function buildTumblrTags(input: {
  hashtags?: unknown;
  tags?: unknown;
  topic?: string;
  max?: number;
}) {
  const max = Math.max(1, input.max ?? TUMBLR_MAX_TAGS);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: unknown) => {
    const tag = cleanTag(value);
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key) || out.length >= max) return;
    seen.add(key);
    out.push(tag);
  };

  const hashtags = Array.isArray(input.hashtags) ? input.hashtags : [];
  const tags = Array.isArray(input.tags) ? input.tags : [];
  for (const tag of hashtags) push(tag);
  for (const tag of tags) push(tag);
  if (!out.length) {
    push(input.topic);
    for (const tag of TUMBLR_FALLBACK_TAGS) push(tag);
  }
  // Always keep the brand tag reachable without pushing the list over the cap.
  if (!seen.has("dreamly") && out.length < max) push("Dreamly");
  return out;
}

export type TumblrNpfMedia = {
  type: string;
  identifier: string;
  width?: number;
  height?: number;
};

export type TumblrNpfBlock =
  | { type: "video"; media: TumblrNpfMedia }
  | { type: "text"; text: string };

export type TumblrNpfPost = {
  content: TumblrNpfBlock[];
  tags: string;
  state: "published";
  source_url?: string;
};

// The NPF body posted as the `json` multipart part. `identifier` is what binds
// the video block to the multipart file field of the same name.
export function buildTumblrNpfPost(input: {
  text: string;
  tags: string[];
  width?: number | null;
  height?: number | null;
  identifier?: string;
  sourceUrl?: string;
}): TumblrNpfPost {
  const identifier = input.identifier || TUMBLR_MEDIA_IDENTIFIER;
  const width = Number(input.width);
  const height = Number(input.height);
  const media: TumblrNpfMedia = {
    type: TUMBLR_MEDIA_CONTENT_TYPE,
    identifier,
    // Only send dimensions we actually measured — never invented ones.
    ...(Number.isFinite(width) && width > 0 ? { width: Math.round(width) } : {}),
    ...(Number.isFinite(height) && height > 0 ? { height: Math.round(height) } : {}),
  };
  const text = String(input.text || "").trim();
  const content: TumblrNpfBlock[] = [{ type: "video", media }];
  if (text) content.push({ type: "text", text });
  return {
    content,
    tags: input.tags.join(","),
    state: "published",
    source_url: input.sourceUrl || DREAMLY_SOCIAL_URL,
  };
}

/**
 * The multipart body Tumblr's NPF endpoint expects: a `json` part carrying the
 * post, plus the MP4 under a field name identical to the media `identifier`
 * inside that JSON. Built here (and not inline at the call site) so the
 * identifier/field-name contract is covered by a unit test.
 */
export function buildTumblrMultipartBody(
  post: TumblrNpfPost,
  bytes: Uint8Array,
  identifier = TUMBLR_MEDIA_IDENTIFIER,
) {
  const form = new FormData();
  form.append("json", new Blob([JSON.stringify(post)], { type: "application/json" }));
  form.append(
    identifier,
    // Uint8Array is a valid BlobPart at runtime; the DOM lib types predate it.
    new Blob([bytes as unknown as BlobPart], { type: TUMBLR_MEDIA_CONTENT_TYPE }),
    TUMBLR_MEDIA_FILENAME,
  );
  return form;
}

// Tumblr's create response carries no permalink, so this is the documented
// fallback used only when re-reading the post does not return `post_url`.
export function tumblrPostUrl(blogUrl: string, blogIdentifier: string, postId: string) {
  const id = String(postId || "").trim();
  if (!id) return "";
  const base = String(blogUrl || "").trim().replace(/\/+$/, "");
  if (base) return `${base}/post/${id}`;
  const identifier = String(blogIdentifier || "").trim();
  return identifier ? `https://${identifier}/post/${id}` : "";
}

function readUint32(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length) return 0;
  return (
    ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]
  );
}

function boxType(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function* walkBoxes(bytes: Uint8Array, start: number, end: number) {
  let cursor = start;
  while (cursor + 8 <= end) {
    let size = readUint32(bytes, cursor);
    let headerSize = 8;
    if (size === 1) {
      // 64-bit size: the high word is always 0 for our files.
      const high = readUint32(bytes, cursor + 8);
      const low = readUint32(bytes, cursor + 12);
      size = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      size = end - cursor;
    }
    if (size < headerSize || cursor + size > end) return;
    yield { type: boxType(bytes, cursor + 4), start: cursor + headerSize, end: cursor + size };
    cursor += size;
  }
}

function readTrackHeaderSize(bytes: Uint8Array, start: number, end: number) {
  if (start + 4 > end) return null;
  const version = bytes[start];
  let cursor = start + 4;
  cursor += version === 1 ? 32 : 20;
  // reserved(8) + layer(2) + alternate_group(2) + volume(2) + reserved(2)
  cursor += 16;
  const matrixStart = cursor;
  cursor += 36;
  if (cursor + 8 > end) return null;
  const width = readUint32(bytes, cursor) / 65536;
  const height = readUint32(bytes, cursor + 4) / 65536;
  if (!(width > 0) || !(height > 0)) return null;
  // A 90°/270° display matrix stores the rotation in b/c, so the presented
  // frame is the transposed one.
  const a = readUint32(bytes, matrixStart);
  const b = readUint32(bytes, matrixStart + 4);
  const c = readUint32(bytes, matrixStart + 12);
  const d = readUint32(bytes, matrixStart + 16);
  const rotated = a === 0 && d === 0 && b !== 0 && c !== 0;
  return rotated
    ? { width: Math.round(height), height: Math.round(width) }
    : { width: Math.round(width), height: Math.round(height) };
}

/**
 * Reads the real display dimensions out of the MP4 the pipeline already
 * produced (moov → trak → tkhd). Dreamly renders 9:16 with several different
 * renderers, so there is no single constant to trust — the file itself is the
 * source of truth. Returns null when the box layout is not understood; the
 * caller then simply omits width/height instead of inventing them.
 */
export function readMp4Dimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!bytes || bytes.length < 32) return null;
  for (const box of walkBoxes(bytes, 0, bytes.length)) {
    if (box.type !== "moov") continue;
    for (const child of walkBoxes(bytes, box.start, box.end)) {
      if (child.type !== "trak") continue;
      for (const grandchild of walkBoxes(bytes, child.start, child.end)) {
        if (grandchild.type !== "tkhd") continue;
        const size = readTrackHeaderSize(bytes, grandchild.start, grandchild.end);
        if (size) return size;
      }
    }
  }
  return null;
}

export function isMp4(bytes: Uint8Array) {
  return bytes.length > 12 && boxType(bytes, 4) === "ftyp";
}

const TRANSCODING_PATTERN = /transcod|still (being )?process|processing your|try again (in a|later)/i;
const DAILY_LIMIT_PATTERN = /daily|limit (reached|exceeded)|too many (videos|uploads)|quota/i;
const MEDIA_PATTERN = /media|video|file (is )?too (large|big)|unsupported|duration/i;

export type TumblrErrorClassification = {
  message: string;
  retryable: boolean;
  phase: TumblrPublishPhase;
};

/**
 * Splits Tumblr failures into "come back in five minutes" (handed to the
 * existing schedule retry/backoff) and "this will never work" (recorded as a
 * platform failure so nothing spins). Daily limits are deliberately permanent:
 * the cron's twelve attempts span an hour, which never clears a 24h quota.
 */
export function classifyTumblrError(status: number, message: string): TumblrErrorClassification {
  const text = String(message || "").trim() || `Tumblr error ${status}`;
  if (status === 401) return { message: text, retryable: false, phase: "authentication" };
  if (status === 429) return { message: text, retryable: true, phase: "limits" };
  if (status >= 500 || status === 408) return { message: text, retryable: true, phase: "publishing" };
  if (TRANSCODING_PATTERN.test(text)) return { message: text, retryable: true, phase: "publishing" };
  if (DAILY_LIMIT_PATTERN.test(text)) return { message: text, retryable: false, phase: "limits" };
  if (status === 403) return { message: text, retryable: false, phase: "authentication" };
  if (MEDIA_PATTERN.test(text)) return { message: text, retryable: false, phase: "upload" };
  return { message: text, retryable: false, phase: "publishing" };
}

// Tumblr answers with {meta:{status,msg}, errors:[{title,detail,code}], response:{...}}
export function tumblrErrorMessage(payload: unknown, status: number, fallback = "Tumblr request failed") {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as {
    meta?: { msg?: string; status?: number };
    errors?: Array<{ title?: string; detail?: string; code?: number }>;
    error?: string;
    error_description?: string;
    response?: { errors?: Array<{ title?: string; detail?: string }> };
  };
  const listed = [...(record.errors || []), ...(record.response?.errors || [])]
    .map((entry) => [entry?.title, entry?.detail].filter(Boolean).join(": "))
    .filter(Boolean);
  const message =
    listed.join("; ") ||
    record.error_description ||
    record.error ||
    record.meta?.msg ||
    fallback;
  return status ? `${message} (${status})` : message;
}

// Belt and braces: nothing that looks like a credential ever reaches Firestore
// error fields, admin JSON or the logs.
export function sanitizeTumblrError(error: unknown, secrets: string[] = []) {
  let message = error instanceof Error ? error.message : String(error || "Tumblr error");
  const values = [...secrets, tumblrClientSecret(), tumblrClientId()].filter((value) => value && value.length > 5);
  for (const secret of values) {
    message = message.split(secret).join("***");
  }
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/((?:access|refresh|id)_token"?\s*[:=]\s*"?)[A-Za-z0-9._~+/=-]+/gi, "$1***")
    .slice(0, 300);
}
