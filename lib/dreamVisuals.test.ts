import test from "node:test";
import assert from "node:assert/strict";
import {
  desiredCountsFromText,
  filterIconsWithGlyph,
  normalizeForIconsEn,
  pickEmojisByKeywords,
} from "./dreamVisuals";

test("desiredCountsFromText scales with length and keeps minimums", () => {
  assert.deepEqual(desiredCountsFromText(""), { roots: 2, emojis: 1, icons: 1 });
  const long = Array.from({ length: 60 }, () => "word").join(" ");
  assert.deepEqual(desiredCountsFromText(long), { roots: 3, emojis: 3, icons: 2 });
});

test("normalizeForIconsEn lowercases and singularizes", () => {
  assert.equal(normalizeForIconsEn("Swords, Necks & Children"), "sword neck child");
});

test("filterIconsWithGlyph drops keys without a glyph and caps", () => {
  const table = { a: { emoji: "🅰" }, b: {}, c: { native: "©" }, d: { emoji: "d" } };
  assert.deepEqual(filterIconsWithGlyph(["a", "b", "c", "d"], table, 2), ["a", "c"]);
});

test("pickEmojisByKeywords maps roots to emojis without repeats or flags", () => {
  const data = {
    emojis: {
      dagger_knife: { id: "dagger_knife", name: "Dagger", keywords: ["sword", "weapon"], skins: [{ native: "🗡️" }] },
      sky: { id: "sky", name: "Sky", keywords: [], skins: [{ native: "🌌" }] },
      "flag-sky": { id: "flag-sky", name: "Flag Sky", keywords: ["sky"], skins: [{ native: "🏳" }] },
      ghost: { id: "ghost", name: "Ghost", keywords: ["soul", "spirit"], skins: [{ native: "👻" }] },
    },
  };
  const out = pickEmojisByKeywords(["swords", "sky", "soul", "sword"], data, 4);
  assert.deepEqual(out.map((e) => e.native), ["🗡️", "🌌", "👻"]);
});
