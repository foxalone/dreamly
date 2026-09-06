import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DREAM_LENS,
  dictionarySectionForLens,
  dictionarySnippetForLens,
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

test("maps extra faith styles onto the closest dictionary section", () => {
  assert.equal(dictionarySectionForLens("hindu"), "spiritual");
  assert.equal(dictionarySectionForLens("islamic"), "islamic");
  assert.equal(
    dictionarySnippetForLens(
      {
        shortMeaning: "fallback",
        sections: { islamic: ["A snake may point to an enemy."], introduction: ["A snake marks change."] },
      },
      "islamic",
    ),
    "A snake may point to an enemy.",
  );
});
