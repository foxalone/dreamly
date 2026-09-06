export type GuideL10n = {
  name: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  intro: string[];
  sections: { heading: string; paragraphs: string[] }[];
  faqs: { question: string; answer: string }[];
};
