import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import type { Locale } from "@/lib/i18n/config";
import { TAROT_READING_MODEL } from "@/lib/aiModels";
import type { MajorArcanaId } from "./deck";
import { fallbackDailyTarotReading, type DailyTarotReading } from "./dailyReadingFallback";
import { generateDailyTarotReading, validateDailyTarotReading } from "./generateDailyReading";

const LEASE_MS = 75_000;
const MAX_ATTEMPTS = 2;
const WAIT_MS = 60_000;

type Stored = {
  day?: unknown;
  cardId?: unknown;
  locale?: unknown;
  status?: unknown;
  reading?: unknown;
  owner?: unknown;
  leaseUntil?: unknown;
  nextAttemptAt?: unknown;
  attempts?: unknown;
};

type Dependencies = {
  db?: Firestore;
  now?: () => number;
  generate?: typeof generateDailyTarotReading;
};

function parseReady(data: Stored | undefined, day: string, cardId: MajorArcanaId, locale: Locale): DailyTarotReading | null {
  if (data?.status !== "ready" || data.day !== day || data.cardId !== cardId || data.locale !== locale) return null;
  try { return validateDailyTarotReading(data.reading, locale); } catch { return null; }
}

/** A shared, persisted reading for one UTC day, card and language. The caller must verify draw access first. */
export async function getDailyTarotReading(day: string, cardId: MajorArcanaId, locale: Locale, dependencies: Dependencies = {}): Promise<DailyTarotReading> {
  const fallback = fallbackDailyTarotReading(day, cardId, locale);
  const now = dependencies.now ?? Date.now;
  const generate = dependencies.generate ?? generateDailyTarotReading;

  try {
    const db = dependencies.db ?? adminDb();
    const ref = db.collection("tarot_daily_readings").doc(`${day}_${cardId}_${locale}`);
    const cached = parseReady((await ref.get()).data(), day, cardId, locale);
    if (cached) return cached;
    if (new Date(now()).toISOString().slice(0, 10) !== day) return fallback;

    const owner = randomUUID();
    const claim = await db.runTransaction(async tx => {
      const data = (await tx.get(ref)).data() as Stored | undefined;
      const ready = parseReady(data, day, cardId, locale);
      if (ready) return { kind: "ready" as const, reading: ready };
      const time = now();
      if (new Date(time).toISOString().slice(0, 10) !== day) return { kind: "fallback" as const };
      if (data?.status === "generating" && Number(data.leaseUntil) > time) return { kind: "busy" as const };
      const attempts = Number(data?.attempts ?? 0);
      if (attempts >= MAX_ATTEMPTS || Number(data?.nextAttemptAt ?? 0) > time) return { kind: "fallback" as const };
      tx.set(ref, { day, cardId, locale, status: "generating", owner, leaseUntil: time + LEASE_MS, attempts: attempts + 1, startedAtMs: time }, { merge: true });
      return { kind: "claimed" as const };
    });

    if (claim.kind === "ready") return claim.reading;
    if (claim.kind === "fallback") return fallback;
    if (claim.kind === "busy") {
      const deadline = now() + WAIT_MS;
      while (now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const data = (await ref.get()).data() as Stored | undefined;
        const ready = parseReady(data, day, cardId, locale);
        if (ready) return ready;
        if (data?.status !== "generating" || Number(data.leaseUntil) <= now()) break;
      }
      return fallback;
    }

    try {
      const result = await generate(day, cardId, locale);
      const saved = await db.runTransaction(async tx => {
        const data = (await tx.get(ref)).data() as Stored | undefined;
        const ready = parseReady(data, day, cardId, locale);
        if (ready) return ready;
        if (data?.status !== "generating" || data.owner !== owner || Number(data.leaseUntil) <= now()) return null;
        tx.set(ref, { day, cardId, locale, status: "ready", reading: result.reading, model: TAROT_READING_MODEL, generatedAtMs: now(), leaseUntil: 0, owner: null, nextAttemptAt: 0 }, { merge: true });
        return result.reading;
      });
      if (saved) {
        console.info("[tarot]", { event: "daily_reading_generated", day, cardId, locale, usage: result.usage });
        return saved;
      }
      return parseReady((await ref.get()).data(), day, cardId, locale) ?? fallback;
    } catch (error) {
      const kind = error instanceof Error ? error.name : "Error";
      console.error("[tarot]", { event: "daily_reading_failed", day, cardId, locale, kind });
      try {
        await db.runTransaction(async tx => {
          const data = (await tx.get(ref)).data() as Stored | undefined;
          if (data?.owner !== owner || data.status !== "generating") return;
          const attempts = Number(data.attempts ?? 1);
          tx.set(ref, { status: attempts >= MAX_ATTEMPTS ? "exhausted" : "failed", leaseUntil: 0, owner: null, nextAttemptAt: now() + 60_000 }, { merge: true });
        });
      } catch { /* A deterministic local reading remains available. */ }
      return fallback;
    }
  } catch (error) {
    console.error("[tarot]", { event: "daily_reading_storage_unavailable", day, cardId, locale, kind: error instanceof Error ? error.name : "Error" });
    return fallback;
  }
}
