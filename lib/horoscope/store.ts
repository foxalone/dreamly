import { cache } from 'react';
import { adminFirestore } from '@/lib/firebaseAdmin';
import type { Locale } from '@/lib/i18n/config';
import { type ForecastEdition } from './cache';
import { utcDay, type Sign } from './model';
import { cookies } from 'next/headers';
import { readAccessPass, HOROSCOPE_ACCESS_COOKIE } from './access-cookie';
import { readStored } from './persistence';

export async function canReadForecast(sign?: Sign) {
  return !!sign && !!readAccessPass((await cookies()).get(HOROSCOPE_ACCESS_COOKIE)?.value)?.signs.includes(sign);
}

// Request-only deduplication: completed prose and pending states are never
// hidden behind a cross-request negative cache. SSR and crawlers only read.
const loadInRequest = cache(async (day: string, sign: Sign | undefined, locale: Locale): Promise<{ forecast: ForecastEdition | null; stale: boolean }> => {
  if (!sign || !await canReadForecast(sign)) return {forecast:null,stale:false};
  try {
    const db = adminFirestore();
    const stored = await readStored(db, day, sign, locale);
    return { forecast: stored ? { day, publishedAt: stored.generatedAt, sky: stored.astronomySnapshot, locales: { [locale]: { [sign]: stored.reading } } } : null, stale: false };
  } catch (error) {
    console.error('[horoscope]', { event: 'storage_read_failed', day, name: error instanceof Error ? error.name : 'Error' });
    return { forecast: null, stale: false };
  }
});
export function getForecast(day = utcDay(), sign?: Sign, locale: Locale = 'en') { return loadInRequest(day, sign, locale); }
