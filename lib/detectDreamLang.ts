import OpenAI from "openai";

/**
 * Server-side language detection for a dream text (ISO 639-1, lowercase).
 * One tiny gpt-5-nano call per shared dream, run once at share time and
 * stored on the shared_dreams doc as `lang`, so the feed can hide the
 * translate button when the viewer already reads that language.
 *
 * Returns null when the model cannot tell (empty text, emoji only, ...).
 */
export const DETECT_LANG_MODEL_ENV = "OPENAI_DETECT_LANG_MODEL";

export function detectLangModel() {
  return process.env[DETECT_LANG_MODEL_ENV]?.trim() || "gpt-5-nano";
}

export function normalizeLangCode(v: unknown): string | null {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z-]/g, "");
  const base = s.split("-")[0];
  if (!/^[a-z]{2,3}$/.test(base)) return null;
  if (base === "und" || base === "unknown" || base === "mul") return null;
  if (base === "iw") return "he"; // legacy Hebrew code
  return base;
}

export async function detectDreamLang(
  apiKey: string,
  text: string
): Promise<{ lang: string | null; model: string }> {
  const model = detectLangModel();
  const clean = (text ?? "").trim();
  if (!clean) return { lang: null, model };

  const openai = new OpenAI({ apiKey });
  const resp = await openai.responses.create({
    model,
    instructions:
      "You identify the language a text is written in. Reply with only the ISO 639-1 two-letter code in lowercase (e.g. en, ru, he, ar, es). If the text mixes languages, answer with the dominant one. If it is not identifiable, reply und.",
    input: clean.slice(0, 1500),
    reasoning: { effort: "minimal" },
  });

  const raw = resp.output_text ?? "";
  return { lang: normalizeLangCode(raw), model };
}
