import OpenAI from "openai";
import { TAROT_READING_MODEL } from "@/lib/aiModels";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import type { Locale } from "@/lib/i18n/config";
import { tarotCopy, type MajorArcanaId } from "./deck";
import { focusForDay, type DailyTarotReading } from "./dailyReadingFallback";
import { tarotReadings } from "./readings";

const fields = ["overview", "relationships", "work", "resources", "innerLife", "reflection"] as const;
const schema = {
  type: "object",
  additionalProperties: false,
  required: [...fields],
  properties: Object.fromEntries(fields.map(field => [field, { type: "string" }])),
};
const languages: Record<Locale, string> = {
  en: "natural US English", es: "natural Latin American Spanish", ar: "Modern Standard Arabic",
  pt: "natural Brazilian Portuguese", de: "natural Standard German", ru: "natural literary Russian",
};

export function validateDailyTarotReading(value: unknown, locale: Locale): DailyTarotReading {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid daily tarot reading");
  const source = value as Record<string, unknown>;
  const reading = {} as DailyTarotReading;
  for (const field of fields) {
    const text = source[field];
    const limit = field === "overview" ? 700 : field === "reflection" ? 240 : 480;
    if (typeof text !== "string" || text.trim().length < 20 || text.length > limit || /<[^>]+>|https?:\/\//i.test(text)) {
      throw new Error(`Invalid daily tarot ${field}`);
    }
    reading[field] = text.trim();
  }
  if (locale === "ar" && fields.some(field => !/[\u0600-\u06FF]/.test(reading[field]))) throw new Error("Tarot reading is not Arabic");
  if (locale === "ru" && fields.some(field => !/[А-Яа-яЁё]/.test(reading[field]))) throw new Error("Tarot reading is not Russian");
  return reading;
}

export async function generateDailyTarotReading(day: string, cardId: MajorArcanaId, locale: Locale, suppliedClient?: OpenAI) {
  const apiKey = getOneiroOpenAiApiKey();
  if (!apiKey && !suppliedClient) throw new Error("OpenAI key is not configured");
  const client = suppliedClient ?? new OpenAI({ apiKey, timeout: 55_000, maxRetries: 0 });
  const [focus] = focusForDay(day, locale);
  const response = await client.chat.completions.create({
    model: TAROT_READING_MODEL,
    reasoning_effort: "low",
    max_completion_tokens: 2000,
    response_format: { type: "json_schema", json_schema: { name: "daily_tarot_reading", strict: true, schema } },
    messages: [
      { role: "system", content: `You are Dreamly's thoughtful tarot editor. Write entirely in ${languages[locale]}. Create one original interpretation of the supplied Major Arcana card for the supplied UTC day. The date and daily focus are creative seeds, not evidence of events or cosmic influence. Stay faithful to the supplied card meanings but give this day a distinct angle. Write overview in 2–3 sentences, four life-area fields in 1–2 sentences each, and reflection as one open-ended question. Make every field specific to this card and distinct from the other fields. Use natural, warm, practical prose. Before returning, silently proofread every field as a native-language editor: fix grammar, agreement, case and unnatural phrasing; avoid literal translations. No markdown, links, emojis, spiritual certainty, guaranteed outcomes, diagnosis, medical or investment advice. Never imply that you know anything personal about the reader. Do not use identical template wording across fields. JSON keys stay in English.` },
      { role: "user", content: JSON.stringify({ day, card: tarotCopy[locale].cards[cardId], dailyFocus: focus, coreMeanings: tarotReadings[locale][cardId] }) },
    ],
  }, { timeout: 55_000, maxRetries: 0 });
  const choice = response.choices[0];
  if (choice?.finish_reason !== "stop" || choice.message.refusal || !choice.message.content) throw new Error("Incomplete daily tarot reading");
  return {
    reading: validateDailyTarotReading(JSON.parse(choice.message.content), locale),
    usage: { input: response.usage?.prompt_tokens ?? 0, output: response.usage?.completion_tokens ?? 0 },
  };
}
