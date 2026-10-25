import { randomUUID } from 'node:crypto';
import type OpenAI from 'openai';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { calculateSky } from './astronomy';
import { generateReading } from './generate';
import { HoroscopeValidationError, isSign, referenceTime, utcDay, type Sign } from './model';
import { jobId, readingPath, readStored, parseStored, versionOf, type StoredReading } from './persistence';

export const MAX_ATTEMPTS = 3;
export const DAILY_ATTEMPT_LIMIT = 96;
export const LEASE_MS = 150_000; // Longer than the bounded 65-second provider request.
export type Job = { day: string; sign: Sign; locale: Locale; status: 'queued' | 'processing' | 'ready' | 'failed' | 'exhausted'; attempts: number; owner?: string; leaseUntil?: number; nextAttemptAt: number; requestedAt: number; manualRecoveryGranted?: boolean };
export type PublicStatus = { day: string; status: 'missing' | 'queued' | 'processing' | 'retrying' | 'failed' | 'ready'; retryAt?: number; canRetry?: boolean };
export type Dependencies = { db?: FirebaseFirestore.Firestore; client?: OpenAI; now?: () => number };
const context = (d: Dependencies) => ({ db: d.db ?? adminFirestore(), now: d.now ?? Date.now });
const attemptLimit = (job: { manualRecoveryGranted?: boolean }) => MAX_ATTEMPTS + (job.manualRecoveryGranted ? 1 : 0);
const path = (id: string) => `horoscope_jobs/${id}`;
function validJob(value: unknown): value is Job {
  const job = value as Job | undefined;
  if (!job || !isSign(job.sign) || !isLocale(job.locale) || !Number.isInteger(job.attempts) || job.attempts < 0) return false;
  try { referenceTime(job.day); return true; } catch { return false; }
}
export class HoroscopeRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function validateRequest(value: unknown): { sign: Sign; locale: Locale } {
  const v = value as { sign?: unknown; locale?: unknown };
  if (!v || Object.keys(v).some(k => k !== 'sign' && k !== 'locale') || !isSign(v.sign) || typeof v.locale !== 'string' || !isLocale(v.locale)) throw new HoroscopeRequestError(400, 'INVALID_REQUEST');
  return { sign: v.sign, locale: v.locale };
}

/** The caller supplies a server-HMACed network bucket, never a public identity. */
export async function requestReading(sign: Sign, locale: Locale, actor: string, dependencies: Dependencies = {}): Promise<PublicStatus> {
  validateRequest({ sign, locale });
  const { db, now } = context(dependencies), time = now(), day = utcDay(new Date(time));
  if (await readStored(db, day, sign, locale)) {
    console.info('[horoscope]', { event: 'cache_hit', day, sign, locale });
    return { day, status: 'ready' };
  }
  const master = locale === 'en' ? null : await readStored(db, day, sign, 'en');
  const requested = locale === 'en' || master ? [locale] : ['en', locale] as Locale[];
  await db.runTransaction(async tx => {
    const rateRef = db.doc(`horoscope_request_limits/${day}_${actor}`);
    const refs = requested.map(language => db.doc(path(jobId(day, sign, language))));
    const [rate, ...jobs] = await Promise.all([tx.get(rateRef), ...refs.map(ref => tx.get(ref))]);
    const data = rate.data(), minute = Math.floor(time / 60_000);
    const count = data?.minute === minute ? Number(data?.count ?? 0) : 0;
    if (count >= 30 || Number(data?.dailyCount ?? 0) >= 200) throw new HoroscopeRequestError(429, 'RATE_LIMITED');
    tx.set(rateRef, { minute, count: count + 1, dailyCount: Number(data?.dailyCount ?? 0) + 1, expiresAt: time + 86400_000 });
    refs.forEach((ref, index) => {
      // Existing jobs retain attempts, backoff and owner. Polling never comes here.
      if (!jobs[index].exists) tx.set(ref, { day, sign, locale: requested[index], status: 'queued', attempts: 0, nextAttemptAt: time, requestedAt: time } satisfies Job);
    });
  });
  console.info('[horoscope]', { event: 'cache_miss', day, sign, locale });
  return getReadingStatus(sign, locale, dependencies);
}
export async function getReadingStatus(sign: Sign, locale: Locale, dependencies: Dependencies = {}): Promise<PublicStatus> {
  validateRequest({ sign, locale });
  const { db, now } = context(dependencies), day = utcDay(new Date(now()));
  const job = (await db.doc(path(jobId(day, sign, locale))).get()).data() as Job | undefined;
  if (!job || job.status === 'ready') {
    if (await readStored(db, day, sign, locale)) return { day, status: 'ready' };
    return { day, status: job ? 'failed' : 'missing', canRetry: false };
  }
  const master = locale !== 'en' ? (await db.doc(path(jobId(day, sign, 'en'))).get()).data() as Job | undefined : undefined;
  const failure = [job, master].find(j => j?.status === 'exhausted' || j?.status === 'failed');
  if (failure) return { day, status: failure.status === 'exhausted' ? 'failed' : 'retrying', retryAt: failure.nextAttemptAt, canRetry: failure.status !== 'exhausted' && failure.nextAttemptAt <= now() };
  return { day, status: job?.status === 'processing' ? 'processing' : job ? 'queued' : 'missing' };
}

