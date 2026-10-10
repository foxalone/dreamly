import test from "node:test";
import assert from "node:assert/strict";
import { localizedSeoDescription } from "./i18n/templates";

import type { Locale } from "./i18n/config";

const LOCALES: Locale[] = ["es", "pt", "de", "ru", "ar"];
const MAX = 170;

const LONG_HOOK = [
  "instinct and loyalty",
  "attachment that outlives distance",
  "trust rebuilt after disappointment",
  "alertness to threat",
  "reactions that arrive before reasoning",
  "the longing for steady companionship",
].join(", ");

test("short meanings pass through untouched", () => {
  for (const locale of LOCALES) {
    const out = localizedSeoDescription(locale, "perro", "lealtad y confianza");
    assert.ok(out.length <= MAX, `${locale}: ${out.length}`);
    assert.ok(!out.endsWith("…"), `${locale} should not be clipped: ${out}`);
  }
});

test("long comma-separated meanings drop themes instead of clipping mid-word", () => {
  for (const locale of LOCALES) {
    const out = localizedSeoDescription(locale, "golden retriever puppy", LONG_HOOK);
    assert.ok(out.length <= MAX, `${locale}: ${out.length} chars`);
    assert.ok(!out.includes("…"), `${locale} should stay a complete sentence: ${out}`);
    assert.ok(/[.!]$/.test(out), `${locale} should end the sentence: ${out}`);
  }
});

test("kept prefix of the hook survives verbatim", () => {
  const out = localizedSeoDescription("es", "perro", LONG_HOOK);
  assert.ok(out.includes("instinct and loyalty"), out);
});

test("meanings without separators clip at a word boundary", () => {
  const hook = Array(30).fill("wanderlust").join(" ");
  for (const locale of LOCALES) {
    const out = localizedSeoDescription(locale, "viaje", hook);
    assert.ok(out.length <= MAX, `${locale}: ${out.length}`);
    if (out.endsWith("…")) {
      assert.match(out, /(^|[\s(])wanderlust…$/u, `${locale} clipped mid-word: …${out.slice(-30)}`);
    }
  }
});

test("trailing conjunction is not left dangling after a drop", () => {
  const hook = "сила, влечение и " + "очень длинное продолжение темы ".repeat(6);
  const out = localizedSeoDescription("ru", "лошадь", hook, "К чему снится лошадь");
  assert.ok(out.length <= MAX, String(out.length));
  assert.ok(!/\s(и|y|e|und|and|و)[.…]/u.test(out), out);
});
