import assert from "node:assert/strict";
import test from "node:test";
import { readHomeDreamPending, writeHomeDreamPending, takeHomeDreamPending } from "./homeDreamPending";
import { needsImportedRootRepair } from "./importedDreamRoots";

test("interrupted analysis survives sign-in, is claimed once, and never leaks to another dream", () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  } });
  try {
    writeHomeDreamPending("мне снилось что я в лесу, темно и я не могу найти выход", {
      analysis: "", resumeAnalysis: true, lang: "ru", lens: "psychological", shareToFeed: false,
    });
    writeHomeDreamPending(readHomeDreamPending()!.text, { shareToFeed: false });
    const claimed = takeHomeDreamPending()!;
    assert.equal(claimed.resumeAnalysis, true);
    assert.equal(claimed.lang, "ru");
    assert.equal(claimed.lens, "psychological");
    assert.equal(claimed.shareToFeed, false);
    assert.equal(takeHomeDreamPending(), null);
    writeHomeDreamPending(claimed.text, claimed);
    assert.equal(readHomeDreamPending()!.resumeAnalysis, true);
    writeHomeDreamPending("A different dream");
    assert.equal(readHomeDreamPending()!.resumeAnalysis, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("legacy homepage imports need semantic roots; repaired dreams and normal diary entries do not", () => {
  assert.equal(needsImportedRootRepair({ fromHomeAsk: true }), true);
  assert.equal(needsImportedRootRepair({ fromHomeAsk: true, rootsVersion: 1 }), false);
  assert.equal(needsImportedRootRepair({}), false);
});
