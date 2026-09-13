import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { refreshDreamPageImageCache } from "../app/api/admin/_lib/dreamPageImageCache";
import { dreamPageImageFingerprint, dreamPageImagePaths } from "./dreamPageImageCache";
import { saveDreamPageImage } from "./dreamPageImageStore.mjs";
import { LOCALES } from "./i18n/config";
import { localePath } from "./i18n/path";
import { ALL_DREAM_ENTRIES, DREAM_SLUGS } from "./dream-dictionary";
import { getLocalizedEntry } from "./i18n/localize-dictionary";
import { listPublicPages } from "./publicPages";

type Data = Record<string, unknown>;
function fixture() {
  const images = new Map<string, Data>();
  let hashes: Record<string, string | null> = {};
  let failRead = false;
  let stateWrites = 0;
  const invalidated: string[] = [];
  const db = {
    doc: () => ({
      get: async () => ({ data: () => ({ hashes: { ...hashes } }) }),
      set: async (data: { hashes: Record<string, string | null> }) => {
        hashes = { ...hashes, ...data.hashes };
        stateWrites++;
      },
    }),
    collection: () => ({
      get: async () => {
        if (failRead) throw new Error("source unavailable");
        return { docs: [...images].map(([id, data]) => ({ id, data: () => data })) };
      },
      doc: (slug: string) => ({
        get: async () => ({ data: () => images.get(slug) }),
        slug,
      }),
    }),
    runTransaction: async (fn: (transaction: unknown) => unknown) => fn({
      get: async (ref: { slug: string }) => ({ data: () => images.get(ref.slug) }),
      set: (ref: { slug: string }, data: Data) => images.set(ref.slug, data),
    }),
  } as unknown as Firestore;
  return {
    db, images, invalidated,
    invalidate: (path: string) => { invalidated.push(path); },
    get stateWrites() { return stateWrites; },
    set failRead(value: boolean) { failRead = value; },
  };
}
const original = { imageJobId: "job-123", imageUrl: "https://example.test/image-v1.png", subject: "snake" };

test("publication, image replacement, external edit and deletion refresh all locales and sitemap", async () => {
  const f = fixture();
  assert.deepEqual(await refreshDreamPageImageCache(undefined, f), { changed: 0, paths: 0 });
  await saveDreamPageImage(f.db, "snake", original, "2026-09-13T10:00:00Z");
  assert.deepEqual(await refreshDreamPageImageCache(undefined, f), { changed: 1, paths: 13 });
  const expected = dreamPageImagePaths(["snake"]);
  assert.deepEqual(f.invalidated.splice(0), expected);
  assert.deepEqual(await refreshDreamPageImageCache(undefined, f), { changed: 0, paths: 0 });
  assert.equal(f.stateWrites, 1);
  // Direct external writes are detected without using our save helper.
  f.images.set("snake", { ...original, imageUrl: "https://example.test/image-v2.png" });
  assert.equal((await refreshDreamPageImageCache(undefined, f)).changed, 1);
  assert.deepEqual(f.invalidated.splice(0), expected);
  f.images.delete("snake");
  assert.equal((await refreshDreamPageImageCache(undefined, f)).changed, 1);
  assert.deepEqual(f.invalidated.splice(0), expected);
  assert.equal((await refreshDreamPageImageCache(undefined, f)).changed, 0);
});

test("admin refresh acknowledges the change so the next cron does not invalidate twice", async () => {
  const f = fixture();
  f.images.set("snake", original);
  assert.equal((await refreshDreamPageImageCache(["snake"], f)).paths, 13);
  assert.equal((await refreshDreamPageImageCache(undefined, f)).paths, 0);
  f.images.delete("snake");
  assert.equal((await refreshDreamPageImageCache(["snake"], f)).paths, 13);
  assert.equal((await refreshDreamPageImageCache(undefined, f)).paths, 0);
});

test("failed reads and invalidations keep the baseline for retry; never purge on read failure", async () => {
  const f = fixture();
  f.images.set("snake", original);
  await assert.rejects(refreshDreamPageImageCache(undefined, {
    db: f.db, invalidate: () => { throw new Error("invalidation unavailable"); },
  }));
  assert.equal(f.stateWrites, 0);
  assert.equal((await refreshDreamPageImageCache(undefined, f)).changed, 1);
  f.invalidated.length = 0;
  f.failRead = true;
  await assert.rejects(refreshDreamPageImageCache(undefined, f));
  assert.deepEqual(f.invalidated, []);
  assert.equal(f.stateWrites, 1);
});

test("worker + wait + scheduling retries preserve assignedAt and gallery order", async () => {
  const f = fixture();
  assert.equal(await saveDreamPageImage(f.db, "snake", original, "first"), true);
  assert.equal(await saveDreamPageImage(f.db, "snake", original, "retry"), false);
  assert.equal(f.images.get("snake")?.assignedAt, "first");
  assert.equal(await saveDreamPageImage(f.db, "snake", { ...original, imageUrl: "new" }, "second"), true);
  assert.equal(f.images.get("snake")?.assignedAt, "second");
});

test("batch invalidation deduplicates gallery/sitemap and ignores unknown database slugs", async () => {
  const f = fixture();
  for (const slug of ["snake", "house", "not-a-real-dream-symbol"]) f.images.set(slug, original);
  assert.deepEqual(await refreshDreamPageImageCache(undefined, f), { changed: 2, paths: 19 });
  assert.equal(new Set(f.invalidated).size, 19);
  assert.ok(!f.invalidated.some((path) => path === "/" || path.includes("not-a-real") || path.startsWith("/en/")));
});

test("audit fields do not change fingerprint, but image data and assignment order do", () => {
  const hash = dreamPageImageFingerprint(original);
  assert.equal(hash, dreamPageImageFingerprint({ ...original, assignedBy: "other" }));
  assert.notEqual(hash, dreamPageImageFingerprint({ ...original, imageUrl: "new" }));
  assert.notEqual(hash, dreamPageImageFingerprint({ ...original, assignedAt: "2026-09-13" }));
});

test("every deployed dictionary symbol has all six locale entries and sitemap URLs", () => {
  const urls = new Set(listPublicPages().map((page) => page.url));
  for (const entry of ALL_DREAM_ENTRIES) {
    assert.ok(DREAM_SLUGS.includes(entry.slug));
    for (const locale of LOCALES) {
      assert.ok(getLocalizedEntry(entry.slug, locale));
      assert.ok(urls.has(`https://dreamly.art${localePath(`/dreams/${entry.canonicalSlug}`, locale)}`));
    }
  }
});
