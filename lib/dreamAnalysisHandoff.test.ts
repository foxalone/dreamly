import assert from "node:assert/strict";
import test from "node:test";
import { queueDreamAnalysis, takeDreamAnalysisResume } from "./dreamAnalysisHandoff";
import { readHomeDreamQueue } from "./homeDreamPending";
import { adUnlockUrl, markAdUnlockReady, peekAdUnlockPending, setAdUnlockPending, takeAdUnlockPending } from "./adUnlock";
import { captureOfferwallDeparture, startOfferwallSession, updateOfferwallSession } from "./offerwallSession";
import { localePath } from "./i18n/path";

test("all dream entry points hand off to Dreams with one matching resume before/after an ad in every locale", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  try {
    for (const locale of ["en", "es", "ar", "pt", "de", "ru"] as const) {
      for (const source of ["/", "/dreams", "/dreams/snake", "/gallery"]) {
        values.clear();
        Object.defineProperty(globalThis, "window", { configurable: true, value: {
          localStorage: storage, location: { pathname: localePath(source, locale), search: "" },
        } });
        const journal = localePath("/app/dreams", locale);
        queueDreamAnalysis("A different unfinished dream", locale, "psychological", true);
        assert.equal(queueDreamAnalysis("The selected dream", locale, "spiritual", false), journal);
        const selected = readHomeDreamQueue().find(dream => dream.text === "The selected dream")!;
        assert.equal(selected.lang, locale);
        assert.equal(selected.lens, "spiritual");
        assert.equal(selected.shareToFeed, false);
        assert.equal(selected.resumeAnalysis, true);
        assert.equal(takeDreamAnalysisResume(selected.text), true);
        assert.equal(takeDreamAnalysisResume(selected.text), false);

        // Ad return never goes back to the source form, even for an old caller.
        queueDreamAnalysis(selected.text, locale, "spiritual", false);
        setAdUnlockPending({ kind: "analysis", dreamText: selected.text });
        const adUrl = new URL(adUnlockUrl("analysis", localePath(source, locale)), "https://dreamly.art");
        assert.equal(adUrl.searchParams.get("next"), journal);
        assert.equal(takeDreamAnalysisResume(selected.text), false);
        assert.equal(peekAdUnlockPending("analysis")?.dreamText, selected.text);
        markAdUnlockReady();
        assert.equal(takeDreamAnalysisResume(selected.text), true);
        assert.equal(takeDreamAnalysisResume(selected.text), false);
        assert.equal(readHomeDreamQueue().length, 2);

        // Signed-in dreams keep their document ID through the same ad journey.
        setAdUnlockPending({ kind: "analysis", dreamId: "saved-dream-id" });
        const session = startOfferwallSession(localePath(source, locale), "signed-receipt", "");
        assert.equal(session?.next, journal);
        updateOfferwallSession({ shown: true });
        assert.equal(captureOfferwallDeparture("", false)?.status, "completed");
        assert.equal(takeAdUnlockPending("analysis"), null);
        updateOfferwallSession({ status: "granted" });
        assert.equal(takeDreamAnalysisResume(selected.text), false);
        assert.equal(takeAdUnlockPending("analysis")?.dreamId, "saved-dream-id");
      }
    }
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldSession) Object.defineProperty(globalThis, "sessionStorage", oldSession);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
