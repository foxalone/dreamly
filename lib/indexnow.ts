import { SITE_ORIGIN, listPublicPages } from "@/lib/publicPages";

/** Public IndexNow key. Also hosted at `/{INDEXNOW_KEY}.txt`. */
export const INDEXNOW_KEY = "3c472be7ec3b7ed38ae74cb3b6dbb792";

export const INDEXNOW_HOST = "dreamly.art";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export const INDEXNOW_BATCH_LIMIT = 10_000;

/** Cron / default admin submit: pages touched in this many UTC days. */
export const INDEXNOW_RECENT_DAYS = 14;

export type IndexNowMode = "recent" | "all";

export type IndexNowSubmitResult = {
  ok: boolean;
  mode: IndexNowMode;
  host: string;
  keyLocation: string;
  submitted: number;
  status: number;
  since: string | null;
};

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function indexNowKeyLocation(): string {
  return `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
}

export function indexNowSinceDate(now = new Date(), recentDays = INDEXNOW_RECENT_DAYS): string {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - recentDays);
  return utcDateKey(start);
}

export function collectIndexNowUrls(mode: IndexNowMode, now = new Date()): { urls: string[]; since: string | null } {
  const pages = listPublicPages();
  if (mode === "all") {
    return { urls: [...new Set(pages.map((page) => page.url))], since: null };
  }

  const since = indexNowSinceDate(now);
  const recent = pages.filter((page) => !page.lastModified || page.lastModified >= since);
  const always = pages.filter((page) => {
    const path = page.url.slice(SITE_ORIGIN.length) || "/";
    return path === "/" || path === "/dreams" || /^\/(es|ar|pt|de|ru)$/.test(path) || /^\/(es|ar|pt|de|ru)\/dreams$/.test(path);
  });

  return { urls: [...new Set([...always, ...recent].map((page) => page.url))], since };
}

export function indexNowPayload(urls: string[]) {
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: indexNowKeyLocation(),
    urlList: urls,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function submitIndexNowUrls(
  urls: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ submitted: number; status: number }> {
  const unique = [...new Set(urls)].filter((url) => url.startsWith(`${SITE_ORIGIN}/`) || url === `${SITE_ORIGIN}/`);
  if (unique.length === 0) return { submitted: 0, status: 0 };

  let lastStatus = 0;
  let submitted = 0;
  for (const batch of chunk(unique, INDEXNOW_BATCH_LIMIT)) {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowPayload(batch)),
    });
    lastStatus = response.status;
    if (response.status !== 200 && response.status !== 202) {
      const detail = await response.text().catch(() => "");
      throw new Error(`IndexNow ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
    }
    submitted += batch.length;
  }

  return { submitted, status: lastStatus };
}

export async function submitPublicIndexNow(
  mode: IndexNowMode,
  now = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<IndexNowSubmitResult> {
  const { urls, since } = collectIndexNowUrls(mode, now);
  const { submitted, status } = await submitIndexNowUrls(urls, fetchImpl);
  return {
    ok: true,
    mode,
    host: INDEXNOW_HOST,
    keyLocation: indexNowKeyLocation(),
    submitted,
    status,
    since,
  };
}
