import { createSign } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import {
  GSC_DEFAULT_LAG_DAYS,
  GSC_LATEST_DATE_PROBE_DAYS,
  GSC_RANGE_KEYS,
  GSC_ROW_LIMIT,
  GSC_SCOPE,
  GSC_SITES_URL,
  GSC_SNAPSHOTS_COLLECTION,
  GSC_SYNC_DOCUMENT,
  GSC_TOKEN_URL,
  addUtcDays,
  gscDateWindow,
  gscQueryDocId,
  gscRangeWindow,
  gscSearchAnalyticsUrl,
  gscSiteUrlOverride,
  latestDateFromGscDateRows,
  normalizeGscQueryRow,
  parseGscRange,
  pickGscSite,
  toUtcDateKey,
  type GscQueryRow,
  type GscRangeKey,
} from "@/lib/adminGsc";

import { adminDb, loadServiceAccount, tryLoadServiceAccount } from "./firebaseAdmin";

type GscSiteEntry = {
  siteUrl?: string;
};

export type GscRangeMeta = {
  startDate: string;
  endDate: string;
  rowCount: number;
};

export type GscSyncResult = {
  ok: true;
  siteUrl: string;
  latestDataDate: string;
  startDate: string;
  endDate: string;
  rowCount: number;
  ranges: Record<GscRangeKey, GscRangeMeta>;
  runId: string;
};

export type GscStatus = {
  configured: boolean;
  connected: boolean;
  serviceAccountEmail: string;
  projectId: string;
  siteUrl: string | null;
  availableSites: string[];
  latestDataDate: string | null;
  lastSyncedAt: string | null;
  lastRowCount: number | null;
  lastStartDate: string | null;
  lastEndDate: string | null;
  ranges: Partial<Record<GscRangeKey, GscRangeMeta>>;
  lastError: string | null;
  cronConfigured: boolean;
  setupHint: string | null;
};

const BATCH_LIMIT = 450;

function pemPrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function base64Url(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signServiceAccountJwt(email: string, privateKey: string, scope: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: email,
      scope,
      aud: GSC_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  return `${unsigned}.${base64Url(signer.sign(pemPrivateKey(privateKey)))}`;
}

function googleErrorMessage(data: Record<string, unknown>, status: number) {
  const nested = data.error;
  if (nested && typeof nested === "object" && "message" in nested) {
    const message = String((nested as { message?: string }).message || "").trim();
    if (message) return message;
  }
  if (typeof data.error_description === "string" && data.error_description.trim()) {
    return data.error_description.trim();
  }
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  return `Google Search Console API ${status}`;
}

async function googleJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(googleErrorMessage(data, response.status));
  return data as T;
}

function cronSecret() {
  return (process.env.CRON_SECRET ?? "").trim();
}

export function requireCronSecret(req: Request) {
  const secret = cronSecret();
  if (!secret) throw new Error("CRON_SECRET is not configured");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token !== secret) throw new Error("UNAUTHENTICATED");
}

export async function getGscAccessToken() {
  const account = loadServiceAccount();
  const email = String(account.client_email || "").trim();
  const privateKey = String(account.private_key || "").trim();
  if (!email || !privateKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }

  const assertion = signServiceAccountJwt(email, privateKey, GSC_SCOPE);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const data = await googleJson<{ access_token?: string }>(GSC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const token = String(data.access_token || "").trim();
  if (!token) throw new Error("Google did not return an access token for Search Console");
  return token;
}

async function listGscSites(accessToken: string) {
  const data = await googleJson<{ siteEntry?: GscSiteEntry[] }>(GSC_SITES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return (data.siteEntry || [])
    .map((entry) => String(entry.siteUrl || "").trim())
    .filter(Boolean);
}

type GscApiRow = {
  keys?: unknown;
  clicks?: unknown;
  impressions?: unknown;
  ctr?: unknown;
  position?: unknown;
};

async function queryGscAnalytics(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
) {
  const rows: GscApiRow[] = [];
  let startRow = 0;
  const rowLimit = Number(body.rowLimit) || GSC_ROW_LIMIT;

  while (startRow < 100_000) {
    const data = await googleJson<{ rows?: GscApiRow[] }>(gscSearchAnalyticsUrl(siteUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, startRow, dataState: "all" }),
    });

    const chunk = data.rows || [];
    rows.push(...chunk);
    if (chunk.length < rowLimit) break;
    startRow += rowLimit;
  }

  return rows;
}

async function detectLatestDataDate(accessToken: string, siteUrl: string, now = new Date()) {
  const fallback = gscDateWindow(now, 1, GSC_DEFAULT_LAG_DAYS).endDate;
  const today = toUtcDateKey(now);
  const rows = await queryGscAnalytics(accessToken, siteUrl, {
    startDate: addUtcDays(today, -GSC_LATEST_DATE_PROBE_DAYS),
    endDate: today,
    dimensions: ["date"],
    rowLimit: 16,
  });
  return latestDateFromGscDateRows(rows) || fallback;
}

