import type { Firestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { adminDb } from "./firebaseAdmin";
import { getDreamEntry } from "@/lib/dream-dictionary";
import { changedDreamPageImages, dreamPageImageFingerprint, dreamPageImagePaths } from "@/lib/dreamPageImageCache";
import { notifyIndexNow } from "@/lib/indexnow";

const STATE_DOCUMENT = "cache_revalidation/dreamPageImages";

/**
 * Compare the source collection, not a writer-specific webhook: this also sees
 * standalone workers, direct Firestore edits and deletions. No state is advanced
 * on a failed source read or invalidation, so the next tick retries.
 */
export async function refreshDreamPageImageCache(
  slugs?: string[],
  dependencies: {
    db: Firestore;
    invalidate: (path: string) => void;
    /** IndexNow ping for the public pages that just changed. Secondary: must never throw into the caller. */
    notify?: (paths: string[]) => Promise<unknown>;
  } = { db: adminDb(), invalidate: revalidatePath },
) {
  const { db, invalidate, notify = (paths) => notifyIndexNow(paths, { reason: "page-image" }) } = dependencies;
  const stateRef = db.doc(STATE_DOCUMENT);
  const state = await stateRef.get();
  const previous = (state.data()?.hashes || {}) as Record<string, string | null>;
  const current: Record<string, string | null> = {};
  if (slugs) {
    for (const slug of new Set(slugs)) {
      if (!getDreamEntry(slug)) continue;
      const source = await db.collection("dreamPageImages").doc(slug).get();
      current[slug] = dreamPageImageFingerprint(source.data());
    }
  } else {
    const source = await db.collection("dreamPageImages").get();
    for (const doc of source.docs) {
      if (getDreamEntry(doc.id)) current[doc.id] = dreamPageImageFingerprint(doc.data());
    }
    // Tombstones retain deletion state without pruning another concurrent writer.
    for (const slug of Object.keys(previous)) {
      if (!(slug in current)) current[slug] = null;
    }
  }
  const changed = slugs
    ? Object.keys(current) // successful admin mutation must invalidate even before first cron baseline
    : changedDreamPageImages(previous, current);
  const paths = dreamPageImagePaths(changed.filter((slug) => !!getDreamEntry(slug)));
  for (const path of paths) invalidate(path);
  if (changed.length) {
    const hashes = Object.fromEntries(changed.map((slug) => [slug, current[slug] ?? null]));
    // Merge per-slug acknowledgements; a racing source update is detected next tick.
    await stateRef.set({ hashes }, { merge: true });
    // The pages now render the new image: tell IndexNow (it drops /sitemap.xml itself). Failures only log.
    try {
      await notify(paths);
    } catch (error) {
      console.warn("[indexnow:page-image] notification failed", error instanceof Error ? error.message : error);
    }
  }
  return { changed: changed.length, paths: paths.length };
}
