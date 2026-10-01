import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySymbolClickSource,
  splitLocalePath,
  symbolClickDayKeys,
  symbolSlugFromPath,
} from "./symbolClicks";

const SYMBOLS = new Set(["snake", "snake-bite", "pope-blessing"]);
const GUIDES = new Set(["lucid-dreams"]);
const opts = {
  isSymbol: (s: string) => SYMBOLS.has(s),
  isGuide: (s: string) => GUIDES.has(s),
};

test("splitLocalePath strips locale prefix and trailing slash", () => {
  assert.deepEqual(splitLocalePath("/ru/dreams/snake/"), { locale: "ru", path: "/dreams/snake" });
  assert.deepEqual(splitLocalePath("/dreams?q=x"), { locale: "en", path: "/dreams" });
  assert.deepEqual(splitLocalePath("/ru"), { locale: "ru", path: "/" });
  assert.deepEqual(splitLocalePath("/"), { locale: "en", path: "/" });
  assert.deepEqual(splitLocalePath("/russia"), { locale: "en", path: "/russia" });
});

test("symbolSlugFromPath only accepts /dreams/<slug>", () => {
  assert.equal(symbolSlugFromPath("/dreams/snake"), "snake");
  assert.equal(symbolSlugFromPath("/de/dreams/snake-bite"), "snake-bite");
  assert.equal(symbolSlugFromPath("/dreams"), null);
  assert.equal(symbolSlugFromPath("/dreams/categories/animals"), null);
  assert.equal(symbolSlugFromPath("/app/dreams/abc"), null);
  assert.equal(symbolSlugFromPath("/dreams/Snake"), null);
});

test("classifySymbolClickSource", () => {
  assert.equal(classifySymbolClickSource("/", opts), "home");
  assert.equal(classifySymbolClickSource("/ru", opts), "home");
  assert.equal(classifySymbolClickSource("/dreams", opts), "dictionary");
  assert.equal(classifySymbolClickSource("/dreams", { ...opts, inSearch: true }), "search");
  assert.equal(classifySymbolClickSource("/pt/dreams/snake", opts), "symbol");
  assert.equal(classifySymbolClickSource("/dreams/lucid-dreams", opts), "guide");
  assert.equal(classifySymbolClickSource("/dreams/a-z", opts), "collection");
  assert.equal(classifySymbolClickSource("/dreams/categories/animals", opts), "collection");
  assert.equal(classifySymbolClickSource("/app/shared", opts), "other");
});

test("symbolClickDayKeys returns newest-first UTC days", () => {
  const keys = symbolClickDayKeys(new Date("2026-10-01T05:00:00Z"), 3);
  assert.deepEqual(keys, ["2026-10-01", "2026-09-30", "2026-09-29"]);
  assert.equal(symbolClickDayKeys(new Date(), 500).length, 90);
});
