import { createHash } from "node:crypto";

import { getDreamGuide } from "@/lib/dream-guides";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedEntry } from "@/lib/i18n/localize-dictionary";
import { getLocalizedGuide } from "@/lib/i18n/localize-guides";
import { isLocaleExemptPath, stripLocalePrefix } from "@/lib/i18n/path";
import { SITE_ORIGIN, listPublicPages, type PublicPage } from "@/lib/publicPages";

/**
 * IndexNow (Bing, Yandex, Seznam, Naver …) — https://www.indexnow.org/documentation
 *
 * The key lives in the `INDEXNOW_KEY` environment variable only. It is served at
 * `/{INDEXNOW_KEY}.txt` through the rewrite in next.config.ts → /api/indexnow/key.
 *
 * Nothing here runs on page requests. Submissions happen only from explicit
 * lifecycle points (page image changes, the daily inventory diff, an admin test).
 */

export const INDEXNOW_HOST = "dreamly.art";

/** Shared endpoint: one POST fans out to every IndexNow-participating engine. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Protocol maximum per POST. */
export const INDEXNOW_BATCH_LIMIT = 10_000;

/** Same rule as the rewrite in next.config.ts: 8–128 chars of [a-zA-Z0-9-]. */
export const INDEXNOW_KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export type IndexNowNotifyResult = {
  ok: boolean;
  /** URLs actually sent (after dedupe/filtering). */
  submitted: number;
  /** Inputs dropped: foreign host, non-indexable path, malformed. */
  skipped: number;
  /** Last HTTP status from the endpoint, 0 when nothing was sent. */
  status: number;
  error?: string;
};

export type IndexNowFetch = (input: string, init: RequestInit) => Promise<Response>;

export function indexNowKey(env: Record<string, string | undefined> = process.env): string {
  const key = env.INDEXNOW_KEY?.trim() || "";
  return INDEXNOW_KEY_PATTERN.test(key) ? key : "";
}

export function isIndexNowConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return indexNowKey(env) !== "";
}

export function indexNowKeyLocation(key: string = indexNowKey()): string {
  return key ? `${SITE_ORIGIN}/${key}.txt` : "";
}

/* ---------------------------------------------------------------- URL rules */

/** Unprefixed path prefixes that are noindex and/or disallowed in robots.txt. */
const EXCLUDED_PATH_PREFIXES = ["/signin", "/app", "/payment-success"];
/** Exceptions inside an excluded prefix: public, indexable pages (see app/app/map/mapSeo.tsx). */
const INDEXABLE_EXCEPTIONS = ["/app/map"];

/** Public, canonical, indexable page path (locale prefix allowed, never `/en`). */
export function isIndexNowEligiblePath(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  if (isLocaleExemptPath(pathname)) return false; // /api/, /_next/, admin dashboard, *.xml/*.txt …
  if (pathname === "/en" || pathname.startsWith("/en/")) return false;
  const { path } = stripLocalePrefix(pathname);
  if (INDEXABLE_EXCEPTIONS.includes(path)) return true;
  return !EXCLUDED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Turn a path or absolute URL into the canonical absolute URL on SITE_ORIGIN.
 * Returns null for other hosts, non-indexable paths, or unparsable input.
 * Query strings and fragments are dropped (public pages have neither).
 */
export function toIndexNowUrl(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = raw.startsWith("/") ? new URL(raw, SITE_ORIGIN) : new URL(raw);
  } catch {
    return null;
  }
  if (url.origin !== SITE_ORIGIN) return null;
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  if (!isIndexNowEligiblePath(pathname)) return null;
  return `${SITE_ORIGIN}${pathname}`;
}

/** Dedupe + canonicalize; `skipped` lists inputs that did not survive. */
export function collectIndexNowUrls(input: string | string[]): { urls: string[]; skipped: string[] } {
  const inputs = Array.isArray(input) ? input : [input];
  const urls = new Set<string>();
  const skipped: string[] = [];
  for (const item of inputs) {
    const url = toIndexNowUrl(item);
    if (url) urls.add(url);
    else skipped.push(String(item));
  }
  return { urls: [...urls], skipped };
}

/** Every public indexable URL — the sitemap inventory. */
export function listPublicPagesUrls(): string[] {
  return [...new Set(listPublicPages().map((page) => page.url))];
}

/** Whether a canonical absolute URL is part of the current public inventory (sitemap). */
export function isKnownPublicUrl(url: string): boolean {
  return listPublicPages().some((page) => page.url === url);
}

/* -------------------------------------------------------------- submission */

