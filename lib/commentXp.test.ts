import assert from "node:assert/strict";
import test from "node:test";
import { commentXpReceiptId, parseCommentXp } from "./commentXp";

test("irrelevant comments receive 1 XP and good, relevant comments receive 10", () => {
  assert.equal(parseCommentXp({ related: false, goodAndRelevant: false, xp: 4 }), 1);
  assert.equal(parseCommentXp({ related: true, goodAndRelevant: true, xp: 8 }), 10);
  assert.equal(parseCommentXp({ related: false, goodAndRelevant: true, xp: 7 }), 10);
  assert.equal(parseCommentXp({ related: true, goodAndRelevant: false, xp: 6 }), 6);
});

test("invalid or missing assessments never award XP", () => {
  assert.throws(() => parseCommentXp({ related: true, xp: 10 }));
  assert.throws(() => parseCommentXp({ related: true, goodAndRelevant: false, xp: 11 }));
});

test("repeating the same comment targets the same receipt", () => {
  const id = commentXpReceiptId("alice", "dream-a", "A useful thought");
  assert.equal(id, commentXpReceiptId("alice", "dream-a", "A useful thought"));
  assert.notEqual(id, commentXpReceiptId("alice", "dream-b", "A useful thought"));
  assert.notEqual(id, commentXpReceiptId("bob", "dream-a", "A useful thought"));
});
