import { LOCALES, type Locale } from '@/lib/i18n/config';

export const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'] as const;
export type Sign = typeof SIGNS[number];
export const SYMBOLS = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'] as const;
export const FIELDS = ['general','love','career','money','energy','tip','explanation'] as const;
export type Reading = Record<typeof FIELDS[number], string>;
export type Readings = Record<Sign, Reading>;
export function isSign(value: unknown): value is Sign { return typeof value === 'string' && SIGNS.includes(value as Sign); }
export function utcDay(now = new Date()) { return now.toISOString().slice(0,10); }
export function referenceTime(day: string) {
  const date = new Date(`${day}T12:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(+date) || utcDay(date) !== day) throw new Error('Invalid UTC date');
  return date;
}
export function validateReadings(value: unknown): Readings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid readings');
  const data = value as Record<string, Record<string, unknown>>;
  if (Object.keys(data).length !== SIGNS.length) throw new Error('Expected 12 signs');
  for (const sign of SIGNS) {
    if (!data[sign] || Object.keys(data[sign]).length !== FIELDS.length) throw new Error(`Invalid sign: ${sign}`);
    for (const field of FIELDS) {
      const text = data[sign][field];
      if (typeof text !== 'string' || text.trim().length < 20 || text.length > 1800 || /<[^>]*>|https?:\/\//i.test(text)) throw new Error(`Invalid ${sign}.${field}`);
    }
  }
  // Exact copies across signs indicate a broken generation, not 12 useful readings.
  if (new Set(SIGNS.map(sign => data[sign].general)).size !== 12) throw new Error('Repeated readings');
  return value as Readings;
}
export function completeLocales(value: Partial<Record<Locale, Readings>>) {
  return LOCALES.every(locale => { try { validateReadings(value[locale]); return true; } catch { return false; } });
}
export const readingSchema = {
  type: 'object', additionalProperties: false, required: [...SIGNS],
  properties: Object.fromEntries(SIGNS.map(sign => [sign, {
    type: 'object', additionalProperties: false, required: [...FIELDS],
    properties: Object.fromEntries(FIELDS.map(field => [field, { type: 'string' }]))
  }]))
};
