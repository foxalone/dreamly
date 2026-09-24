export type SeedL10n = {
  name: string;
  summary?: string;
  focus?: string;
  aliases?: string[];
  /** Full page title when the locale's default pattern does not fit the name (ru: "К чему снятся зубы"). */
  title?: string;
};
