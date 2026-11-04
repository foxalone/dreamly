import OpenAI from "openai";
import { calculateSky } from "@/lib/horoscope/astronomy";
import type { Sign } from "@/lib/horoscope/model";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { validateFeatured, type FeaturedForecast } from "@/lib/featuredHoroscope";

export const FEATURED_MODEL = "gpt-6.1-terra";

const fields = ["headline", "teaser", "opening", "relationships", "work", "wellbeing", "takeaway"] as const;
const schema = {
  type: "object",
  additionalProperties: false,
  required: [...fields],
  properties: Object.fromEntries(fields.map(field => [field, { type: "string" }])),
};

export async function generateFeatured(day: string, sign: Sign, client?: OpenAI): Promise<FeaturedForecast> {
  const apiKey = getOneiroOpenAiApiKey();
  if (!apiKey && !client) throw new Error("OpenAI key is not configured");
  const openai = client ?? new OpenAI({ apiKey, timeout: 90_000, maxRetries: 1 });
  const sky = calculateSky(day);
  const response = await openai.responses.create({
    model: FEATURED_MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: 1800,
    text: { format: { type: "json_schema", name: "featured_horoscope", strict: true, schema } },
    instructions: `You are Dreamly's thoughtful astrology editor. Write one original daily Sun-sign forecast in natural US English for the supplied date and sign. Use the supplied astronomical snapshot only as symbolic inspiration. Never invent a planetary position, transit or precise timing. This is reflective entertainment, not a factual prediction. Avoid guaranteed outcomes, fear, diagnosis, investment advice, generic flattery, mystical clichés and repeated templates. Be warm, specific and practical. Output seven plain-text fields: a vivid 5–10 word headline; a teaser of 28–45 words that stands alone in a feed; an opening of 80–110 words; relationships, work and wellbeing sections of 55–80 words each; a one-sentence takeaway. Each section should say something distinct. No Markdown, links or emojis.`,
    input: JSON.stringify({ day, sign, sky }),
  });
  if (response.status !== "completed" || !response.output_text) throw new Error("Incomplete featured forecast");
  const prose = JSON.parse(response.output_text) as Record<(typeof fields)[number], string>;
  return validateFeatured({ ...prose, day, sign, publishedAtMs: Date.now(), model: FEATURED_MODEL });
}
