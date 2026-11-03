import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEscapeNoteCopy, parseDreamAnalysisOutput } from "./escapeNote";

test("analysis language metadata is removed before the interpretation reaches a visitor", () => {
  assert.deepEqual(parseDreamAnalysisOutput("[[dream-language:ru]]\n\nСон показывает тревогу."), {
    analysis: "Сон показывает тревогу.", lang: "ru",
  });
  assert.deepEqual(parseDreamAnalysisOutput("[[dream-language:pt-BR]]\nUm sonho."), {
    analysis: "Um sonho.", lang: "pt",
  });
  assert.deepEqual(parseDreamAnalysisOutput("An ordinary interpretation."), {
    analysis: "An ordinary interpretation.", lang: null,
  });
});

test("an incomplete cached note cannot replace both visitor-facing strings", () => {
  assert.equal(normalizeEscapeNoteCopy({ lead: "Текст", cta: "" }), null);
  assert.deepEqual(normalizeEscapeNoteCopy({ lead: " Существа вышли: ", cta: " Поймай их! " }), {
    lead: "Существа вышли:", cta: "Поймай их!",
  });
});
