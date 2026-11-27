import assert from "node:assert/strict";
import test from "node:test";
import { analysisAdReturnPath } from "./adUnlock";
import { getDreamEntry } from "./dream-dictionary";
import { languageAlternates } from "./i18n/path";
import { JA_WEB_DREAM_ARTICLES } from "./jaDreamArticles";
import { getRelatedJapaneseDreamSlugs } from "./jaDreamRelated";
import { JA_PILOT_SLUGS, JA_WEB_DREAM_SLUGS, jaPilotAlternate } from "./jaPilotPaths";
import { dictionaryUpdatedAt, listPublicPages, SITE_ORIGIN } from "./publicPages";

test("the Japanese sitemap and alternates include only published translations", () => {
  const paths = ["/", "/dreams", ...JA_WEB_DREAM_SLUGS.map((slug) => `/dreams/${slug}`)];
  const urls = paths.map((path) => {
    const expected = SITE_ORIGIN + (path === "/" ? "/ja" : `/ja${path}`);
    assert.equal(languageAlternates(path).ja, expected);
    assert.equal(languageAlternates(path).en, SITE_ORIGIN + path);
    return expected;
  });
  const listed = new Map(listPublicPages().map((page) => [page.url, page]));
  for (const url of urls) assert.ok(listed.has(url));
  assert.ok(listed.has(`${SITE_ORIGIN}/ja/pricing`));
  assert.ok(listed.has(`${SITE_ORIGIN}/ja/tarot/cards/star`));
  assert.ok(!listed.has(`${SITE_ORIGIN}/ja/dreams/big-spider`));
  assert.equal(languageAlternates("/dreams/big-spider").ja, undefined);
  assert.equal(jaPilotAlternate("/app/dreams"), undefined);
  assert.equal(new Set(JA_WEB_DREAM_SLUGS).size, JA_WEB_DREAM_SLUGS.length);
  assert.deepEqual(Object.keys(JA_WEB_DREAM_ARTICLES).sort(), [...JA_WEB_DREAM_SLUGS].sort());
  assert.equal(JA_PILOT_SLUGS.length, 10);
  for (const slug of JA_WEB_DREAM_SLUGS) {
    assert.equal(getDreamEntry(slug)?.canonicalSlug, slug);
    assert.ok(JA_WEB_DREAM_ARTICLES[slug].scenes.length > 1);
    assert.match(listed.get(`${SITE_ORIGIN}/ja/dreams/${slug}`)?.lastModified ?? "", /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the sitemap uses Japanese release dates for translations and the Japanese dictionary", () => {
  const pages = new Map(listPublicPages().map((page) => [page.url, page]));
  const date = (path: string) => pages.get(SITE_ORIGIN + path)?.lastModified;

  assert.equal(date("/ja/dreams/flying-over-water"), "2026-11-27");
  assert.equal(date("/ja/dreams/cat"), "2026-11-17");
  assert.ok(date("/ja/dreams")! >= date("/ja/dreams/flying-over-water")!);
  assert.equal(date("/dreams/flying-over-water"), getDreamEntry("flying-over-water")?.updatedAt);
  assert.equal(date("/dreams"), dictionaryUpdatedAt());
});

test("Japanese articles link directly to recent translated variations of the same topic", () => {
  assert.deepEqual(getRelatedJapaneseDreamSlugs("being-chased", 4), [
    "chased-by-man",
    "chased-by-animal",
    "chased-by-monster",
    "hiding-from-someone",
  ]);
  assert.ok(getRelatedJapaneseDreamSlugs("school", 6).includes("failing-at-school"));
  assert.ok(getRelatedJapaneseDreamSlugs("airport", 6).includes("cancelled-flight"));
  assert.equal(getRelatedJapaneseDreamSlugs("flying-over-water", 6)[0], "flying");

  const published = new Set(JA_WEB_DREAM_SLUGS);
  for (const slug of published) {
    const related = getRelatedJapaneseDreamSlugs(slug, 6);
    assert.ok(related.length > 0 && related.length <= 6, slug);
    assert.equal(new Set(related).size, related.length, slug);
    assert.ok(related.every((target) => target !== slug && published.has(target)), slug);
  }
});

test("ad analysis can return to a published Japanese form only", () => {
  assert.equal(analysisAdReturnPath("/ja"), "/ja/app/dreams");
  assert.equal(analysisAdReturnPath("/ja/dreams/tsunami"), "/ja/dreams/tsunami");
  assert.equal(analysisAdReturnPath("/ja/dreams"), "/ja/app/dreams");
  assert.equal(analysisAdReturnPath("/ja/dreams/cat"), "/ja/dreams/cat");
  assert.equal(analysisAdReturnPath("/ja/dreams/big-spider"), "/ja/app/dreams");
  assert.equal(analysisAdReturnPath("//example.com/ja"), "/app/dreams");
  assert.equal(analysisAdReturnPath("/es/dreams/snake"), "/es/app/dreams");
});
