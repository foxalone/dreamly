import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { selectForecast } from './cache';
import { utcDay } from './model';
const load = unstable_cache(async (day: string) => {
  try {
    const db = adminFirestore();
    const [current, latest] = await Promise.all([db.doc(`daily_horoscopes/${day}`).get(), db.doc('horoscope_publication/latest').get()]);
    return selectForecast(day, current.data(), latest.data());
  } catch (error) {
    console.error('[horoscope] cache read unavailable', error instanceof Error ? error.name : 'Error');
    return { forecast: null, stale: false };
  }
}, ['daily-horoscope-v1'], { revalidate: 300, tags: ['horoscope'] });
const loadInRequest = cache(load);
export function getForecast(day = utcDay()) { return loadInRequest(day); }
