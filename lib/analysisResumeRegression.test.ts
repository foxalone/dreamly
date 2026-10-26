import assert from "node:assert/strict";
import test from "node:test";
import { bindAdUnlockDream, markAdUnlockReady, peekAdUnlockPending, setAdUnlockPending, takeAdUnlockPending } from "./adUnlock";
import { queueDreamAnalysis, takeDreamAnalysisResume } from "./dreamAnalysisHandoff";
import { readHomeDreamQueue } from "./homeDreamPending";

test("new dreams resume despite abandoned ads; account imports preserve the exact granted action", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  try {
    for (const locale of ["en", "es", "ar", "pt", "de", "ru"] as const) {
      values.clear();
      queueDreamAnalysis("An older dream", locale, "psychological", false);
      setAdUnlockPending({ kind: "analysis", dreamText: "An older dream" });
      queueDreamAnalysis("A fresh dream", locale, "spiritual", true);
      assert.equal(peekAdUnlockPending("analysis"), null);
      assert.equal(takeDreamAnalysisResume("A fresh dream"), true);
      assert.equal(takeDreamAnalysisResume("A fresh dream"), false);
      assert.equal(takeDreamAnalysisResume("An older dream"), false, "only the newly selected dream should start");
      assert.equal(readHomeDreamQueue().length, 2, "superseding an ad must preserve saved dreams");

      // Only the selected action can claim the ad's retry.
      setAdUnlockPending({ kind: "analysis", dreamText: "A fresh dream" });
      assert.equal(takeDreamAnalysisResume("An older dream"), false);
      assert.equal(takeDreamAnalysisResume("A fresh dream"), false);
      markAdUnlockReady();
      const receiptTime = peekAdUnlockPending("analysis")!.atMs;
      bindAdUnlockDream("Unrelated text", "wrong-document");
      assert.equal(peekAdUnlockPending("analysis")!.dreamId, undefined);
      bindAdUnlockDream("A fresh dream", "imported-document");
      assert.equal(takeDreamAnalysisResume("A fresh dream"), false, "a guest card cannot consume an account retry");
      const action = takeAdUnlockPending("analysis");
      assert.equal(action?.dreamId, "imported-document");
      assert.equal(action?.ready, true);
      assert.equal(action?.atMs, receiptTime);
      assert.equal(takeAdUnlockPending("analysis"), null);
    }
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldSession) Object.defineProperty(globalThis, "sessionStorage", oldSession);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