export async function processJob(id: string, dependencies: Dependencies = {}) {
  const { db, now } = context(dependencies), ref = db.doc(path(id));
  const initial = (await ref.get()).data();
  if (!validJob(initial) || jobId(initial.day, initial.sign, initial.locale) !== id) return 'invalid';
  const { day, sign, locale } = initial;
  // Do not start new AI work for yesterday after UTC rollover. In-flight work
  // may finish in its original date's document; it cannot write into today.
  if (day !== utcDay(new Date(now()))) return 'expired-date';
  const existing = await readStored(db, day, sign, locale);
  if (existing) {
    await db.runTransaction(async tx => { await tx.get(ref); tx.set(ref, { status: 'ready', leaseUntil: 0 }, { merge: true }); });
    return 'cached';
  }
  const master = locale === 'en' ? null : await readStored(db, day, sign, 'en');
  if (locale !== 'en' && !master) return 'waiting-for-master';
  const owner = randomUUID();
  const acquired = await db.runTransaction(async tx => {
    const budgetRef = db.doc(`horoscope_usage/${day}`);
    const [snapshot, budget] = await Promise.all([tx.get(ref), tx.get(budgetRef)]);
    const current = snapshot.data() as Job | undefined, time = now();
    if (day !== utcDay(new Date(time))) return false;
    if (!validJob(current) || current.status === 'ready' || current.status === 'exhausted' || Number(current.leaseUntil ?? 0) > time || current.nextAttemptAt > time) return false;
    if (current.attempts >= attemptLimit(current) || Number(budget.data()?.attempts ?? 0) >= DAILY_ATTEMPT_LIMIT) {
      tx.set(ref, { status: 'exhausted', leaseUntil: 0 }, { merge: true }); return false;
    }
    tx.set(ref, { status: 'processing', attempts: current.attempts + 1, owner, leaseUntil: time + LEASE_MS, startedAt: time }, { merge: true });
    tx.set(budgetRef, { attempts: Number(budget.data()?.attempts ?? 0) + 1, [locale === 'en' ? 'masterAttempts' : 'translationAttempts']: Number(budget.data()?.[locale === 'en' ? 'masterAttempts' : 'translationAttempts'] ?? 0) + 1 }, { merge: true });
    return current.attempts + 1;
  });
  if (!acquired) return 'not-claimed';
  console.info('[horoscope]', { event: acquired > 1 ? 'retry' : 'job_claimed', day, sign, locale, attempt: acquired });
  try {
    // Check persistent content again after the atomic claim. No transaction is
    // held across the provider call, and a legacy edition is never overwritten.
    const cached = await readStored(db, day, sign, locale);
    const sky = master?.astronomySnapshot ?? calculateSky(day);
    if (!cached) {
      // Storage checks can be slow. Renew atomically immediately before the
      // bounded provider call, and never revive an expired or superseded owner.
      const until = await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data();
        if (day !== utcDay(new Date(now())) || current?.owner !== owner || Number(current?.leaseUntil) <= now() || current?.status !== 'processing') return 0;
        const leaseUntil = now() + LEASE_MS;
        tx.set(ref, { leaseUntil }, { merge: true });
        return leaseUntil;
      });
      if (until - now() < 75_000) throw new Error('Lost horoscope lease');
    }
    const result = cached ? null : await generateReading(day, sign, locale, sky, master?.reading, dependencies.client);
    const record: StoredReading = cached ?? { day, sign, locale, reading: result!.reading, astronomySnapshot: sky, generatedAt: new Date(now()).toISOString(), masterVersion: master?.masterVersion ?? versionOf(result!.reading) };
    const committed = await db.runTransaction(async tx => {
      const outputRef = db.doc(readingPath(day, sign, locale));
      const [snapshot, output] = await Promise.all([tx.get(ref), tx.get(outputRef)]);
      const current = snapshot.data();
      if (current?.owner !== owner || Number(current?.leaseUntil) <= now()) return false;
      if (!parseStored(output.data(), day, sign, locale) && !cached) tx.set(outputRef, record);
      tx.set(ref, { status: 'ready', leaseUntil: 0, completedAt: now(), usage: result?.usage ?? null, error: null }, { merge: true });
      return true;
    });
    console.info('[horoscope]', { event: committed ? cached ? 'cache_hit' : locale === 'en' ? 'master_generated' : 'translation_generated' : 'stale_worker', day, sign, locale, usage: result?.usage });
    return committed ? 'ready' : 'stale-worker';
  } catch (error) {
    // Never store provider messages, generated text, keys or user/network data.
    const details = error as { name?: string; status?: number; code?: string };
    const validationReason = error instanceof HoroscopeValidationError ? error.message : null;
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.owner !== owner || current?.status === 'ready') return;
      const attempts = Number(current.attempts);
      tx.set(ref, { status: attempts >= attemptLimit(current) ? 'exhausted' : 'failed', leaseUntil: 0,
        nextAttemptAt: now() + 60_000 * 2 ** (attempts - 1), failedAt: now(),
        error: { reason: validationReason, name: details?.name ?? 'Error', status: details?.status ?? null, code: String(details?.code ?? (error instanceof Error && error.message === 'OpenAI key is not configured' ? 'OPENAI_NOT_CONFIGURED' : error instanceof SyntaxError ? 'INVALID_JSON' : validationReason ? 'READING_VALIDATION' : 'GENERATION_FAILED')) } }, { merge: true });
    });
    console.error('[horoscope]', { event: 'job_failed', day, sign, locale, name: details?.name ?? 'Error', reason: validationReason });
    return 'failed';
  }
}
export async function processRequested(day: string, sign: Sign, locale: Locale, dependencies: Dependencies = {}) {
  await processJob(jobId(day, sign, 'en'), dependencies);
  if (locale !== 'en') await processJob(jobId(day, sign, locale), dependencies);
}
/** Durable recovery scans only today's explicitly requested jobs (at most 72). */
export async function drainRequestedJobs(dependencies: Dependencies = {}) {
  const { db, now } = context(dependencies), deadline = now() + 220_000;
  const day = utcDay(new Date(now()));
  const jobs = await db.collection('horoscope_jobs').where('day', '==', day).get();
  const pending = jobs.docs.filter(doc => { const job = doc.data(); return validJob(job) && job.status !== 'ready' && job.status !== 'exhausted'; });
  pending.sort((a, b) => Number(a.data().locale !== 'en') - Number(b.data().locale !== 'en'));
  for (const english of [true, false]) {
    const phase = pending.filter(doc => (doc.data().locale === 'en') === english);
    for (let i = 0; i < phase.length && now() + 75_000 < deadline; i += 3) {
      const results = await Promise.allSettled(phase.slice(i, i + 3).map(doc => processJob(doc.id, dependencies)));
      if (results.some(result => result.status === 'rejected')) console.error('[horoscope]', { event: 'worker_storage_failure', day });
    }
  }
  return { day, requestedJobs: jobs.size, pendingJobs: pending.length };
}
/** Authenticated recovery never resets attempts or the global budget; at most one extra attempt. */
export async function expediteRetry(id: string, dependencies: Dependencies = {}) {
  const { db, now } = context(dependencies);
  if (!/^\d{4}-\d{2}-\d{2}_[a-z]+_(en|es|ar|pt|de|ru)$/.test(id)) throw new HoroscopeRequestError(400, 'INVALID_JOB');
  await db.runTransaction(async tx => {
    const ref = db.doc(path(id));
    const [snapshot, budget] = await Promise.all([tx.get(ref), tx.get(db.doc(`horoscope_usage/${utcDay(new Date(now()))}`))]);
    const job = snapshot.data();
    if (!validJob(job) || job.day !== utcDay(new Date(now())) || (job.status !== 'failed' && job.status !== 'exhausted')) throw new HoroscopeRequestError(409, 'RETRY_UNAVAILABLE');
    if (Number(budget.data()?.attempts ?? 0) >= DAILY_ATTEMPT_LIMIT) throw new HoroscopeRequestError(429, 'DAILY_LIMIT');
    if (job.status === 'exhausted') {
      if (job.manualRecoveryGranted || job.attempts < MAX_ATTEMPTS) throw new HoroscopeRequestError(409, 'RETRY_UNAVAILABLE');
      tx.set(ref, { status: 'queued', nextAttemptAt: now(), leaseUntil: 0, manualRecoveryGranted: true, manualRecoveryAt: now() }, { merge: true });
    } else {
      tx.set(ref, { nextAttemptAt: now() }, { merge: true });
    }
  });
}
