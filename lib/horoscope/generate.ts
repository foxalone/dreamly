import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { getOneiroOpenAiApiKey } from '@/lib/openaiEnv';
import { HOROSCOPE_MODEL, TRANSLATE_MODEL } from '@/lib/aiModels';
import { LOCALES, type Locale } from '@/lib/i18n/config';
import { calculateSky } from './astronomy';
import { completeLocales, readingSchema, utcDay, validateReadings, type Readings } from './model';
import { validForecast, type Forecast } from './cache';

const languages: Record<Locale,string> = { en: 'US English', es: 'Latin American Spanish', ar: 'Modern Standard Arabic', pt: 'Brazilian Portuguese', de: 'Standard German', ru: 'natural literary Russian' };
const LEASE_MS = 10 * 60_000;
export async function generateDailyHoroscope(day = utcDay(), dependencies: { db?: FirebaseFirestore.Firestore; client?: OpenAI } = {}) {
  const key = getOneiroOpenAiApiKey();
  if (!key && !dependencies.client) throw new Error('OpenAI key is not configured');
  const db = dependencies.db ?? adminFirestore(), ref = db.doc(`daily_horoscopes/${day}`), owner = randomUUID();
  const acquired = await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    if (validForecast(data) || Number(data?.leaseUntil) > Date.now()) return false;
    tx.set(ref, { owner, leaseUntil: Date.now() + LEASE_MS, state: 'generating', complete: false, version: 1, day }, { merge: true });
    return true;
  });
  if (!acquired) return { day, status: 'cached-or-running' };
  const sky = calculateSky(day);
  const client = dependencies.client ?? new OpenAI({ apiKey: key, timeout: 65_000, maxRetries: 0 });
  const saved = (await ref.get()).data();
  const locales: Partial<Record<Locale, Readings>> = {};
  for (const locale of LOCALES) {
    try { locales[locale] = validateReadings(saved?.locales?.[locale]); } catch { /* resume only valid checkpoints */ }
  }
  async function generate(locale: Locale, source?: Readings) {
    if (locales[locale]) return;
    let lastError: unknown;
    for (let attempt=0; attempt<2; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: source ? TRANSLATE_MODEL : HOROSCOPE_MODEL,
          reasoning_effort: 'low', max_completion_tokens: 14500,
          response_format: { type: 'json_schema', json_schema: { name: 'daily_horoscopes', strict: true, schema: readingSchema } },
          messages: [{ role: 'system', content: `Write entirely in ${languages[locale]}. ${source ? 'Translate the supplied readings naturally, preserving every meaning and astronomical fact.' : 'Write distinct daily Sun-sign interpretations for all 12 signs using ONLY the supplied computed sky. Use traditional solar whole-sign houses (sign as first house) as an interpretive convention, not a measured fact. Each general paragraph: 45–65 words; each other field: 20–35 words. The explanation must identify at least one supplied planet position or aspect relevant to the sign. Vary actions and wording across signs; offer practical, gentle reflection.'} JSON keys remain English. Plain prose only. Astrology is entertainment, not scientific prediction. No guaranteed outcomes, illness/death predictions, financial promises, investment or medical advice, fear or paid upsells. Do not invent positions, transits, exact aspect times or birth data. Never claim planetary motion causes human events. Distinguish astronomy from symbolic interpretation. No markup or URLs.` },
            { role: 'user', content: JSON.stringify(source ? { day, readings: source } : { sky }) }]
        });
        const choice = response.choices[0];
        if (choice?.finish_reason !== 'stop' || choice.message.refusal) throw new Error('Incomplete horoscope output');
        const readings = validateReadings(JSON.parse(choice.message.content || 'null'));
        await db.runTransaction(async tx => {
          const data = (await tx.get(ref)).data();
          if (data?.owner !== owner || data?.leaseUntil < Date.now()) throw new Error('Lost horoscope lease');
          tx.set(ref, { locales: { [locale]: readings } }, { merge: true });
        });
        locales[locale] = readings;
        return;
      } catch (error) { lastError = error; }
    }
    throw lastError;
  }
  try {
    await generate('en');
    // Five translations, one call each, shared English source; no per-visitor AI calls.
    const results = await Promise.allSettled(LOCALES.filter(l => l !== 'en').map(locale => generate(locale, locales.en)));
    if (results.some(result => result.status === 'rejected') || !completeLocales(locales)) throw new Error('Incomplete horoscope locales');
    const forecast: Forecast = { day, sky, locales: locales as Forecast['locales'], complete: true, version: 1, publishedAt: new Date().toISOString() };
    await db.runTransaction(async tx => {
      const latestRef = db.doc('horoscope_publication/latest');
      const [daily, latest] = await Promise.all([tx.get(ref), tx.get(latestRef)]);
      if (daily.data()?.owner !== owner || daily.data()?.leaseUntil < Date.now()) throw new Error('Lost horoscope lease');
      tx.set(ref, forecast);
      if (!latest.exists || String(latest.data()?.day) <= day) tx.set(latestRef, forecast);
    });
    return { day, status: 'published' };
  } catch (error) {
    await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (current.data()?.owner === owner) tx.set(ref, { state: 'failed', leaseUntil: 0, failedAt: new Date().toISOString() }, { merge: true });
    });
    throw error;
  }
}
