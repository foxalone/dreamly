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
    assert.match(messages[0].content, /Do not announce or label the language in the response/);
    assert.equal(messages.length, 2);
    assert.equal(messages[1].content, `Dream text:\n${text}`);
  }
});

test("supported locale remains a fallback for language-free dream text", () => {
  const messages = dreamAnalysisMessages("🌧️ 🪟", "es", "psychological");
  assert.match(messages[0].content, /website language is Spanish; use it only if the dream text has no identifiable language/);
});

test("Japanese dreams without spaces still get the appropriate response length", () => {
  const brief = dreamAnalysisMessages("白い蛇がいた。", "ja", "psychological");
  assert.match(brief[0].content, /website language is Japanese/);
  assert.match(brief[0].content, /exactly two short sentences/);

  const longDream = "昔住んでいた家の庭で、友人と夜空を見上げていた。すると見知らぬ子どもが現れ、庭の奥へ向かって走り出した。追いかけようとしたけれど、足が重くて動かず、遠くから笑い声だけが聞こえた。";
  for (const locale of ["ja", "en"]) {
    const messages = dreamAnalysisMessages(longDream, locale, "psychological");
    assert.match(messages[0].content, /Write 1–2 short paragraphs/);
  }
});
