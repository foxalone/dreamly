import assert from "node:assert/strict";
import test from "node:test";
import { dreamAnalysisMessages } from "./dreamAnalysisPrompt";

test("dream language takes priority over the website locale, including unsupported languages", () => {
  for (const text of [
    "Zdálo se mi o zrcadle a staré známé.",
    "Álmomban egy régi ismerősöm beszélt hozzám.",
    "Śniła mi się rozmowa z dawną znajomą.",
  ]) {
    const messages = dreamAnalysisMessages(text, "en", "psychological");
    assert.match(messages[0].content, /dominant natural language of the dream text/);
    assert.match(messages[0].content, /website language is English; use it only if the dream text has no identifiable language/);
    assert.equal(messages.length, 2);
    assert.equal(messages[1].content, `Dream text:\n${text}`);
  }
});

test("supported locale remains a fallback for language-free dream text", () => {
  const messages = dreamAnalysisMessages("🌧️ 🪟", "es", "psychological");
  assert.match(messages[0].content, /website language is Spanish; use it only if the dream text has no identifiable language/);
});
