import { test } from "node:test";
import assert from "node:assert/strict";
import { lunarPublicDreams, lunarDreamSummary } from "./publicDreams";

test("resident cards exclude deleted dreams, stories, duplicate shares and author metadata", () => {
  const rows = [
    { id: "old", data: { ownerDreamId: "d1", text: "old copy", sharedAtMs: 1 } },
    { id: "current", data: { ownerDreamId: "d1", text: " Public dream ", sharedAtMs: 5, emojis: [{ native: "🌊" }, { native: "🌊" }], authorEmail: "private@example.test", ownerUid: "secret-uid" } },
    { id: "deleted", data: { text: "gone", deleted: true } },
    { id: "story", data: { text: "story", sourceType: "story" } },
    { id: "legacy-story", data: { text: "story", ownerStoryId: "s1" } },
    { id: "shell", data: { text: " " } },
  ];
  const dreams = lunarPublicDreams(rows);
  assert.deepEqual(dreams, [{ id: "current", text: "Public dream", sharedAtMs: 5, emojis: ["🌊"] }]);
  assert.equal(JSON.stringify(dreams).includes("secret-uid"), false);
  assert.equal(JSON.stringify(dreams).includes("private@example.test"), false);
});

test("card summary chooses the latest public dream and counts each image once per dream", () => {
  const dreams = lunarPublicDreams([
    { id: "a", data: { text: "A", sharedAtMs: 1, emojis: ["🌊", "🏠"] } },
    { id: "b", data: { text: "B".repeat(300), sharedAtMs: 3, emojis: ["🌊", "🌊", "🕊️"] } },
    { id: "c", data: { text: "C", sharedAtMs: 2, emojis: ["🌊"] } },
  ]);
  const summary = lunarDreamSummary(dreams);
  assert.equal(summary.topEmojis[0], "🌊");
  assert.equal(summary.topEmojis.length, 3);
  assert.deepEqual(summary.latest, { id: "b", snippet: "B".repeat(240) + "…" });
  assert.deepEqual(lunarDreamSummary([]), { topEmojis: [], latest: null });
});
