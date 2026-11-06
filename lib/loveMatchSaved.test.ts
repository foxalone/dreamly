import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { loveMatchCanonical, parseAiLoveMatch } from "./loveMatchAi";
import { forgetSavedLoveMatch, loveMatchInitial, markSavedLoveMatchInAccount, readSavedLoveMatch, removeSavedLoveMatch, writeSavedLoveMatch } from "./loveMatchSaved";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => memory.set(name, value),
    removeItem: (name: string) => memory.delete(name),
  },
});

const input = {
  locale: "en" as const, you: "Ada", them: "Max", firstBirthday: "1992-05-10", secondBirthday: "1991-11-20",
  firstGender: "woman" as const, secondGender: "man" as const, firstStory: "", secondStory: "", status: "curious" as const,
};
const match = parseAiLoveMatch(JSON.stringify({
  scores: { emotional: 70, communication: 80, romance: 60, trust: 90, longTerm: 50, values: 70 },
  summary: "A reading", strength: "A strength", growth: "A topic", reflection: "A question",
}))!;

test("uses the first letter of each name", () => {
  assert.equal(loveMatchInitial("  ada "), "A");
  assert.equal(loveMatchInitial("אנה"), "א");
  assert.equal(loveMatchInitial("   "), "•");
});

test("forgets the device copy when that profile pair is deleted", async () => {
  memory.clear();
  writeSavedLoveMatch("user-a", { input, match, accountSaved: true });
  const id = createHash("sha256").update(loveMatchCanonical(input)).digest("hex");
  await forgetSavedLoveMatch("user-a", id);
  assert.equal(readSavedLoveMatch("user-a"), null);
  writeSavedLoveMatch("user-a", { input, match, accountSaved: true });
  await forgetSavedLoveMatch("user-a", "a".repeat(64));
  assert.equal(readSavedLoveMatch("user-a")?.input.you, "Ada");
});

test("separates guest and account copies on a shared device", () => {
  memory.clear();
  memory.set("dreamly.loveMatchSaved", JSON.stringify({ input, match, accountSaved: false }));
  assert.equal(readSavedLoveMatch("user-b"), null);
  assert.equal(memory.has("dreamly.loveMatchSaved"), false);
  assert.equal(writeSavedLoveMatch(null, { input, match, accountSaved: false }), true);
  assert.equal(readSavedLoveMatch("user-a"), null);
  assert.equal(readSavedLoveMatch("user-b"), null);
  assert.equal(readSavedLoveMatch(null)?.accountSaved, false);
  writeSavedLoveMatch("user-a", { input, match, accountSaved: false });
  markSavedLoveMatchInAccount("user-a", { ...input, firstPhoto: null });
  assert.equal(readSavedLoveMatch("user-a")?.accountSaved, true);
  assert.equal(readSavedLoveMatch("user-b"), null);
  markSavedLoveMatchInAccount("user-a", { ...input, you: "Other" });
  assert.equal(readSavedLoveMatch("user-a")?.input.you, "Ada");
  removeSavedLoveMatch(null, input);
  assert.equal(readSavedLoveMatch(null), null);
  assert.equal(readSavedLoveMatch("user-a")?.input.you, "Ada");
});
