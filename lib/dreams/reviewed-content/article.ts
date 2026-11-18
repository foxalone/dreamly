import type { DreamSections } from "../../dream-dictionary";

export const REVIEWED_SLUGS = [
  "cat-and-snake", "sick-family-member", "pope", "dog-and-snake", "baby-and-water",
  "snake-and-rat", "swimming-with-whales", "snake-and-fish", "snake-and-tree", "dead-rabbit",
] as const;

export type ReviewedSlug = (typeof REVIEWED_SLUGS)[number];
export type ReviewedArticle = {
  shortMeaning: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
  sections: DreamSections;
};
export type ReviewedArticles = Record<ReviewedSlug, ReviewedArticle>;

// This helper only assembles authored copy. It generates no interpretation text.
// Related links stay in paragraph 1; paragraph 0 and structured data stay plain.
export function article(
  seoTitle: string,
  seoDescription: string,
  shortMeaning: string,
  prose: [intro: string, related: string, general: string, psychological: string,
    spiritual: string, islamic: string, biblical: string, journal: string],
  scenarios: [title: string, meaning: string][],
  faq: [question: string, answer: string][],
): ReviewedArticle {
  const [intro, related, general, psychological, spiritual, islamic, biblical, journal] = prose;
  return {
    seoTitle, seoDescription, shortMeaning, updatedAt: "2026-11-18",
    sections: {
      introduction: [intro, related], general: [general, journal], psychological: [psychological],
      spiritual: [spiritual], islamic: [islamic], biblical: [biblical],
      commonScenarios: scenarios.map(([title, meaning]) => ({ title, meaning })),
      faq: faq.map(([question, answer]) => ({ question, answer })),
    },
  };
}
