export type EscapeNoteCopy = { lead: string; cta: string };

export const EN_ESCAPE_NOTE: EscapeNoteCopy = {
  lead: "While your dream was being interpreted, creatures escaped from it:",
  cta: "they hid in the dream catcher. Tap it to catch them!",
};

/** The analysis model supplies the language without a separate detection request. */
export function parseDreamAnalysisOutput(raw: string): { analysis: string; lang: string | null } {
  const text = raw.trim();
  const match = /^\[\[dream-language:([a-z]{2}(?:-[a-z]{2})?)\]\]\s*/i.exec(text);
  const code = match?.[1].split("-")[0].toLowerCase();
  return {
    analysis: match ? text.slice(match[0].length).trim() : text,
    lang: code ? code === "iw" ? "he" : code : null,
  };
}

export function normalizeEscapeNoteCopy(raw: unknown): EscapeNoteCopy | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<EscapeNoteCopy>;
  const lead = typeof value.lead === "string" ? value.lead.trim() : "";
  const cta = typeof value.cta === "string" ? value.cta.trim() : "";
  return lead && cta && lead.length <= 500 && cta.length <= 500 ? { lead, cta } : null;
}
