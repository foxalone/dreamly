import test from "node:test";
import assert from "node:assert/strict";
import { ESCAPE_MAX, addEscape, canGrantEscape, escapeDayKey, escapeTotal } from "./game/escape";

test("escapeTotal counts matched slugs and nameless extras", () => {
  assert.equal(escapeTotal(null), 0);
  assert.equal(escapeTotal({ slugs: ["fox", "snake"], extra: 1, emojis: ["🦊", "🐍", "🖊️"], at: 0 }), 3);
});

test("addEscape keeps exactly the dream's icons, capped at the pick size", () => {
  const next = addEscape(null, [
    { slug: "fox", native: "🦊" },
    { slug: null, native: "🖊️" },
    { slug: "snake", native: "🐍" },
    { slug: "owl", native: "🦉" },
    { slug: "dog", native: "🐶" }, // beyond ESCAPE_MAX — dropped
  ], 123);
  assert.ok(next);
  assert.equal(escapeTotal(next), ESCAPE_MAX);
  assert.deepEqual(next!.slugs, ["fox", "snake", "owl"]);
  assert.equal(next!.extra, 1);
  assert.deepEqual(next!.emojis, ["🦊", "🖊️", "🐍", "🦉"]);
  assert.equal(next!.at, 123);
});

test("addEscape preserves rewards from repeated ad-paid readings", () => {
  const prev = { slugs: ["fox", "snake", "owl"], extra: 1, emojis: ["🦊", "🐍", "🦉", "🖊️"], at: 1 };
  const next = addEscape(prev, [
    { slug: "dog", native: "🐶" },
    { slug: "cat", native: "🐱" },
    { slug: null, native: "📕" },
    { slug: "frog", native: "🐸" },
  ], 2);
  assert.equal(escapeTotal(next), 8);
  assert.deepEqual(next!.slugs, ["fox", "snake", "owl", "dog", "cat", "frog"]);
  assert.equal(next!.extra, 2);
  const third = addEscape(next, [{ slug: "fox", native: "🦊" }], 3);
  assert.equal(escapeTotal(third), 9);
  assert.deepEqual(third!.emojis.at(-1), "🦊");
  // prev is never mutated
  assert.equal(escapeTotal(prev), 4);
});

test("addEscape with nothing valid leaves the state alone", () => {
  const prev = { slugs: ["fox"], extra: 0, emojis: ["🦊"], at: 1 };
  assert.equal(addEscape(prev, [], 2), prev);
  assert.equal(addEscape(null, [{ slug: "fox", native: "" }], 2), null);
});

test("escapeDayKey is a UTC date", () => {
  assert.equal(escapeDayKey(Date.UTC(2026, 9, 10, 23, 59)), "2026-10-10");
  assert.equal(escapeDayKey(Date.UTC(2026, 9, 11, 0, 1)), "2026-10-11");
});

test("ad-paid readings grant on every use without consuming the free daily escape", () => {
  const today = Date.UTC(2026, 9, 10, 12);
  assert.equal(canGrantEscape("2026-10-10", today, false), false);
  assert.equal(canGrantEscape("2026-10-10", today, true), true);
  assert.equal(canGrantEscape(null, today, true), true);
  assert.equal(canGrantEscape(null, today, false), true);
});
