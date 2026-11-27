import { getDreamEntry, getDreamVariations, getParentEntry, getRelatedDreams } from "./dream-dictionary";
import { getJapaneseDreamArticle } from "./jaDreamArticles";
import { getJapaneseDreamUpdatedAt, type JaWebDreamSlug } from "./jaPilotPaths";

export function getRelatedJapaneseDreamSlugs(slug: JaWebDreamSlug, limit: number): JaWebDreamSlug[] {
  const entry = getDreamEntry(slug);
  if (!entry) return [];

  const variations = getDreamVariations(entry).sort((a, b) =>
    (getJapaneseDreamUpdatedAt(b.canonicalSlug) ?? "").localeCompare(getJapaneseDreamUpdatedAt(a.canonicalSlug) ?? ""),
  );
  const candidates = [
    getParentEntry(entry),
    ...(entry.comboOf ?? []).map(getDreamEntry),
    ...variations,
    ...getRelatedDreams(entry),
  ];
  const translated = candidates.flatMap((candidate) => {
    const article = candidate && getJapaneseDreamArticle(candidate.canonicalSlug);
    return article && article.slug !== slug ? [article.slug] : [];
  });
  return [...new Set(translated)].slice(0, limit);
}
