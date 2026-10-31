import assert from "node:assert/strict";
import test from "node:test";
import { readGuestNotes, removeGuestNote, writeGuestNote } from "./guestNotes";

function withStorage(run: () => void) {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("guest stories and journal stay in separate lists", () => withStorage(() => {
  writeGuestNote("story", "A story about the sea");
  writeGuestNote("journal", "A private note");
  assert.equal(readGuestNotes("story").length, 1);
  assert.equal(readGuestNotes("story")[0].text, "A story about the sea");
  assert.equal(readGuestNotes("journal")[0].text, "A private note");
  removeGuestNote("story", readGuestNotes("story")[0]);
  assert.deepEqual(readGuestNotes("story"), []);
  assert.equal(readGuestNotes("journal").length, 1);
}));
