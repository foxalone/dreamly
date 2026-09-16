import assert from "node:assert/strict";
import test from "node:test";

import { DREAM_DICTIONARY } from "./dream-dictionary";
import { DREAM_GUIDES, GUIDES_FOR_SYMBOL, getDreamGuide } from "./dream-guides";
import { guideTextLinks, guideTextPlain, isKnownGuideHref, parseGuideText } from "./guideLinks";
import { GUIDES_AR } from "./i18n/guides/ar";
import { GUIDES_DE } from "./i18n/guides/de";
import { GUIDES_ES } from "./i18n/guides/es";
import { GUIDES_PT } from "./i18n/guides/pt";
import { GUIDES_RU } from "./i18n/guides/ru";
import type { GuideL10n } from "./i18n/guides/types";

const LOCALIZED: Record<string, Record<string, GuideL10n>> = {
  es: GUIDES_ES,
  ar: GUIDES_AR,
  pt: GUIDES_PT,
  de: GUIDES_DE,
  ru: GUIDES_RU,
};

test("splits prose into text and internal links", () => {
  assert.deepEqual(parseGuideText("See [lucid dreams](/dreams/lucid-dreams) first."), [
    { kind: "text", text: "See " },
    { kind: "link", text: "lucid dreams", href: "/dreams/lucid-dreams" },
    { kind: "text", text: " first." },
  ]);
});

test("leaves prose without link markup untouched", () => {
  const plain = "A night that refuses to archive itself [sic] (really).";
  assert.deepEqual(parseGuideText(plain), [{ kind: "text", text: plain }]);
  assert.equal(guideTextPlain(plain), plain);
});

test("ignores external or relative targets", () => {
  const value = "[site](https://example.com) and [rel](dreams/snake)";
  assert.deepEqual(parseGuideText(value), [{ kind: "text", text: value }]);
});

test("reduces link markup to its label", () => {
  assert.equal(guideTextPlain("Read [сонный паралич](/dreams/sleep-paralysis)."), "Read сонный паралич.");
});

test("knows dictionary entries, guides, and hubs", () => {
  assert.equal(isKnownGuideHref("/dreams/snake"), true);
  assert.equal(isKnownGuideHref("/dreams/rem-sleep"), true);
  assert.equal(isKnownGuideHref("/dreams/nightmares"), true);
  assert.equal(isKnownGuideHref("/dreams/not-a-page"), false);
  assert.equal(isKnownGuideHref("/es/dreams/snake"), false);
});

function guideProse(guide: { intro: string[]; sections: { paragraphs: string[] }[]; faqs: { answer: string }[] }) {
  return [...guide.intro, ...guide.sections.flatMap((section) => section.paragraphs), ...guide.faqs.map((faq) => faq.answer)];
}

test("every guide link in every locale points at a real page", () => {
  const sources: [string, { intro: string[]; sections: { paragraphs: string[] }[]; faqs: { answer: string }[] }][] = [
    ...DREAM_GUIDES.map((guide) => [`en/${guide.slug}`, guide] as [string, typeof guide]),
    ...Object.entries(LOCALIZED).flatMap(([locale, guides]) =>
      Object.entries(guides).map(([slug, guide]) => [`${locale}/${slug}`, guide] as [string, GuideL10n]),
    ),
  ];
  for (const [where, guide] of sources) {
    for (const text of guideProse(guide)) {
      for (const href of guideTextLinks(text)) {
        assert.ok(isKnownGuideHref(href), `${where} links to unknown ${href}`);
      }
    }
  }
});

test("every guide has a native article with the same shape in every locale", () => {
  for (const guide of DREAM_GUIDES) {
    for (const [locale, guides] of Object.entries(LOCALIZED)) {
      const l10n = guides[guide.slug];
      assert.ok(l10n, `${locale} is missing ${guide.slug}`);
      assert.equal(l10n.sections.length, guide.sections.length, `${locale}/${guide.slug} section count`);
      assert.equal(l10n.faqs.length, guide.faqs.length, `${locale}/${guide.slug} FAQ count`);
    }
  }
});

test("guide cross-links reference real symbols and guides", () => {
  for (const guide of DREAM_GUIDES) {
    for (const slug of guide.relatedSymbolSlugs) {
      assert.ok(DREAM_DICTIONARY[slug], `${guide.slug} relates to unknown symbol ${slug}`);
    }
    assert.equal(DREAM_DICTIONARY[guide.slug], undefined, `${guide.slug} collides with a dictionary slug`);
  }
  for (const [symbol, slugs] of Object.entries(GUIDES_FOR_SYMBOL)) {
    assert.ok(DREAM_DICTIONARY[symbol], `GUIDES_FOR_SYMBOL has unknown symbol ${symbol}`);
    for (const slug of slugs) assert.ok(getDreamGuide(slug), `${symbol} lists unknown guide ${slug}`);
    assert.equal(new Set(slugs).size, slugs.length, `${symbol} lists a guide twice`);
  }
});