export function indexNowPayload(urls: string[], key: string = indexNowKey()) {
  return {
    host: INDEXNOW_HOST,
    key,
    keyLocation: indexNowKeyLocation(key),
    urlList: urls,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Low-level submit: canonicalizes, dedupes, batches, throws on HTTP/transport
 * errors. Prefer `notifyIndexNow` from lifecycle code — it never throws.
 */
export async function submitIndexNowUrls(
  input: string | string[],
  fetchImpl: IndexNowFetch = fetch,
  key: string = indexNowKey(),
): Promise<{ submitted: number; skipped: number; status: number }> {
  if (!key) throw new Error("INDEXNOW_KEY is not configured");
  const { urls, skipped } = collectIndexNowUrls(input);
  if (urls.length === 0) return { submitted: 0, skipped: skipped.length, status: 0 };

  let status = 0;
  let submitted = 0;
  for (const batch of chunk(urls, INDEXNOW_BATCH_LIMIT)) {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowPayload(batch, key)),
    });
    status = response.status;
    // 200 = OK, 202 = accepted, key validation pending.
    if (status !== 200 && status !== 202) {
      const detail = await response.text().catch(() => "");
      throw new Error(`IndexNow HTTP ${status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    submitted += batch.length;
  }
  return { submitted, skipped: skipped.length, status };
}

let warnedUnconfigured = false;

/**
 * Fire-and-forget safe notification for lifecycle code. Accepts one path, one
 * URL, or a list of either. Never throws; failures are logged once, concisely.
 *
 *   await notifyIndexNow("/dreams/snake")
 *   await notifyIndexNow(["/dreams/snake", "/es/dreams/snake"])
 */
export async function notifyIndexNow(
  input: string | string[],
  options: { fetchImpl?: IndexNowFetch; reason?: string } = {},
): Promise<IndexNowNotifyResult> {
  const tag = options.reason ? `[indexnow:${options.reason}]` : "[indexnow]";
  try {
    const key = indexNowKey();
    if (!key) {
      const { urls, skipped } = collectIndexNowUrls(input);
      if (!warnedUnconfigured) {
        warnedUnconfigured = true;
        console.warn(`${tag} INDEXNOW_KEY is not configured; skipping ${urls.length} URL(s)`);
      }
      return { ok: false, submitted: 0, skipped: skipped.length + urls.length, status: 0, error: "INDEXNOW_KEY is not configured" };
    }
    const result = await submitIndexNowUrls(input, options.fetchImpl ?? fetch, key);
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${tag} notification failed: ${message}`);
    const { urls, skipped } = collectIndexNowUrls(input);
    return { ok: false, submitted: 0, skipped: skipped.length + urls.length, status: 0, error: message };
  }
}

/* ------------------------------------------------- inventory diff (deploys) */

/** Site-relative path → content fingerprint, for every public indexable page. */
export type IndexNowSnapshot = Record<string, string>;

export type IndexNowDiff = { added: string[]; updated: string[]; removed: string[] };

function shortHash(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function pageLocale(pathname: string): Locale {
  return stripLocalePrefix(pathname).locale;
}

/**
 * What "meaningfully changed" means per page type:
 * - dictionary symbol: sitemap lastmod + localized title/SEO/text/links
 * - guide hub: sitemap lastmod + guide updatedAt + localized title/SEO/text
 * - everything else: sitemap lastmod
 */
export function indexNowFingerprint(page: PublicPage): string {
  const pathname = page.url.slice(SITE_ORIGIN.length) || "/";
  const locale = pageLocale(pathname);
  const { path } = stripLocalePrefix(pathname);
  const base: unknown[] = [page.lastModified || ""];

  if (page.canonicalSlug) {
    const entry = getLocalizedEntry(page.canonicalSlug, locale);
    if (entry) {
      base.push(entry.title, entry.seoTitle, entry.seoDescription, entry.shortMeaning, entry.sections, entry.relatedSymbols, entry.variationSlugs);
    }
    return shortHash(base);
  }

  const guideSlug = path.startsWith("/dreams/") ? path.slice("/dreams/".length) : "";
  if (guideSlug && getDreamGuide(guideSlug)) {
    const guide = getLocalizedGuide(guideSlug, locale);
    if (guide) base.push(guide.updatedAt, guide.title, guide.seoTitle, guide.seoDescription, guide.summary, guide.intro, guide.sections, guide.faqs);
  }
  return shortHash(base);
}

export function currentIndexNowSnapshot(pages: PublicPage[] = listPublicPages()): IndexNowSnapshot {
  const snapshot: IndexNowSnapshot = {};
  for (const page of pages) {
    const pathname = page.url.slice(SITE_ORIGIN.length) || "/";
    if (!isIndexNowEligiblePath(pathname)) continue;
    snapshot[pathname] = indexNowFingerprint(page);
  }
  return snapshot;
}

export function diffIndexNowSnapshot(previous: IndexNowSnapshot, current: IndexNowSnapshot): IndexNowDiff {
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  for (const [path, fingerprint] of Object.entries(current)) {
    if (!(path in previous)) added.push(path);
    else if (previous[path] !== fingerprint) updated.push(path);
  }
  for (const path of Object.keys(previous)) {
    if (!(path in current)) removed.push(path);
  }
  return { added, updated, removed };
}
