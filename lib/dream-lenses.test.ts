import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DREAM_LENS,
  dreamLensPrompt,
  isDreamLens,
  parseDreamLens,
} from "./dream-lenses";

test("accepts known interpretation lenses and rejects anything else", () => {
  assert.equal(isDreamLens("islamic"), true);
  assert.equal(isDreamLens("biblical"), true);
  assert.equal(isDreamLens("Spiritual"), false);
  assert.equal(parseDreamLens("hindu"), "hindu");
  assert.equal(parseDreamLens("nope"), DEFAULT_DREAM_LENS);
  assert.equal(parseDreamLens(null), DEFAULT_DREAM_LENS);
});

test("every lens has a prompt that forbids prophecy-style certainty", () => {
  const prompt = dreamLensPrompt("islamic");
  assert.match(prompt, /ta'bir|Islamic/i);
  assert.match(dreamLensPrompt("biblical"), /biblical/i);
  assert.ok(!dreamLensPrompt("psychological").includes("prophecy"));
});
