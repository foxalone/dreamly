import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { galleryOriginCity, isImagePublished, publishAutomaticImage, type Publication } from "./dreamImageGallery";
import { GALLERY_DREAM_HEARTS_COLLECTION, GALLERY_HEARTS_COLLECTION, galleryHeartCollection } from "./galleryHearts";

test("automatic gallery images are visible only while the dream is shared and present", () => {
  const automatic = { dreamPath: "users/reader/dreams/example", publishedAt: 1, automatic: true } satisfies Publication;
  assert.equal(isImagePublished(automatic, { shared: true }), true);
  assert.equal(isImagePublished(automatic, { shared: false }), false);
  assert.equal(isImagePublished(automatic, { shared: true, deleted: true }), false);
  assert.equal(isImagePublished(automatic, undefined), false);

  const explicit = { ...automatic, automatic: false };
  assert.equal(isImagePublished(explicit, { shared: false }), true);
  assert.equal(isImagePublished(explicit, { shared: false, deleted: true }), false);
  assert.equal(isImagePublished(undefined, { shared: true }), false);
});

test("gallery locations come only from the original public feed entry", () => {
  const journal = { id: "one", parent: { path: "users/owner/dreams", parent: { id: "owner" } } } as unknown as DocumentReference;
  const feed = { id: "owner_one", parent: { path: "shared_dreams" } } as unknown as DocumentReference;
  const privatePlace = { shared: true, cityId: "private", city: "Private city" };
  const copy = { ownerUid: "owner", ownerDreamId: "one", cityId: "GB||London", city: "London", country: "GB", lat: 51.5, lng: -0.1 };
  const publicCity = { cityId: "GB||London", city: "London", country: "GB" };

  assert.deepEqual(galleryOriginCity(journal, privatePlace, copy), publicCity);
  assert.deepEqual(galleryOriginCity(feed, copy, undefined), publicCity);
  assert.equal(galleryOriginCity(journal, privatePlace, undefined), null);
  assert.equal(galleryOriginCity(journal, { ...privatePlace, shared: false }, copy), null);
  assert.equal(galleryOriginCity(journal, privatePlace, { ...copy, ownerUid: "someone-else" }), null);
  assert.equal(galleryOriginCity(journal, privatePlace, { ...copy, deleted: true }), null);
  assert.equal(galleryOriginCity(feed, { ...copy, deleted: true }, undefined), null);
  assert.equal(galleryOriginCity(feed, { ...copy, cityId: "invalid/path" }, undefined), null);
});

test("a public dream copy must belong to the same user and dream to auto-publish their picture", async () => {
  const collection = (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) });
  const dream = { id: "one", path: "users/owner/dreams/one", parent: { parent: { id: "owner" } },
    firestore: { collection } } as unknown as DocumentReference;
  let shared: Record<string, unknown> | undefined;
  const writes: Array<{ path: string; post: Publication }> = [];
  const tx = {
    get: async (ref: { path: string }) => {
      assert.equal(ref.path, "shared_dreams/owner_one");
      return { data: () => shared };
    },
    set: (ref: { path: string }, post: Publication) => writes.push({ path: ref.path, post }),
  } as unknown as Transaction;

  await publishAutomaticImage(tx, dream, { shared: true }, {});
  shared = { ownerUid: "someone-else", ownerDreamId: "one" };
  await publishAutomaticImage(tx, dream, { shared: true }, {});
  shared = { ownerUid: "owner", ownerDreamId: "one" };
  await publishAutomaticImage(tx, dream, { shared: true }, { galleryHidden: true });
  assert.equal(writes.length, 0);

  await publishAutomaticImage(tx, dream, { shared: true }, {});
  assert.equal(writes.length, 1);
  assert.equal(writes[0].post.automatic, true);
  const publicId = writes[0].path.split("/").at(-1)!;
  assert.notEqual(publicId, dream.id);
  assert.equal(galleryHeartCollection(publicId), GALLERY_DREAM_HEARTS_COLLECTION);
  assert.equal(galleryHeartCollection("blue-door"), GALLERY_HEARTS_COLLECTION);
});
