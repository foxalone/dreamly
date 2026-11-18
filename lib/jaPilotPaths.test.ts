import assert from "node:assert/strict";
import test from "node:test";
import { analysisAdReturnPath } from "./adUnlock";
import { getDreamEntry } from "./dream-dictionary";
import { languageAlternates } from "./i18n/path";
import { JA_WEB_DREAM_ARTICLES } from "./jaDreamArticles";
import { JA_PILOT_SLUGS, JA_WEB_DREAM_SLUGS, jaPilotAlternate } from "./jaPilotPaths";
import { listPublicPages, SITE_ORIGIN } from "./publicPages";

test("the Japanese sitemap and alternates include only published translations", () => {
  const paths = ["/", "/dreams", ...JA_WEB_DREAM_SLUGS.map((slug) => `/dreams/${slug}`)];
  const urls = paths.map((path) => {
    const expected = SITE_ORIGIN + (path === "/" ? "/ja" : `/ja${path}`);
    assert.equal(languageAlternates(path).ja, expected);
    assert.equal(languageAlternates(path).en, SITE_ORIGIN + path);
    return expected;
  });
  const listed = listPublicPages().map(({ url }) => url);
  for (const url of urls) assert.ok(listed.includes(url));
  assert.ok(listed.includes(`${SITE_ORIGIN}/ja/pricing`));
  assert.ok(listed.includes(`${SITE_ORIGIN}/ja/tarot/cards/star`));
  assert.ok(!listed.includes(`${SITE_ORIGIN}/ja/dreams/kittens`));
  assert.equal(languageAlternates("/dreams/kittens").ja, undefined);
  assert.equal(jaPilotAlternate("/app/dreams"), undefined);
  assert.equal(new Set(JA_WEB_DREAM_SLUGS).size, JA_WEB_DREAM_SLUGS.length);
  assert.deepEqual(Object.keys(JA_WEB_DREAM_ARTICLES).sort(), [...JA_WEB_DREAM_SLUGS].sort());
  assert.equal(JA_PILOT_SLUGS.length, 10);
  for (const slug of JA_WEB_DREAM_SLUGS) {
    assert.equal(getDreamEntry(slug)?.canonicalSlug, slug);
    assert.ok(JA_WEB_DREAM_ARTICLES[slug].scenes.length > 1);
  }
});

test("ad analysis can return to a published Japanese form only", () => {
  assert.equal(analysisAdReturnPath("/ja"), "/ja/app/dreams");
  assert.equal(analysisAdReturnPath("/ja/dreams/tsunami"), "/ja/dreams/tsunami");
  assert.equal(analysisAdReturnPath("/ja/dreams"), "/ja/app/dreams");
  assert.equal(analysisAdReturnPath("/ja/dreams/cat"), "/ja/dreams/cat");
  assert.equal(analysisAdReturnPath("/ja/dreams/kittens"), "/ja/app/dreams");
  assert.equal(analysisAdReturnPath("//example.com/ja"), "/app/dreams");
  assert.equal(analysisAdReturnPath("/es/dreams/snake"), "/es/app/dreams");
});
