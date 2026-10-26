import assert from "node:assert/strict";
import test from "node:test";
import { optionalPageData } from "./optionalPageData";
import { getLocalizedEntry } from "./i18n/localize-dictionary";
import { LOCALES } from "./i18n/config";

test("optional read failures fall back and retry successfully after recovery", async (t) => {
  t.mock.method(console, "error", () => {});
  let unavailable = true;
  let reads = 0;
  const read = async () => {
    reads++;
    if (unavailable) throw new Error("Firestore unavailable");
    return { imageUrl: "https://example.test/peacock.jpg" };
  };
  assert.equal(await optionalPageData("image", read, null), null);
  unavailable = false;
  assert.deepEqual(await optionalPageData("image", read, null), { imageUrl: "https://example.test/peacock.jpg" });
  assert.equal(reads, 2);
});

test("SEO read failures leave the native article metadata available in every locale", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const locale of LOCALES) {
    const entry = getLocalizedEntry("peacock-feather", locale);
    assert.ok(entry?.seoTitle);
    assert.ok(entry?.seoDescription);
    const override = await optionalPageData<{ title?: string }>("seo", async () => {
      throw new Error("Firestore unavailable");
    }, {});
    assert.equal(override.title ?? entry.seoTitle, entry.seoTitle);
  }
});

test("a successful missing assignment is not treated as an outage", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  assert.equal(await optionalPageData("video", async () => null, null), null);
  assert.equal(log.mock.callCount(), 0);
});
