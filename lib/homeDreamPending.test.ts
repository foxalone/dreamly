import assert from "node:assert/strict";
import test from "node:test";
import { HOME_DREAM_PENDING_KEY, readHomeDreamQueue, removeHomeDreamPending, readHomeDreamPending, writeHomeDreamPending, takeHomeDreamPending } from "./homeDreamPending";
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

function withStorage(run: (values: Map<string, string>) => void) {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  } });
  try { run(values); }
  finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("first guest dream and its analysis survive a second dream and import acknowledgements", () => withStorage(() => {
  writeHomeDreamPending("Первый сон о море", {
    analysis: "Готовый анализ первого сна", lang: "ru", lens: "psychological",
    shareToFeed: false, emojis: [{ native: "🌊" }], guestMapIngested: true,
  });
  const first = readHomeDreamPending()!;
  writeHomeDreamPending("Второй сон о лесе", { analysis: "", resumeAnalysis: true, shareToFeed: false });
  const second = readHomeDreamPending()!;
  assert.equal(readHomeDreamQueue().length, 2);
  assert.deepEqual(readHomeDreamQueue()[0], first);
  assert.notEqual(first.createdAtMs, second.createdAtMs);
  assert.equal(second.analysis, undefined);
  assert.equal(second.emojis, undefined);
  assert.equal(second.guestMapIngested, false);
  // A failed save does not acknowledge anything. Both entries remain durable.
  assert.deepEqual(readHomeDreamQueue(), [first, second]);
  // After the first remote save, remove only that entry.
  removeHomeDreamPending(first);
  assert.deepEqual(readHomeDreamQueue(), [second]);
  // Repeating an acknowledgement cannot remove the next dream.
  removeHomeDreamPending(first);
  assert.deepEqual(readHomeDreamQueue(), [second]);
  removeHomeDreamPending(second);
  assert.deepEqual(readHomeDreamQueue(), []);
}));

test("legacy single-dream cache retains its completed analysis when a second is added", () => withStorage((values) => {
  values.set(HOME_DREAM_PENDING_KEY, JSON.stringify({
    text: "Original guest dream", analysis: "Original analysis", createdAtMs: Date.now(), shareToFeed: false,
  }));
  writeHomeDreamPending("New guest dream", { resumeAnalysis: true });
  const queue = readHomeDreamQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].analysis, "Original analysis");
  assert.equal(queue[0].shareToFeed, false);
  assert.equal(queue[1].resumeAnalysis, true);
}));

test("updating an older dream preserves its identity and does not duplicate it or touch newer metadata", () => withStorage(() => {
  writeHomeDreamPending("First", { analysis: "Reading one", shareToFeed: false });
  const id = readHomeDreamPending()!.createdAtMs;
  writeHomeDreamPending("Second", { analysis: "Reading two", shareToFeed: true });
  writeHomeDreamPending("First", { emojis: [{ native: "🌊" }] });
  const queue = readHomeDreamQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].analysis, "Reading one");
  assert.equal(queue[0].createdAtMs, id);
  assert.equal(queue[0].shareToFeed, false);
  assert.equal(queue[1].analysis, "Reading two");
  assert.equal(queue[1].emojis, undefined);
}));

test("queue preserves dream texts and analyses in all six site languages", () => withStorage(() => {
  const texts = ["A forest", "Un bosque", "غابة", "Uma floresta", "Ein Wald", "Лес"];
  for (const text of texts) writeHomeDreamPending(text, { analysis: `Analysis: ${text}` });
  assert.deepEqual(readHomeDreamQueue().map((dream) => [dream.text, dream.analysis]),
    texts.map((text) => [text, `Analysis: ${text}`]));
}));
