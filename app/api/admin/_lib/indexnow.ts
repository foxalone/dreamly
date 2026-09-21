import type { Firestore } from "firebase-admin/firestore";

import { adminDb } from "./firebaseAdmin";
import {
  INDEXNOW_HOST,
  type IndexNowFetch,
  type IndexNowSnapshot,
  collectIndexNowUrls,
  currentIndexNowSnapshot,
  diffIndexNowSnapshot,
  indexNowKey,
  indexNowKeyLocation,
  isKnownPublicUrl,
  listPublicPagesUrls,
  submitIndexNowUrls,
} from "@/lib/indexnow";

/**
 * Public page text ships with a deploy, so "created / updated / deleted" is
 * detected by diffing the current inventory against the one last acknowledged
 * here. Unchanged pages are never resubmitted; a failed submit keeps the old
 * snapshot so the next run retries the same URLs.
 */
const STATE_DOCUMENT = "cache_revalidation/indexNow";
/**
 * Size note: the whole snapshot is one Firestore document (hard limit 1 MiB
 * including field names). ~5.7k URLs serialize to ~265 KB, roughly 46 bytes per
 * URL, so the ceiling is ~20k URLs. If the inventory grows toward that, shard
 * `pages` (e.g. one document per locale) instead of raising the test threshold
 * in lib/indexnow.test.ts.
 */

type StoredState = {
  /** JSON-encoded IndexNowSnapshot (path → fingerprint). One string keeps Firestore field names clean. */
  pages?: string;
  count?: number;
  submittedAt?: string;
};

export type IndexNowChangedResult = {
  ok: true;
  mode: "changed";
  host: string;
  keyLocation: string;
  /** First run only: inventory recorded, nothing submitted. */
  baseline: boolean;
  added: number;
  updated: number;
  removed: number;
  submitted: number;
  status: number;
};

export type IndexNowStateSummary = { count: number; submittedAt: string | null };

type Dependencies = { db?: Firestore; fetchImpl?: IndexNowFetch; now?: () => Date };

/** Firestore is only opened by the callers that read/write the snapshot. */
function resolve(dependencies: Dependencies) {
  return {
    get db() { return dependencies.db ?? adminDb(); },
    fetchImpl: dependencies.fetchImpl ?? fetch,
    now: dependencies.now ?? (() => new Date()),
  };
}

function parseSnapshot(state: StoredState | undefined): IndexNowSnapshot | null {
  if (!state?.pages) return null;
  try {
    const parsed = JSON.parse(state.pages) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as IndexNowSnapshot) : null;
  } catch {
    return null;
  }
}

export async function readIndexNowState(dependencies: Dependencies = {}): Promise<IndexNowStateSummary | null> {
  const { db } = resolve(dependencies);
  const state = (await db.doc(STATE_DOCUMENT).get()).data() as StoredState | undefined;
  if (!state?.pages) return null;
  return { count: Number(state.count) || 0, submittedAt: state.submittedAt || null };
}

/** Daily cron + admin "changed": submit only pages that appeared, changed, or disappeared. */
export async function submitChangedIndexNow(dependencies: Dependencies = {}): Promise<IndexNowChangedResult> {
  const { db, fetchImpl, now } = resolve(dependencies);
  const key = indexNowKey();
  if (!key) throw new Error("INDEXNOW_KEY is not configured");

  const stateRef = db.doc(STATE_DOCUMENT);
  const previous = parseSnapshot((await stateRef.get()).data() as StoredState | undefined);
  const current = currentIndexNowSnapshot();
  const base = { ok: true as const, mode: "changed" as const, host: INDEXNOW_HOST, keyLocation: indexNowKeyLocation(key) };

  const persist = async (submittedAt: string | null) => {
    await stateRef.set({
      pages: JSON.stringify(current),
      count: Object.keys(current).length,
      submittedAt,
      updatedAt: now().toISOString(),
    });
  };

  if (!previous) {
    // The inventory was already submitted in bulk when IndexNow was set up; start diffing from here.
    await persist(null);
    return { ...base, baseline: true, added: 0, updated: 0, removed: 0, submitted: 0, status: 0 };
  }

  const diff = diffIndexNowSnapshot(previous, current);
  const changed = [...diff.added, ...diff.updated, ...diff.removed];
  let submitted = 0;
  let status = 0;
  if (changed.length) {
    ({ submitted, status } = await submitIndexNowUrls(changed, fetchImpl, key));
  }
  // Only after a successful submit (or nothing to submit) does the new inventory become the baseline.
  await persist(changed.length ? now().toISOString() : null);
  return {
    ...base,
    baseline: false,
    added: diff.added.length,
    updated: diff.updated.length,
    removed: diff.removed.length,
    submitted,
    status,
  };
}

/** Admin only, on demand: the whole public inventory (e.g. after rotating the key). */
export async function submitAllIndexNow(dependencies: Dependencies = {}) {
  const { fetchImpl } = resolve(dependencies);
  const key = indexNowKey();
  if (!key) throw new Error("INDEXNOW_KEY is not configured");
  const { submitted, status } = await submitIndexNowUrls(listPublicPagesUrls(), fetchImpl, key);
  return { ok: true as const, mode: "all" as const, host: INDEXNOW_HOST, keyLocation: indexNowKeyLocation(key), submitted, status };
}

/** Admin manual test: exactly one URL that exists in the public inventory. */
export async function submitOneIndexNow(input: string, dependencies: Dependencies = {}) {
  const { fetchImpl } = resolve(dependencies);
  const key = indexNowKey();
  if (!key) throw new Error("INDEXNOW_KEY is not configured");
  const { urls } = collectIndexNowUrls(input);
  const url = urls[0];
  if (!url) throw new Error("URL_NOT_INDEXABLE");
  if (!isKnownPublicUrl(url)) throw new Error("URL_NOT_PUBLIC");
  const { submitted, status } = await submitIndexNowUrls([url], fetchImpl, key);
  return { ok: true as const, mode: "url" as const, host: INDEXNOW_HOST, keyLocation: indexNowKeyLocation(key), url, submitted, status };
}
