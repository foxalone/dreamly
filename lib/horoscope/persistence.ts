import { createHash } from 'node:crypto';
import type { Locale } from '@/lib/i18n/config';
import { calculateSky, type Sky } from './astronomy';
import { validSky } from './cache';
import { referenceTime, SIGNS, validateLocalizedReadings, type Reading, type Sign } from './model';

export type StoredReading = { day: string; sign: Sign; locale: Locale; reading: Reading; astronomySnapshot: Sky; generatedAt?: string; masterVersion: string };
export const readingPath = (day: string, sign: Sign, locale: Locale) => `daily_horoscopes/${day}/signs/${sign}/readings/${locale}`;
export const jobId = (day: string, sign: Sign, locale: Locale) => `${day}_${sign}_${locale}`;
export const versionOf = (reading: Reading) => createHash('sha256').update(JSON.stringify(reading)).digest('hex');
export function parseStored(value: unknown, day: string, sign: Sign, locale: Locale): StoredReading | null {
  const v = value as StoredReading | undefined;
  try {
    referenceTime(day);
    if (!v || v.day !== day || v.sign !== sign || v.locale !== locale || !validSky(v.astronomySnapshot, day) || !v.masterVersion || !v.generatedAt || !Number.isFinite(Date.parse(v.generatedAt))) return null;
    validateLocalizedReadings({ [sign]: v.reading }, locale, undefined, [sign], !!v.reading.headline);
    return v;
  } catch { return null; }
}
export function parseLegacy(value: unknown, day: string, sign: Sign, locale: Locale): StoredReading | null {
  const v = value as { day?: string; sky?: Sky; publishedAt?: string; locales?: Partial<Record<Locale, Record<Sign, Reading>>> } | undefined;
  try {
    if (!v || v.day !== day) return null;
    const reading = v.locales?.[locale]?.[sign];
    validateLocalizedReadings({ [sign]: reading }, locale, undefined, [sign], !!reading?.headline);
    return { day, sign, locale, reading: reading!, astronomySnapshot: v.sky && validSky(v.sky, day) ? v.sky : calculateSky(day),
      ...(v.publishedAt && Number.isFinite(Date.parse(v.publishedAt)) ? { generatedAt: v.publishedAt } : {}), masterVersion: versionOf(reading!) };
  } catch { return null; }
}
export async function readStored(db: FirebaseFirestore.Firestore, day: string, sign: Sign, locale: Locale): Promise<StoredReading | null> {
  const current = parseStored((await db.doc(readingPath(day, sign, locale)).get()).data(), day, sign, locale);
  if (current) return current;
  return parseLegacy((await db.doc(`daily_horoscopes/${day}`).get()).data(), day, sign, locale);
}

/** Landing-page previews are also read-only; discover only already requested jobs. */
export async function readAvailable(db: FirebaseFirestore.Firestore, day: string, locale: Locale) {
  const legacy = (await db.doc(`daily_horoscopes/${day}`).get()).data();
  const jobs = await db.collection('horoscope_jobs').where('day', '==', day).get();
  const signs = new Set(jobs.docs.filter(doc => doc.data().status === 'ready' && doc.data().locale === locale).map(doc => doc.data().sign));
  const results = await Promise.all(SIGNS.map(async sign => signs.has(sign) ? readStored(db, day, sign, locale) : parseLegacy(legacy, day, sign, locale)));
  return results.filter((reading): reading is StoredReading => !!reading);
}
