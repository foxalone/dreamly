import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { LOCALES } from "@/lib/i18n/config";
import { getDailyTarotReading } from "./dailyReading";
import { fallbackDailyTarotReading } from "./dailyReadingFallback";
import { MAJOR_ARCANA } from "./deck";
import { dailyReadingDiffersFromGuide, validateDailyTarotReading } from "./generateDailyReading";
import { tarotReadings } from "./readings";

function memoryDb() {
  const records = new Map<string, Record<string, unknown>>();
  const db = {
    collection: () => ({ doc: (id: string) => ({ id, get: async () => ({ data: () => records.get(id) }) }) }),
    runTransaction: async <T>(action: (tx: {
      get: (ref: { id: string }) => Promise<{ data: () => Record<string, unknown> | undefined }>;
      set: (ref: { id: string }, value: Record<string, unknown>) => void;
    }) => Promise<T>) => {
      const writes: Array<[string, Record<string, unknown>]> = [];
      const result = await action({
        get: async ref => ({ data: () => records.get(ref.id) }),
        set: (ref, value) => writes.push([ref.id, value]),
      });
      for (const [id, value] of writes) records.set(id, { ...records.get(id), ...value });
      return result;
    },
  } as unknown as Firestore;
  return { db, records };
}

test("one generated reading is reused for the same card, UTC day and language", async () => {
  const { db, records } = memoryDb();
  let time = Date.parse("2026-11-05T12:00:00Z");
  let calls = 0;
  const generate = async (day: string) => {
    calls += 1;
    return {
      reading: {
        overview: `An original reading for ${day} with a clear and thoughtful interpretation.`,
        relationships: "Give the relationship a little room for a sincere conversation.",
        work: "Choose one useful task and give it your full attention today.",
        resources: "Look at the practical resources that are already available.",
        innerLife: "Pause long enough to notice what this moment brings up.",
        reflection: "What could one thoughtful choice change for you today?",
      },
      usage: { input: 1, output: 1 },
    };
  };
  const deps = { db, now: () => time, generate };
  const first = await getDailyTarotReading("2026-11-05", "priestess", "en", deps);
  assert.deepEqual(await getDailyTarotReading("2026-11-05", "priestess", "en", deps), first);
  assert.equal(calls, 1);
  assert.equal(records.size, 1);

  time = Date.parse("2026-11-06T12:00:00Z");
  const nextDay = await getDailyTarotReading("2026-11-06", "priestess", "en", deps);
  assert.notEqual(nextDay.overview, first.overview);
  assert.equal(calls, 2);
  assert.equal(records.size, 2);
});

test("localized fallback changes its daily focus and covers every card", () => {
  for (const locale of LOCALES) {
    for (const card of MAJOR_ARCANA) {
      const today = fallbackDailyTarotReading("2026-11-05", card.id, locale);
      const tomorrow = fallbackDailyTarotReading("2026-11-06", card.id, locale);
      assert.notEqual(today.overview, tomorrow.overview);
      validateDailyTarotReading(today, locale);
      validateDailyTarotReading(tomorrow, locale);
      assert.equal(dailyReadingDiffersFromGuide(today, card.id, locale), true, `${locale} ${card.id} daily text is separate`);
      assert.equal(dailyReadingDiffersFromGuide({ ...today, overview: tarotReadings[locale][card.id][0] }, card.id, locale), false, `${locale} ${card.id} guide text is rejected`);
      for (const dailyText of Object.values(today)) {
        for (const guideText of tarotReadings[locale][card.id]) {
          assert.ok(!dailyText.includes(guideText), `${locale} ${card.id} daily copy must differ from the public guide`);
        }
      }
    }
  }
});
