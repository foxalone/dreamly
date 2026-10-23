import assert from "node:assert/strict";
import test from "node:test";
import { DICTIONARY_EMOJIS, dreamMapDictionaryRows, resolveEmojiDictionary } from "./emojiDictionary";
import { getDreamEntry } from "./dream-dictionary";
import { emojiDictionaryCopy } from "./i18n/emojiDictionary";

test("camera without an article retains its meaningful search fallback", () => {
  assert.deepEqual(resolveEmojiDictionary("📸"), { slug: null, query: "camera with flash" });
  assert.ok(DICTIONARY_EMOJIS.some((row) => row.emoji === "📸"));
});

test("map and admin agree on existing dictionary links", () => {
  assert.equal(resolveEmojiDictionary("🐍").slug, "snake");
  assert.ok(getDreamEntry(resolveEmojiDictionary("🐍").slug!));
});

test("a saved link takes precedence, including after a missing lookup was cached", () => {
  assert.equal(resolveEmojiDictionary("📸").slug, null);
  assert.equal(resolveEmojiDictionary("📸", "snake").slug, "snake");
  assert.equal(resolveEmojiDictionary("📸", "not-a-published-article").slug, null);
  assert.equal(resolveEmojiDictionary("📸").slug, null);
});

test("variation selectors and skin tones share the same mapping", () => {
  assert.deepEqual(resolveEmojiDictionary("✍️", "snake"), resolveEmojiDictionary("✍🏽", "snake"));
});

test("the backlog has unique canonical icons and omits unusable flag and keycap entries", () => {
  assert.equal(new Set(DICTIONARY_EMOJIS.map((row) => row.key)).size, DICTIONARY_EMOJIS.length);
  assert.ok(!DICTIONARY_EMOJIS.some((row) => row.id.startsWith("flag-") || row.id.startsWith("keycap_")));
});

test("new admin copy covers all six locales", () => {
  assert.deepEqual(Object.keys(emojiDictionaryCopy).sort(), ["ar", "de", "en", "es", "pt", "ru"]);
  for (const copy of Object.values(emojiDictionaryCopy)) for (const value of Object.values(copy)) assert.ok(value.trim());
});


test("backlog contains only emojis actually present in dream markers, not the full catalog or stories", () => {
  const rows = dreamMapDictionaryRows([
    { lat: 42, lng: -85, emojis: { "📸": 2, "🐍": 1, "🐱": 0 }, storyEmojis: { "🐶": 8 } },
    { lat: null, lng: -85, emojis: { "🦁": 4 } },
    { lat: "invalid", lng: 5, emojis: { "🦊": 5 } },
    { lat: 10, lng: 20, storyEmojis: { "🐶": 4 } },
  ]);
  assert.deepEqual(rows.map((row) => row.emoji), ["📸", "🐍"]);
  assert.equal(rows.filter((row) => !row.slug).length, 1);
  assert.equal(rows[0].slug, null);
  assert.equal(rows[1].slug, "snake");
});

test("map backlog sums nested and dotted positive dream counts across cities and sorts by frequency", () => {
  const rows = dreamMapDictionaryRows([
    { lat: "42,5", lng: -85, "emojis.📸": 3, emojis: { "📸": 2, "🐍": 10, "🐶": -1 } },
    { lat: 10, lng: 20, "emojis.📸": 8, emojis: { "🐱": "not a count" } },
  ]);
  assert.deepEqual(rows.map(({ emoji, count }) => ({ emoji, count })), [{ emoji: "📸", count: 13 }, { emoji: "🐍", count: 10 }]);
});

test("a published article link resolves an actual map emoji and removes it from the missing filter", () => {
  const cities = [{ lat: 42, lng: -85, emojis: { "📸": 1 } }];
  assert.equal(dreamMapDictionaryRows(cities).filter((row) => !row.slug).length, 1);
  const rows = dreamMapDictionaryRows(cities, new Map([["📸", "snake"]]));
  assert.equal(rows.filter((row) => !row.slug).length, 0);
  assert.equal(rows[0].manual, true);
});
