import { LOCALES, type Locale } from '@/lib/i18n/config';

export const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'] as const;
export type Sign = typeof SIGNS[number];
export const SYMBOLS = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'] as const;
export const FIELDS = ['general','love','career','money','energy','tip','explanation'] as const;
export type Reading = Record<typeof FIELDS[number], string> & { headline?: string };
export type Readings = Record<Sign, Reading>;
export function isSign(value: unknown): value is Sign { return typeof value === 'string' && SIGNS.includes(value as Sign); }
export function utcDay(now = new Date()) { return now.toISOString().slice(0,10); }
export function referenceTime(day: string) {
  const date = new Date(`${day}T12:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(+date) || utcDay(date) !== day) throw new Error('Invalid UTC date');
  return date;
}
export class HoroscopeValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'HoroscopeValidationError'; }
}
export function validateReadings(value: unknown, signs: readonly Sign[] = SIGNS): Readings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HoroscopeValidationError('Invalid readings');
  const data = value as Record<string, Record<string, unknown>>;
  if (Object.keys(data).length !== signs.length) throw new HoroscopeValidationError('Expected requested zodiac signs');
  for (const sign of signs) {
    if (!data[sign] || Object.keys(data[sign]).some(key => ![...FIELDS, 'headline'].includes(key)) || FIELDS.some(field => !(field in data[sign]))) throw new HoroscopeValidationError(`Invalid sign: ${sign}`);
    if ('headline' in data[sign] && (typeof data[sign].headline !== 'string' || data[sign].headline.trim().length < 5 || data[sign].headline.length > 180 || /<[^>]*>|https?:\/\//i.test(data[sign].headline))) throw new HoroscopeValidationError(`Invalid ${sign}.headline`);
    for (const field of FIELDS) {
      const text = data[sign][field];
      if (typeof text !== 'string' || text.trim().length < 20 || text.length > 1800 || /<[^>]*>|https?:\/\//i.test(text)) throw new HoroscopeValidationError(`Invalid ${sign}.${field}`);
    }
  }
  // Exact copies across signs indicate a broken generation, not 12 useful readings.
  if (new Set(signs.map(sign => data[sign].general)).size !== signs.length) throw new HoroscopeValidationError('Repeated readings');
  return value as Readings;
}
export function completeLocales(value: Partial<Record<Locale, Readings>>) {
  return LOCALES.every(locale => {
    try {
      const readings = validateReadings(value[locale]);
      for (const sign of SIGNS) {
        validateLocalizedReadings({ [sign]: readings[sign] }, locale, locale === 'en' ? undefined : value.en, [sign], !!readings[sign].headline);
      }
      return true;
    } catch { return false; }
  });
}
/** New editions require editorial fields; legacy valid editions remain readable. */
export function validateLocalizedReadings(value: unknown, locale: Locale, source?: Readings, signs: readonly Sign[] = SIGNS, requireEditorial = false): Readings {
  const data = validateReadings(value, signs);
  const nativeWords: Partial<Record<Locale, RegExp>> = {
    en: /\b(the|and|your|you|with|today|a|to)\b/gi,
    es: /\b(el|la|los|las|y|tu|tus|que|una|con|para|hoy)\b/gi,
    pt: /\b(o|a|os|as|e|seu|sua|que|uma|com|para|hoje|você)\b/gi,
    de: /\b(der|die|das|und|du|dein|deine|mit|heute|ein|eine|zu)\b/gi,
  };
  for (const sign of signs) {
    const reading = data[sign];
    if (requireEditorial && !reading.headline) throw new HoroscopeValidationError(`Missing ${sign}.headline`);
    const words = reading.general.trim().split(/\s+/u).length;
    if (requireEditorial && (words < 100 || words > 160)) throw new HoroscopeValidationError(`Invalid ${sign}.general word count: ${words}`);
    const fields = reading.headline ? [...FIELDS, 'headline'] as const : FIELDS;
    for (const field of fields) {
      const text = reading[field]!;
      if (source && text.trim().toLowerCase() === source[sign][field]?.trim().toLowerCase()) throw new HoroscopeValidationError(`Untranslated ${sign}.${field}`);
      const letters = text.match(/\p{L}/gu) ?? [];
      const script = locale === 'ar' ? /\p{Script=Arabic}/u : locale === 'ru' ? /\p{Script=Cyrillic}/u : /\p{Script=Latin}/u;
      if (!letters.length || letters.filter(letter => script.test(letter)).length / letters.length < .85) throw new HoroscopeValidationError(`Invalid ${sign}.${field} script`);
    }
    // Reject obvious wrong-language output without an extra AI call. These are
    // guardrails, not a substitute for native editorial review.
    const native = nativeWords[locale];
    if (native && (reading.general.match(native)?.length ?? 0) < 8) throw new HoroscopeValidationError(`Invalid ${sign} language`);
    if (locale !== 'en' && /\b(the|your|you|with|today|and)\b/i.test(reading.general)) throw new HoroscopeValidationError(`English text in ${sign}`);
  }
  return data;
}
export function validateGeneratedReadings(value: unknown, locale: Locale, source?: Readings, signs: readonly Sign[] = SIGNS): Readings {
  return validateLocalizedReadings(value, locale, source, signs, true);
}
export const schemaForSigns = (signs: readonly Sign[] = SIGNS) => ({
  type: 'object', additionalProperties: false, required: [...signs],
  properties: Object.fromEntries(signs.map(sign => [sign, {
    type: 'object', additionalProperties: false, required: [...FIELDS, 'headline'],
    properties: Object.fromEntries([...FIELDS, 'headline'].map(field => [field, { type: 'string' }]))
  }]))
});
export const readingSchema = schemaForSigns();
