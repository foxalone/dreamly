import { createHash } from "crypto";

export const GSC_SYNC_DOCUMENT = "adminSystem/gscSync";
export const GSC_QUERIES_COLLECTION = "gsc_queries";
export const GSC_SNAPSHOTS_COLLECTION = "gsc_snapshots";
export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const GSC_SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
export const GSC_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GSC_ROW_LIMIT = 25000;
export const GSC_DEFAULT_LOOKBACK_DAYS = 90;
export const GSC_DEFAULT_LAG_DAYS = 2;
export const GSC_LATEST_DATE_PROBE_DAYS = 10;

export const GSC_RANGE_KEYS = ["1d", "3d", "7d", "30d"] as const;
export type GscRangeKey = (typeof GSC_RANGE_KEYS)[number];

export const GSC_RANGE_DAYS: Record<GscRangeKey, number> = {
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
};

export const GSC_SITE_CANDIDATES = [
  "sc-domain:dreamly.art",
  "https://dreamly.art/",
  "http://dreamly.art/",
];

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscDateWindow = {
  startDate: string;
  endDate: string;
};

export function gscEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function gscSiteUrlOverride() {
  return gscEnv("GSC_SITE_URL");
}

export function gscLookbackDays() {
  const raw = Number(gscEnv("GSC_LOOKBACK_DAYS") || GSC_DEFAULT_LOOKBACK_DAYS);
  if (!Number.isFinite(raw)) return GSC_DEFAULT_LOOKBACK_DAYS;
  return Math.min(16 * 30, Math.max(7, Math.round(raw)));
}

export function toUtcDateKey(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function gscDateWindow(
  now = new Date(),
  lookbackDays = gscLookbackDays(),
  lagDays = GSC_DEFAULT_LAG_DAYS,
): GscDateWindow {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - lagDays);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (lookbackDays - 1));
  return { startDate: toUtcDateKey(start), endDate: toUtcDateKey(end) };
}

export function parseGscRange(value: string | null | undefined): GscRangeKey {
  const key = String(value || "").trim();
  return GSC_RANGE_KEYS.includes(key as GscRangeKey) ? (key as GscRangeKey) : "1d";
}

export function addUtcDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return toUtcDateKey(date);
}

/** Inclusive window ending on the latest GSC data day, not the calendar today. */
export function gscRangeWindow(latestDataDate: string, range: GscRangeKey): GscDateWindow {
  const days = GSC_RANGE_DAYS[range];
  return {
    startDate: addUtcDays(latestDataDate, -(days - 1)),
    endDate: latestDataDate,
  };
}

export function latestDateFromGscDateRows(rows: Array<{ keys?: unknown }>) {
  let latest: string | null = null;
  for (const row of rows) {
    const date = String(Array.isArray(row.keys) ? row.keys[0] ?? "" : "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

export function encodeGscSiteUrl(siteUrl: string) {
  return encodeURIComponent(siteUrl);
}

export function gscSearchAnalyticsUrl(siteUrl: string) {
  return `${GSC_SITES_URL}/${encodeGscSiteUrl(siteUrl)}/searchAnalytics/query`;
}

export function gscQueryDocId(query: string) {
  return createHash("sha256").update(query).digest("hex");
}

export function pickGscSite(available: string[], preferred?: string) {
  const wanted = (preferred || "").trim();
  if (wanted && available.includes(wanted)) return wanted;
  for (const candidate of GSC_SITE_CANDIDATES) {
    if (available.includes(candidate)) return candidate;
  }
  const dreamly = available.find((site) => /dreamly\.art/i.test(site));
  return dreamly || available[0] || null;
}

export function normalizeGscQueryRow(row: {
  keys?: unknown;
  clicks?: unknown;
  impressions?: unknown;
  ctr?: unknown;
  position?: unknown;
}): GscQueryRow | null {
  const query = String(Array.isArray(row.keys) ? row.keys[0] ?? "" : "").trim();
  if (!query) return null;
  return {
    query,
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ctr: Number(row.ctr) || 0,
    position: Number(row.position) || 0,
  };
}
