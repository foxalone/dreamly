import { createHash } from "crypto";

export const GSC_SYNC_DOCUMENT = "adminSystem/gscSync";
export const GSC_QUERIES_COLLECTION = "gsc_queries";
export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const GSC_SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
export const GSC_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GSC_ROW_LIMIT = 25000;
export const GSC_DEFAULT_LOOKBACK_DAYS = 90;
export const GSC_DEFAULT_LAG_DAYS = 2;

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
