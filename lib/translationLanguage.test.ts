import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTranslationLanguage, resolveTranslationLanguage } from "./translationLanguage";

test("explicit account preference overrides browser language", () => {
  assert.equal(resolveTranslationLanguage("ru", ["he-IL", "en"]), "ru");
  assert.equal(resolveTranslationLanguage("pt", ["de-DE"]), "pt");
});

test("browser default supports regional tags, Hebrew alias, and language priorities", () => {
  for (const [input, expected] of [["en-US", "en"], ["es-MX", "es"], ["ar-SA", "ar"], ["pt-BR", "pt"], ["de-DE", "de"], ["ru-RU", "ru"], ["iw-IL", "he"]]) {
    assert.equal(resolveTranslationLanguage(null, [input]), expected);
  }
  assert.equal(resolveTranslationLanguage(null, ["ja-JP", "de-DE", "en-US"]), "de");
  assert.equal(resolveTranslationLanguage(null, ["ja-JP"]), "en");
  assert.equal(resolveTranslationLanguage(undefined, []), "en");
});

test("invalid stored preferences fall back safely; unsupported API targets are rejected", () => {
  for (const value of ["invalid", "constructor", "__proto__", {}, null, 42]) {
    assert.equal(normalizeTranslationLanguage(value), null);
    assert.equal(resolveTranslationLanguage(value, ["es-AR"]), "es");
  }
});
