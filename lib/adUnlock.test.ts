import assert from "node:assert/strict";
import test from "node:test";
import { adUnlockUrl, clearAdUnlockPending, peekAdUnlockPending, setAdUnlockPending, takeAdUnlockPending } from "./adUnlock";
import { localePath } from "./i18n/path";
import { readHomeDreamQueue, writeHomeDreamPending } from "./homeDreamPending";

test("guest ad returns to the localized journal and only the submitted dream resumes", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  try {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
    for (const locale of ["en", "es", "ar", "pt", "de", "ru"] as const) {
      values.clear();
      Object.defineProperty(globalThis, "window", { configurable: true, value: {
        localStorage: storage,
        location: { pathname: localePath("/dreams", locale), search: "" },
      } });
      writeHomeDreamPending("An earlier unfinished dream", { analysis: "" });
      writeHomeDreamPending("The submitted dream", { analysis: "", lens: "spiritual", lang: locale, shareToFeed: false });
      setAdUnlockPending({ kind: "analysis", dreamText: "The submitted dream" });
      const url = new URL(adUnlockUrl("analysis", localePath("/app/dreams", locale)), "https://dreamly.art");
      assert.equal(url.searchParams.get("next"), locale === "en" ? "/app/dreams" : `/${locale}/app/dreams`);
      assert.equal(url.searchParams.get("locale"), locale);

      // Journal cards mount newest first, but any other card must leave the retry intact.
      assert.equal(takeAdUnlockPending("analysis", "An earlier unfinished dream"), null);
      assert.equal(peekAdUnlockPending("analysis")?.dreamText, "The submitted dream");
      const submitted = readHomeDreamQueue().find((dream) => dream.text === "The submitted dream")!;
      assert.equal(submitted.lens, "spiritual");
      assert.equal(submitted.lang, locale);
      assert.equal(submitted.shareToFeed, false);
      assert.equal(takeAdUnlockPending("analysis", submitted.text)?.dreamText, submitted.text);
      assert.equal(takeAdUnlockPending("analysis", submitted.text), null);

      // A quick-symbol retry must never be consumed by a guest journal card.
      setAdUnlockPending({ kind: "analysis", quickSymbol: { query: "a humming doorway", lens: "spiritual" } });
      assert.equal(takeAdUnlockPending("analysis", submitted.text), null);
      assert.deepEqual(takeAdUnlockPending("analysis")?.quickSymbol, { query: "a humming doorway", lens: "spiritual" });

      // Back after an unavailable ad keeps the dream but must not retry it
      // automatically and reopen the same ad flow in the journal.
      setAdUnlockPending({ kind: "analysis", dreamText: submitted.text });
      clearAdUnlockPending();
      assert.equal(takeAdUnlockPending("analysis", submitted.text), null);
      assert.deepEqual(readHomeDreamQueue().find((dream) => dream.text === submitted.text), submitted);
    }
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousSession) Object.defineProperty(globalThis, "sessionStorage", previousSession);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
