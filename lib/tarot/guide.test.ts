import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES } from "../i18n/config";
import { MAJOR_ARCANA, tarotCopy } from "./deck";
import { tarotGuideCopy, tarotGuideCueCount, tarotGuideQuestionCount, tarotReflectionQuestion, tarotSymbolCue } from "./guide";
import { tarotReadings } from "./readings";
import { listPublicPages } from "../publicPages";

test("all 22 Major Arcana explanations are complete in every supported language", () => {
  assert.equal(MAJOR_ARCANA.length, 22);
  for (const locale of LOCALES) {
    assert.equal(tarotGuideCueCount(locale), 22, `${locale} symbolism count`);
    assert.equal(tarotGuideQuestionCount(locale), 22, `${locale} question count`);
    const cues = new Set<string>();
    const questions = new Set<string>();
    for (const card of MAJOR_ARCANA) {
      assert.ok(tarotCopy[locale].cards[card.id], `${locale} ${card.id} name`);
      assert.ok(tarotGuideCopy[locale].cardTitle(tarotCopy[locale].cards[card.id]), `${locale} ${card.id} title`);
      assert.equal(tarotReadings[locale][card.id].length, 5, `${locale} ${card.id} reading sections`);
      for (const passage of tarotReadings[locale][card.id]) assert.ok(passage.length > 20, `${locale} ${card.id} passage`);
      const cue = tarotSymbolCue(locale, card.id);
      const question = tarotReflectionQuestion(locale, card.id);
      assert.ok(cue.length > 20 && question.length > 15, `${locale} ${card.id} context`);
      cues.add(cue);
      questions.add(question);
    }
    assert.equal(cues.size, 22, `${locale} distinct symbolism notes`);
    assert.equal(questions.size, 22, `${locale} distinct questions`);
  }
});

test("the sitemap includes each tarot hub and card in all six locales", () => {
  const urls = listPublicPages().map(page => page.url).filter(url => /\/tarot(?:\/|$)/.test(url));
  assert.equal(urls.length, 23 * LOCALES.length);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes("https://dreamly.art/tarot/cards/world"));
  assert.ok(urls.includes("https://dreamly.art/ar/tarot/cards/world"));
  assert.ok(urls.every(url => !url.includes("/en/")));
});
