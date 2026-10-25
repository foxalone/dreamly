import OpenAI from 'openai';
import { getOneiroOpenAiApiKey } from '@/lib/openaiEnv';
import { HOROSCOPE_MODEL, HOROSCOPE_TRANSLATE_MODEL } from '@/lib/aiModels';
import type { Locale } from '@/lib/i18n/config';
import type { Sky } from './astronomy';
import { HoroscopeValidationError, schemaForSigns, validateGeneratedReadings, type Readings, type Reading, type Sign } from './model';

const languages: Record<Locale, string> = { en: 'US English', es: 'Latin American Spanish', ar: 'Modern Standard Arabic', pt: 'Brazilian Portuguese', de: 'Standard German', ru: 'natural literary Russian' };
export const MAX_OUTPUT_TOKENS = 5000;
/** Exactly one requested sign and language; called only by the claimed job worker. */
export async function generateReading(day: string, sign: Sign, locale: Locale, sky: Sky, master?: Reading, suppliedClient?: OpenAI) {
  const key = getOneiroOpenAiApiKey();
  if (!key && !suppliedClient) throw new Error('OpenAI key is not configured');
  if (locale !== 'en' && !master) throw new Error('English master required');
  const client = suppliedClient ?? new OpenAI({ apiKey: key, timeout: 65_000, maxRetries: 0 });
  const response = await client.chat.completions.create({
    model: locale === 'en' ? HOROSCOPE_MODEL : HOROSCOPE_TRANSLATE_MODEL,
    reasoning_effort: 'low', max_completion_tokens: MAX_OUTPUT_TOKENS,
    response_format: { type: 'json_schema', json_schema: { name: 'daily_horoscope', strict: true, schema: schemaForSigns([sign]) } },
    messages: [{ role: 'system', content: `Write entirely in ${languages[locale]}. ${master ? 'Translate the supplied English master naturally. Preserve its meaning, zodiac names, astronomical references, tone and section structure. Do not write a different horoscope.' : 'Write one daily Sun-sign interpretation for the requested sign using ONLY the supplied computed sky. Use traditional solar whole-sign houses as an interpretive convention, not a measured fact. Identify at least one supplied planet position or aspect in explanation. Never invent positions, transits, aspect times or birth data.'} Include an engaging 5–12 word headline. General must be 100–160 words in two or three paragraphs separated by a blank line. Other fields must be 20–35 words. Tip is one or two practical sentences. JSON keys remain English. Plain prose only, no markup or URLs. Astrology is entertainment and traditional symbolism, not scientifically validated prediction. Never claim planetary motion causes events. No guaranteed outcomes, fear, medical advice, investment advice or paid upsells.` },
      { role: 'user', content: JSON.stringify(master ? { day, sign, readings: { [sign]: master } } : { day, sign, sky }) }],
  }, { timeout: 65_000, maxRetries: 0 });
  const choice = response.choices[0];
  if (choice?.finish_reason !== 'stop' || choice.message.refusal) throw new HoroscopeValidationError('Incomplete horoscope output');
  const source = master ? { [sign]: master } as Readings : undefined;
  const readings = validateGeneratedReadings(JSON.parse(choice.message.content || 'null'), locale, source, [sign]);
  return { reading: readings[sign], usage: { input: response.usage?.prompt_tokens ?? 0, output: response.usage?.completion_tokens ?? 0 } };
}
