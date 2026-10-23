import assert from "node:assert/strict";
import test from "node:test";
import { pickRandomDreams, publicDreamCards } from "./randomDreams";

test("homepage cards exclude removed dreams, stories, duplicate copies and author metadata", () => {
  const cards = publicDreamCards([
    { id: "older", data: { ownerDreamId: "d1", text: "Old copy", sharedAtMs: 1 } },
    { id: "latest", data: { ownerDreamId: "d1", text: "Public dream", sharedAtMs: 2, emojis: [{ native: "🌊" }], authorEmail: "private@example.test", ownerUid: "private-uid", analysisText: "Full analysis" } },
    { id: "deleted", data: { text: "Deleted", deleted: true } },
    { id: "story", data: { text: "Story", sourceType: "story" } },
    { id: "legacy-story", data: { text: "Story", ownerStoryId: "s1" } },
    { id: "shell", data: { text: "  " } },
  ]);
  assert.deepEqual(cards, [{ id: "latest", snippet: "Public dream", emojis: ["🌊"] }]);
});

test("snippets preserve Unicode characters and cap text and icons", () => {
  const [card] = publicDreamCards([{ id: "a", data: { text: "🦋".repeat(200), emojis: ["🌊", "🌳", "🦋", "🐈"] } }]);
  assert.equal(card.snippet, "🦋".repeat(180) + "…");
  assert.equal(card.emojis.length, 3);
});

test("random rows draw without replacement, can vary per visit and preserve the cached pool", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const first = pickRandomDreams(pool, 3, () => 0);
  const second = pickRandomDreams(pool, 3, () => .999);
  assert.notDeepEqual(first, second);
  assert.equal(new Set(first).size, 3);
  assert.deepEqual(pool, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(pickRandomDreams([], 3), []);
  assert.deepEqual(pickRandomDreams(["a"], 3), ["a"]);
});
