import assert from "node:assert/strict";
import { test } from "node:test";
import { browserLocale, suggestedLanguagePath } from "./i18n/browser-language";
import { LOCALES } from "./i18n/config";
import { browserLanguageMessages } from "./i18n/browser-language-messages";

test("browser preferences respect priority and supported regional variants", () => {
  assert.equal(browserLocale(["pt-BR", "en-US"]), "pt");
  assert.equal(browserLocale(["fr-FR", "de-DE", "en"]), "de");
  assert.equal(browserLocale(["RU_ru"]), "ru");
  assert.equal(browserLocale(["he-IL", "zh-CN"]), null);
  assert.equal(browserLocale([]), null);
});

test("suggestions preserve the page and English stays unprefixed", () => {
  assert.equal(suggestedLanguagePath("/dreams/snake", "ru"), "/ru/dreams/snake");
  assert.equal(suggestedLanguagePath("/es/dreams/snake", "en"), "/dreams/snake");
  assert.equal(suggestedLanguagePath("/", "ar"), "/ar");
  assert.equal(suggestedLanguagePath("/pt/app/dreams", "de"), "/de/app/dreams");
  assert.equal(suggestedLanguagePath("/ru/dreams", "ru"), null);
  assert.equal(suggestedLanguagePath("/dreams", null), null);
});

test("administrative routes, APIs and assets never suggest a language", () => {
  for (const path of ["/app/profile/admin-dashboard", "/app/profile/admin-dashboard/users", "/es/app/profile/admin-dashboard", "/api/dreams", "/icon.png", "/_next/static/chunk.js"]) {
    assert.equal(suggestedLanguagePath(path, "ru"), null, path);
  }
});

test("every supported language has complete native suggestion copy", () => {
  for (const locale of LOCALES) {
    const m = browserLanguageMessages[locale];
    assert.ok(m.title && m.action && m.dismiss, locale);
  }
});
