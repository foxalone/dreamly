import assert from "node:assert/strict";
import test from "node:test";

import { DREAM_MAX_CHARS, DREAM_MAX_WORDS, clampDreamText, countDreamWords, isDreamTooLong } from "./dreamLength";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

test("countDreamWords", () => {
  assert.equal(countDreamWords(""), 0);
  assert.equal(countDreamWords("  a  b\nc\t d "), 4);
  assert.equal(countDreamWords("Мне снился  сон"), 3);
});

test("isDreamTooLong by words and by the char safety cap", () => {
  assert.equal(isDreamTooLong(words(DREAM_MAX_WORDS)), false);
  assert.equal(isDreamTooLong(words(DREAM_MAX_WORDS + 1)), true);
  assert.equal(isDreamTooLong("x".repeat(DREAM_MAX_CHARS + 1)), true);
});

test("clampDreamText keeps text within limits untouched", () => {
  assert.equal(clampDreamText("a dream "), "a dream ");
  assert.equal(clampDreamText("line one\nline two"), "line one\nline two");
});

test("clampDreamText cuts at the last allowed word", () => {
  const out = clampDreamText(words(DREAM_MAX_WORDS + 20));
  assert.equal(countDreamWords(out), DREAM_MAX_WORDS);
  assert.ok(out.endsWith(`w${DREAM_MAX_WORDS - 1}`));
  assert.ok(clampDreamText("y".repeat(DREAM_MAX_CHARS + 50)).length <= DREAM_MAX_CHARS);
});
