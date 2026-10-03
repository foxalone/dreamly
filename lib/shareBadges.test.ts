import assert from "node:assert/strict";
import test from "node:test";

import {
  checkShareableDreamText,
  isShareBadgeId,
  nextShareBadge,
  shareBadgeFor,
  shareBadgeLevelUp,
} from "./shareBadges";

test("shareBadgeFor maps counts to the creature scale", () => {
  const at = (n: unknown) => shareBadgeFor(n).id;
  assert.equal(at(0), "dreamer");
  assert.equal(at(-3), "dreamer");
  assert.equal(at("x"), "dreamer");
  assert.equal(at(1), "unicorn");
  assert.equal(at(2), "wizard");
  assert.equal(at(5), "wizard");
  assert.equal(at(6), "siren");
  assert.equal(at(10), "siren");
  assert.equal(at(11), "phoenix");
  assert.equal(at(25), "phoenix");
  assert.equal(at(26), "dragon");
  assert.equal(at(50), "dragon");
  assert.equal(at(51), "oneiros");
  assert.equal(at(5000), "oneiros");
});

test("nextShareBadge tells how many shares are left", () => {
  assert.deepEqual(
    { id: nextShareBadge(0)?.badge.id, n: nextShareBadge(0)?.remaining },
    { id: "unicorn", n: 1 }
  );
  assert.deepEqual(
    { id: nextShareBadge(3)?.badge.id, n: nextShareBadge(3)?.remaining },
    { id: "siren", n: 3 }
  );
  assert.equal(nextShareBadge(51), null);
});

test("shareBadgeLevelUp fires only when the level changes", () => {
  assert.equal(shareBadgeLevelUp(0, 1)?.id, "unicorn");
  assert.equal(shareBadgeLevelUp(1, 2)?.id, "wizard");
  assert.equal(shareBadgeLevelUp(2, 3), null);
  assert.equal(shareBadgeLevelUp(5, 6)?.id, "siren");
  assert.equal(shareBadgeLevelUp(6, 5), null);
});

test("isShareBadgeId", () => {
  assert.equal(isShareBadgeId("wizard"), true);
  assert.equal(isShareBadgeId("goblin"), false);
});

test("checkShareableDreamText keeps out links, contacts and mashing", () => {
  const ok = "I was flying over a city made of glass and my brother waved";
  assert.deepEqual(checkShareableDreamText(ok, 250), { ok: true });
  assert.deepEqual(checkShareableDreamText("Мне снилось, что я лечу над стеклянным городом", 250), { ok: true });
  assert.equal(checkShareableDreamText("short", 250).ok, false);
  assert.deepEqual(checkShareableDreamText("x".repeat(30) + " dream", 20), { ok: false, reason: "too_long" });
  assert.deepEqual(checkShareableDreamText("I dreamed of money, visit https://spam.example now", 250), { ok: false, reason: "link" });
  assert.deepEqual(checkShareableDreamText("I dreamed of money, buy at cheapcoins.xyz today", 250), { ok: false, reason: "link" });
  assert.deepEqual(checkShareableDreamText("I dreamed of you, write me at a.b@mail.com please", 250), { ok: false, reason: "contact" });
  assert.deepEqual(checkShareableDreamText("I dreamed of you, call me +1 555 123 4567 tonight", 250), { ok: false, reason: "contact" });
  assert.deepEqual(checkShareableDreamText("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 250), { ok: false, reason: "spam" });
  assert.deepEqual(checkShareableDreamText("!!!! ???? .... ,,,, dream ;;;; ----", 250), { ok: false, reason: "spam" });
});
