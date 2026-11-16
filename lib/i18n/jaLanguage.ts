const wordSegmenter = new Intl.Segmenter("ja", { granularity: "word" });

export function hasJapaneseKana(text: string): boolean {
  return /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text.normalize("NFKC"));
}

export function japaneseWordSegments(text: string) {
  return [...wordSegmenter.segment(text)].filter(({ isWordLike }) => isWordLike);
}