async function queryGscRows(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  const rows = await queryGscAnalytics(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: GSC_ROW_LIMIT,
  });
  return rows.map(normalizeGscQueryRow).filter((row): row is GscQueryRow => Boolean(row));
}

function snapshotRowsCollection(range: GscRangeKey) {
  return adminDb().collection(GSC_SNAPSHOTS_COLLECTION).doc(range).collection("rows");
}

async function replaceRangeSnapshot(
  range: GscRangeKey,
  rows: GscQueryRow[],
  meta: { siteUrl: string; startDate: string; endDate: string; latestDataDate: string; runId: string },
) {
  const db = adminDb();
  const col = snapshotRowsCollection(range);
  let batch = db.batch();
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const row of rows) {
    batch.set(col.doc(gscQueryDocId(row.query)), {
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      range,
      siteUrl: meta.siteUrl,
      startDate: meta.startDate,
      endDate: meta.endDate,
      latestDataDate: meta.latestDataDate,
      runId: meta.runId,
      syncedAt: FieldValue.serverTimestamp(),
    });
    ops += 1;
    if (ops >= BATCH_LIMIT) await flush();
  }
  await flush();

  const existing = await col.select("runId").get();
  for (const doc of existing.docs) {
    if (doc.get("runId") !== meta.runId) {
      batch.delete(doc.ref);
      ops += 1;
      if (ops >= BATCH_LIMIT) await flush();
    }
  }
  await flush();

  await db.collection(GSC_SNAPSHOTS_COLLECTION).doc(range).set(
    {
      range,
      siteUrl: meta.siteUrl,
      startDate: meta.startDate,
      endDate: meta.endDate,
      latestDataDate: meta.latestDataDate,
      rowCount: rows.length,
      runId: meta.runId,
      syncedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function parseStoredRanges(value: unknown): Partial<Record<GscRangeKey, GscRangeMeta>> {
  if (!value || typeof value !== "object") return {};
  const ranges: Partial<Record<GscRangeKey, GscRangeMeta>> = {};
  for (const key of GSC_RANGE_KEYS) {
    const entry = (value as Record<string, unknown>)[key];
    if (!entry || typeof entry !== "object") continue;
    const startDate = String((entry as { startDate?: unknown }).startDate || "").trim();
    const endDate = String((entry as { endDate?: unknown }).endDate || "").trim();
    const rowCount = Number((entry as { rowCount?: unknown }).rowCount) || 0;
    if (!startDate || !endDate) continue;
    ranges[key] = { startDate, endDate, rowCount };
  }
  return ranges;
}

async function recordSyncError(message: string) {
  try {
    await adminDb()
      .doc(GSC_SYNC_DOCUMENT)
      .set(
        {
          lastError: message.slice(0, 500),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    console.error("[gsc] failed to record sync error", error);
  }
}

function setupHintFromError(message: string, serviceAccountEmail: string) {
  const lower = message.toLowerCase();
  if (lower.includes("has not been used") || lower.includes("disabled") || lower.includes("enable it")) {
    return "В Google Cloud включите Search Console API для проекта oneiro-11d15.";
  }
  if (lower.includes("does not have permission") || lower.includes("forbidden") || lower.includes("403")) {
    return `В Search Console добавьте пользователя ${serviceAccountEmail} (права Full) на dreamly.art.`;
  }
  return null;
}

function timestampToIso(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const stamp = value as { toDate?: () => Date };
  if (typeof stamp.toDate !== "function") return null;
  try {
    return stamp.toDate().toISOString();
  } catch {
    return null;
  }
}

export async function getGscStatus(): Promise<GscStatus> {
  const account = tryLoadServiceAccount();
  const serviceAccountEmail = String(account?.client_email || "").trim();
  const projectId = String(account?.project_id || "").trim();

  if (!serviceAccountEmail) {
    return {
      configured: false,
      connected: false,
      serviceAccountEmail: "",
      projectId,
      siteUrl: gscSiteUrlOverride() || null,
      availableSites: [],
      latestDataDate: null,
      lastSyncedAt: null,
      lastRowCount: null,
      lastStartDate: null,
      lastEndDate: null,
      ranges: {},
      lastError: null,
      cronConfigured: Boolean(cronSecret()),
      setupHint: "Нет FIREBASE_SERVICE_ACCOUNT_JSON — без него нельзя ходить в Search Console API.",
    };
  }

  const snap = await adminDb().doc(GSC_SYNC_DOCUMENT).get();
  const data = snap.data() || {};

  const ranges = parseStoredRanges(data.ranges);
  const base: GscStatus = {
    configured: true,
    connected: false,
    serviceAccountEmail,
    projectId,
    siteUrl: typeof data.siteUrl === "string" ? data.siteUrl : gscSiteUrlOverride() || null,
    availableSites: [],
    latestDataDate: typeof data.latestDataDate === "string" ? data.latestDataDate : null,
    lastSyncedAt: timestampToIso(data.syncedAt),
    lastRowCount: typeof data.rowCount === "number" ? data.rowCount : ranges["1d"]?.rowCount ?? null,
    lastStartDate: typeof data.startDate === "string" ? data.startDate : ranges["1d"]?.startDate ?? null,
    lastEndDate: typeof data.endDate === "string" ? data.endDate : ranges["1d"]?.endDate ?? null,
    ranges,
    lastError: typeof data.lastError === "string" ? data.lastError : null,
    cronConfigured: Boolean(cronSecret()),
    setupHint: null,
  };

  try {
    const token = await getGscAccessToken();
    const availableSites = await listGscSites(token);
    const siteUrl =
      pickGscSite(availableSites, gscSiteUrlOverride() || String(data.siteUrl || "")) ||
      gscSiteUrlOverride() ||
      null;
    return {
      ...base,
      connected: availableSites.length > 0,
      availableSites,
      siteUrl,
      setupHint:
        availableSites.length > 0
          ? null
          : `В Search Console добавьте пользователя ${serviceAccountEmail} (права Full) на dreamly.art.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search Console status failed";
    return {
      ...base,
      lastError: base.lastError || message,
      setupHint: setupHintFromError(message, serviceAccountEmail) || message,
    };
  }
}

export async function syncGscQueries(): Promise<GscSyncResult> {
  try {
    const token = await getGscAccessToken();
    const availableSites = await listGscSites(token);
    const preferred = gscSiteUrlOverride();
    const siteUrl = preferred || pickGscSite(availableSites);
    if (!siteUrl) {
      const account = loadServiceAccount();
      throw new Error(
        `Search Console не видит ни одного сайта у ${account.client_email}. Добавьте этот email как пользователя property dreamly.art.`,
      );
    }

    const latestDataDate = await detectLatestDataDate(token, siteUrl);
    const runId = new Date().toISOString();
    const ranges = {} as Record<GscRangeKey, GscRangeMeta>;

    for (const range of GSC_RANGE_KEYS) {
      const window = gscRangeWindow(latestDataDate, range);
      const rows = await queryGscRows(token, siteUrl, window.startDate, window.endDate);
      await replaceRangeSnapshot(range, rows, {
        siteUrl,
        startDate: window.startDate,
        endDate: window.endDate,
        latestDataDate,
        runId,
      });
      ranges[range] = {
        startDate: window.startDate,
        endDate: window.endDate,
        rowCount: rows.length,
      };
    }

    const day = ranges["1d"];
    await adminDb().doc(GSC_SYNC_DOCUMENT).set(
      {
        siteUrl,
        latestDataDate,
        startDate: day.startDate,
        endDate: day.endDate,
        rowCount: day.rowCount,
        ranges,
        runId,
        lastError: null,
        syncedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true,
      siteUrl,
      latestDataDate,
      startDate: day.startDate,
      endDate: day.endDate,
      rowCount: day.rowCount,
      ranges,
      runId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search Console sync failed";
    await recordSyncError(message);
    throw error;
  }
}

export async function listStoredGscQueries(
  limitN: number,
  sort: "clicks" | "impressions",
  rangeInput?: string | null,
) {
  const range = parseGscRange(rangeInput);
  const metaSnap = await adminDb().collection(GSC_SNAPSHOTS_COLLECTION).doc(range).get();
  const meta = metaSnap.data() || {};
  const snap = await snapshotRowsCollection(range).orderBy(sort, "desc").limit(limitN).get();

  return {
    range,
    latestDataDate: typeof meta.latestDataDate === "string" ? meta.latestDataDate : null,
    startDate: typeof meta.startDate === "string" ? meta.startDate : null,
    endDate: typeof meta.endDate === "string" ? meta.endDate : null,
    rowCount: typeof meta.rowCount === "number" ? meta.rowCount : snap.size,
    rows: snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        query: String(data.query ?? ""),
        clicks: Number(data.clicks ?? 0) || 0,
        impressions: Number(data.impressions ?? 0) || 0,
        ctr: Number(data.ctr ?? 0) || 0,
        position: Number(data.position ?? 0) || 0,
        startDate: typeof data.startDate === "string" ? data.startDate : null,
        endDate: typeof data.endDate === "string" ? data.endDate : null,
        syncedAtMs: data.syncedAt?.toMillis?.() ?? null,
      };
    }),
  };
}
