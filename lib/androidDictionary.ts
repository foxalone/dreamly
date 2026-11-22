import { DREAM_CATEGORIES, POPULAR_DREAM_SLUGS, getDreamEntry } from "./dream-dictionary";
import { getAllCategoryCopy, type CategoryCopy } from "./i18n/categories";
import type { DreamCategory } from "./dream-categories";
import type { Locale } from "./i18n/config";
import { getLocalizedEntries } from "./i18n/localize-dictionary";
import { getMessages } from "./i18n/messages";
import { JA_WEB_DREAM_ARTICLES } from "./jaDreamArticles";
import { JA_PILOT_SLUGS, JA_WEB_DREAM_SLUGS } from "./jaPilotPaths";

const japaneseCategories: Record<DreamCategory, CategoryCopy> = {
  animals: { label: "動物", description: "動物との出会いや、身を守るときの気持ち" },
  body: { label: "体と見た目", description: "体の変化や、自分がどう見えるかにまつわる夢" },
  water: { label: "水のある風景", description: "海や川、水の流れが印象に残る夢" },
  "life-events": { label: "暮らしの節目", description: "始まりや別れ、変化を迎えるときの夢" },
  "fear-nightmares": { label: "怖い夢と悪夢", description: "追われる、逃げられないなど、不安が残る夢" },
  places: { label: "場所と建物", description: "家や学校、見知らぬ場所を訪ねる夢" },
  movement: { label: "移動と行き先", description: "飛ぶ、乗り物に乗る、道に迷う夢" },
  objects: { label: "持ち物やお金", description: "鍵や服、お金など、身近な物が出てくる夢" },
  people: { label: "人と人間関係", description: "家族や友人、気になる相手に会う夢" },
  nature: { label: "自然と災害", description: "火事や地震、嵐など、自然の力を感じる夢" },
  spiritual: { label: "不思議なもの", description: "幽霊や伝承の生き物など、日常にはないものが現れる夢" },
};

const japaneseAliases: Record<(typeof JA_PILOT_SLUGS)[number], string[]> = {
  "teeth-falling-out": ["歯", "はがぬける", "歯が抜けた"],
  fire: ["火", "かじ", "炎"],
  earthquake: ["じしん", "揺れる"],
  "dead-person": ["故人", "亡くなった人", "死んだ人"],
  "being-chased": ["追われる", "逃げる"],
  pregnancy: ["妊娠", "にんしん"],
  snake: ["へび", "ヘビ", "白蛇"],
  tsunami: ["つなみ", "大波"],
  "being-late": ["ちこく", "間に合わない"],
  cheating: ["うわき", "不倫", "裏切り"],
};

export function buildAndroidDictionary(locale: Locale) {
  const { dictionary, chrome, symbol } = getMessages(locale);
  const labels = {
    title: dictionary.h1,
    lead: dictionary.lead,
    search: dictionary.searchPlaceholder,
    popular: dictionary.popularSymbols,
    categories: chrome.dreamCategories,
    all: dictionary.aToZ,
    noMatch: chrome.noMatch,
    meaning: chrome.generalMeaning,
    psychological: symbol.psychologicalTitle,
    spiritual: symbol.spiritualTitle,
    islamic: symbol.islamicTitle,
    biblical: symbol.biblicalTitle,
    scenarios: chrome.commonScenarios,
    questions: locale === "ja" ? "振り返りのヒント" : chrome.popularQuestions,
    variations: chrome.commonVariations,
    related: chrome.relatedSymbols,
    disclaimer: symbol.disclaimer,
  };
  const categoryCopy = locale === "ja" ? japaneseCategories : getAllCategoryCopy(locale);
  const categories = Object.entries(categoryCopy).map(([id, copy]) => ({
    id, icon: DREAM_CATEGORIES[id as DreamCategory].icon, ...copy,
  }));

  if (locale !== "ja") {
    const entries = getLocalizedEntries(locale).map(({
      slug, name, title, category, icon, shortMeaning, aliases, parentSlug, variationSlugs, relatedSymbols, sections,
    }) => ({
      slug, name, title, category, icon, shortMeaning, aliases, parentSlug, variationSlugs, relatedSymbols, sections,
    }));
    return { locale, labels, categories, popular: POPULAR_DREAM_SLUGS, entries };
  }

  const translated = new Set<string>(JA_WEB_DREAM_SLUGS);
  const entries = JA_WEB_DREAM_SLUGS.map((slug) => {
    const article = JA_WEB_DREAM_ARTICLES[slug];
    const source = getDreamEntry(slug);
    if (!source) throw new Error(`Japanese dictionary source missing for ${slug}`);
    return {
      slug,
      name: article.name,
      title: article.name,
      category: source.category,
      icon: article.icon,
      shortMeaning: article.summary,
      aliases: (japaneseAliases as Partial<Record<string, string[]>>)[slug] ?? [],
      parentSlug: source.parentSlug && translated.has(source.parentSlug) ? source.parentSlug : undefined,
      variationSlugs: source.variationSlugs.filter((related) => translated.has(related)),
      relatedSymbols: source.relatedSymbols.filter((related) => translated.has(related)),
      sections: {
        commonScenarios: article.scenes.map(({ title, text }) => ({ title, meaning: text })),
        faq: [{ question: "夢の場面を振り返る", answer: article.reflection }],
      },
    };
  });
  return {
    locale,
    labels,
    categories: categories.filter(({ id }) => entries.some((entry) => entry.category === id)),
    popular: JA_PILOT_SLUGS,
    entries,
  };
}
