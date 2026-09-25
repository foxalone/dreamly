import test from "node:test";
import assert from "node:assert/strict";
import { createEmojiResolver, extractEmojiGraphemes, normalizeEmojiKey } from "./dreamEmojiResolve";

const data = {
  emojis: {
    snake: { id: "snake", name: "Snake", skins: [{ native: "🐍" }] },
    fearful_face: { id: "fearful_face", name: "Fearful Face", skins: [{ native: "😨" }] },
    lotus: { id: "lotus", name: "Lotus", skins: [{ native: "🪷" }] },
    "flag-il": { id: "flag-il", name: "Israel Flag", skins: [{ native: "🇮🇱" }] },
    wave: { id: "wave", name: "Waving Hand", skins: [{ native: "👋" }, { native: "👋🏽" }] },
    heart: { id: "heart", name: "Red Heart", skins: [{ native: "❤️" }] },
  },
};

test("resolves plain emojis and drops unknown / flags", () => {
  const r = createEmojiResolver(data);
  assert.deepEqual(r.resolve("🐍"), { native: "🐍", id: "snake", name: "Snake" });
  assert.equal(r.resolve("🇮🇱"), null);
  assert.equal(r.resolve("🦄"), null);
  assert.equal(r.resolve("snake"), null);
});

test("skin tones and variation selectors map to the base emoji", () => {
  const r = createEmojiResolver(data);
  assert.equal(r.resolve("👋🏽")?.id, "wave");
  assert.equal(r.resolve("❤")?.id, "heart");
  assert.equal(r.resolve("❤️")?.native, "❤️");
});

test("resolveMany splits text, dedupes and caps", () => {
  const r = createEmojiResolver(data);
  const got = r.resolveMany(["🐍 😨", "🐍", "🪷🦄", "👋"], 3);
  assert.deepEqual(
    got.map((e) => e.id),
    ["snake", "fearful_face", "lotus"]
  );
  assert.deepEqual(r.resolveMany("no emoji here"), []);
  assert.deepEqual(r.resolveMany(null), []);
});

test("extractEmojiGraphemes ignores letters and keeps sequences", () => {
  assert.deepEqual(extractEmojiGraphemes("a 🐍 b 👋🏽"), ["🐍", "👋🏽"]);
  assert.equal(normalizeEmojiKey("👋🏽"), "👋");
});
