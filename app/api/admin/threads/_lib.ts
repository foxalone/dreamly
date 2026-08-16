import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  THREADS_AUTHORIZE_URL,
  THREADS_AUTH_DOCUMENT,
  THREADS_GRAPH_URL,
  THREADS_LONG_LIVED_TOKEN_URL,
  THREADS_OAUTH_STATES_COLLECTION,
  THREADS_PRIVACY_REQUESTS_COLLECTION,
  THREADS_SCOPES,
  THREADS_TOKEN_URL,
  threadsAppId,
  threadsAppSecret,
  threadsConfigured,
  threadsRedirectUri,
  type ThreadsAuthRecord,
  type ThreadsConnectionStatus,
  type ThreadsPrivacyRequestKind,
  type ThreadsPrivacyRequestRecord,
} from "@/lib/adminThreads";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

type TokenPayload = {
  access_token?: string;
  user_id?: string | number;
  token_type?: string;
  expires_in?: number;
  error?: string | { message?: string; type?: string };
  error_description?: string;
  error_message?: string;
};

function authRef() {
  return adminDb().doc(THREADS_AUTH_DOCUMENT);
}

function threadsError(payload: unknown, fallback = "Threads request failed") {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as TokenPayload;
  if (typeof record.error === "string") {
    return record.error_description || record.error_message || record.error;
  }
  if (record.error && typeof record.error === "object") {
    return record.error.message || record.error.type || fallback;
  }
  return record.error_message || fallback;
}

export function getThreadsConfig() {
  if (!threadsConfigured()) {
    throw new Error("Threads is not configured. Set THREADS_APP_ID and THREADS_APP_SECRET.");
  }
  return {
    appId: threadsAppId(),
    appSecret: threadsAppSecret(),
    redirectUri: threadsRedirectUri(),
  };
}

export async function getThreadsStatus(): Promise<ThreadsConnectionStatus> {
  const configured = threadsConfigured();
  const snapshot = await authRef().get();
  if (!snapshot.exists) {
    return {
      connected: false,
      configured,
      userId: "",
      username: "",
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
    };
  }
  const data = snapshot.data() as ThreadsAuthRecord;
  return {
    connected: Boolean(data.accessToken && data.userId),
    configured,
    userId: data.userId || "",
    username: data.username || "",
    scope: data.scope || "",
    accessTokenExpiresAt: data.accessTokenExpiresAt || null,
    connectedAt: data.connectedAt || null,
  };
}

export async function resetThreadsConnection() {
  const db = adminDb();
  await authRef().delete().catch(() => undefined);
  const states = await db.collection(THREADS_OAUTH_STATES_COLLECTION).listDocuments();
  await Promise.all(states.map((doc) => doc.delete().catch(() => undefined)));
  return { ok: true as const };
}

export async function createThreadsOAuthStart(adminUid: string) {
  const { appId, redirectUri } = getThreadsConfig();
  const state = randomBytes(24).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await adminDb().collection(THREADS_OAUTH_STATES_COLLECTION).doc(state).set({
    adminUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  const url = new URL(THREADS_AUTHORIZE_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", THREADS_SCOPES);
  return { authorizeUrl: url.toString(), state };
}

async function exchangeCode(code: string) {
  const { appId, appSecret, redirectUri } = getThreadsConfig();
  const response = await fetch(THREADS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(threadsError(payload, "Failed to exchange Threads OAuth code"));
  }
  return payload;
}

async function exchangeLongLived(shortLivedToken: string) {
  const { appSecret } = getThreadsConfig();
  const url = new URL(THREADS_LONG_LIVED_TOKEN_URL);
  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(threadsError(payload, "Failed to create long-lived Threads token"));
  }
  return payload;
}

async function fetchProfile(accessToken: string) {
  const url = new URL(`${THREADS_GRAPH_URL}/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    username?: string;
    error?: { message?: string };
  };
  if (!response.ok || payload.error) {
    throw new Error(threadsError(payload, "Failed to read the Threads profile"));
  }
  return { id: String(payload.id || ""), username: String(payload.username || "") };
}

export async function completeThreadsOAuthCallback(code: string, state: string) {
  const stateRef = adminDb().collection(THREADS_OAUTH_STATES_COLLECTION).doc(state);
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
  const accessToken = String(longLived.access_token);
  const profile = await fetchProfile(accessToken);
  const seconds = Number(longLived.expires_in || 60 * 24 * 60 * 60);
  const now = new Date().toISOString();
  const previous = (await authRef().get()).data() as ThreadsAuthRecord | undefined;
  const record: ThreadsAuthRecord = {
    userId: profile.id || String(shortLived.user_id || ""),
    username: profile.username,
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
    scope: THREADS_SCOPES,
    connectedBy: adminUid,
    connectedAt: previous?.connectedAt || now,
    updatedAt: now,
  };
  await authRef().set(record);
  await stateRef.delete().catch(() => undefined);
  return record;
}

function base64UrlDecode(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function parseSignedRequest(signedRequest: string) {
  const { appSecret } = getThreadsConfig();
  const [encodedSignature, encodedPayload] = String(signedRequest || "").split(".");
  if (!encodedSignature || !encodedPayload) throw new Error("Malformed signed_request");

  const expected = createHmac("sha256", appSecret).update(encodedPayload).digest();
  const provided = base64UrlDecode(encodedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid signed_request signature");
  }

  let data: { user_id?: string | number; algorithm?: string; issued_at?: number };
  try {
    data = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
  } catch {
    throw new Error("Malformed signed_request payload");
  }
  if (String(data.algorithm || "").toUpperCase() !== "HMAC-SHA256") {
    throw new Error("Unsupported signed_request algorithm");
  }
  return { userId: String(data.user_id ?? ""), issuedAt: Number(data.issued_at || 0) };
}

export async function readSignedRequest(request: Request) {
  const fromQuery = new URL(request.url).searchParams.get("signed_request");
  if (fromQuery) return fromQuery;
  const raw = await request.text().catch(() => "");
  if (!raw) return "";
  if ((request.headers.get("content-type") || "").includes("application/json")) {
    try {
      const parsed = JSON.parse(raw) as { signed_request?: string };
      return String(parsed.signed_request || "");
    } catch {
      return "";
    }
  }
  return new URLSearchParams(raw).get("signed_request") || "";
}

export async function clearThreadsAuthForUser(threadsUserId: string) {
  const snapshot = await authRef().get();
  if (!snapshot.exists) return false;
  const data = snapshot.data() as ThreadsAuthRecord;
  if (threadsUserId && data.userId && data.userId !== threadsUserId) return false;
  await authRef().delete().catch(() => undefined);
  return true;
}

export async function recordThreadsPrivacyRequest(
  kind: ThreadsPrivacyRequestKind,
  threadsUserId: string,
  tokenRemoved: boolean,
) {
  const confirmationCode = randomBytes(12).toString("hex");
  const now = new Date().toISOString();
  const record: ThreadsPrivacyRequestRecord = {
    kind,
    threadsUserId,
    status: "completed",
    receivedAt: now,
    completedAt: now,
    tokenRemoved,
  };
  await adminDb().collection(THREADS_PRIVACY_REQUESTS_COLLECTION).doc(confirmationCode).set(record);
  return { confirmationCode, record };
}

export async function readThreadsPrivacyRequest(confirmationCode: string) {
  const snapshot = await adminDb()
    .collection(THREADS_PRIVACY_REQUESTS_COLLECTION)
    .doc(confirmationCode)
    .get();
  return snapshot.exists ? (snapshot.data() as ThreadsPrivacyRequestRecord) : null;
}
