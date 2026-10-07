import assert from "node:assert/strict";
import test from "node:test";
import { createRewardedAd, loadGpt, type RewardedGpt, type RewardedState } from "./rewardedAd";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture(onGranted: () => Promise<boolean> = async () => true, showWhenReady = false) {
  type Event = Parameters<Parameters<ReturnType<RewardedGpt["pubads"]>["addEventListener"]>[1]>[0];
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const slot = { addService() {} };
  let destroyed = 0;
  let done = 0;
  const states: RewardedState[] = [];
  const gt: RewardedGpt = {
    cmd: { push: (fn) => fn() }, apiReady: true,
    enums: { OutOfPageFormat: { REWARDED: 1 } },
    defineOutOfPageSlot: () => slot,
    pubads: () => ({
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    }),
    enableServices() {}, display() {}, destroySlots() { destroyed++; },
  };
  const session = createRewardedAd({
    showWhenReady, load: async () => gt, onState: (s) => states.push(s), onGranted,
    onDone: () => { done++; },
  });
  return {
    gt, slot, session, states,
    get destroyed() { return destroyed; }, get done() { return done; },
    get listenerCount() { return [...listeners.values()].reduce((n, set) => n + set.size, 0); },
    emit(type: string, extra: Partial<Event> = {}) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn({ slot, ...extra });
    },
  };
}

test("reward is saved once at grant, but retry waits for close and server success", async () => {
  let grants = 0;
  let complete!: (ok: boolean) => void;
  const f = fixture(() => { grants++; return new Promise((resolve) => { complete = resolve; }); });
  await flush();
  f.emit("rewardedSlotReady", { makeRewardedVisible: () => true });
  assert.equal(grants, 0);
  assert.equal(f.session.show(), true);
  assert.equal(f.session.show(), false);
  f.emit("rewardedSlotGranted");
  f.emit("rewardedSlotGranted");
  assert.equal(grants, 1);
  assert.equal(f.done, 0);
  f.emit("rewardedSlotClosed");
  assert.equal(f.destroyed, 1);
  assert.equal(f.listenerCount, 0);
  assert.equal(f.done, 0);
  complete(true);
  await flush();
  assert.equal(f.done, 1);
  f.session.dispose();
  assert.equal(f.destroyed, 1);
});

test("disposing after grant preserves request and suppresses stale retry", async () => {
  let complete!: (ok: boolean) => void;
  let saved = false;
  const f = fixture(async () => {
    const ok = await new Promise<boolean>((resolve) => { complete = resolve; });
    saved = ok;
    return ok;
  });
  await flush();
  f.emit("rewardedSlotReady", { makeRewardedVisible: () => true });
  f.session.show();
  f.emit("rewardedSlotGranted");
  f.emit("rewardedSlotClosed");
  f.session.dispose();
  complete(true);
  await flush();
  assert.equal(saved, true);
  assert.equal(f.done, 0);
});

test("rejected and throwing display clear busy state and clean up", async () => {
  for (const makeRewardedVisible of [() => false, () => { throw new Error("display failed"); }]) {
    const f = fixture();
    await flush();
    f.emit("rewardedSlotReady", { makeRewardedVisible });
    assert.equal(f.session.show(), false);
    assert.equal(f.states.at(-1), "failed");
    assert.equal(f.destroyed, 1);
    assert.equal(f.listenerCount, 0);
    f.session.dispose();
  }
});

test("close without grant never awards a credit; failed grant never retries action", async () => {
  for (const granted of [false, true]) {
    let grants = 0;
    const f = fixture(async () => { grants++; throw new Error("server unavailable"); });
    await flush();
    f.emit("rewardedSlotReady", { makeRewardedVisible: () => true });
    f.session.show();
    if (granted) f.emit("rewardedSlotGranted");
    f.emit("rewardedSlotClosed");
    await flush();
    assert.equal(grants, granted ? 1 : 0);
    assert.equal(f.done, 0);
    assert.equal(f.states.at(-1), granted ? "failed" : "unavailable");
    f.session.dispose();
  }
});

test("no fill and timeout release slot and ignore late events", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const timeout of [false, true]) {
    const f = fixture();
    await flush();
    if (timeout) t.mock.timers.tick(30_000);
    else f.emit("slotRenderEnded", { isEmpty: true });
    f.emit("rewardedSlotReady", { makeRewardedVisible: () => true });
    assert.equal(f.states.at(-1), "unavailable");
    assert.equal(f.session.show(), false);
    assert.equal(f.destroyed, 1);
    assert.equal(f.listenerCount, 0);
    f.session.dispose();
  }
});

test("unsupported devices and GPT request exceptions fail cleanly", async () => {
  for (const unsupported of [true, false]) {
    const f = fixture();
    if (unsupported) f.gt.defineOutOfPageSlot = () => null;
    else f.gt.display = () => { throw new Error("request failed"); };
    await flush();
    assert.equal(f.states.at(-1), "unavailable");
    assert.equal(f.listenerCount, 0);
    assert.equal(f.destroyed, unsupported ? 0 : 1);
    f.session.dispose();
  }
});

test("unmount while loading cannot create an orphan slot", async () => {
  const f = fixture();
  f.session.dispose();
  await flush();
  assert.equal(f.listenerCount, 0);
  assert.equal(f.destroyed, 0);
  assert.deepEqual(f.states, []);
});

test("GPT loader removes failed script, retries and waits for command queue", async (t) => {
  let current: FakeScript | null = null;
  class FakeScript extends EventTarget {
    src = "";
    async = false;
    crossOrigin = "";
    remove() { if (current === this) current = null; }
  }
  const win = { googletag: { cmd: [] as Array<() => void> } };
  const doc = {
    querySelector: () => current,
    createElement: () => new FakeScript(),
    head: { appendChild: (s: FakeScript) => { current = s; } },
  };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const timedOut = loadGpt();
  const timeoutFailure = assert.rejects(timedOut, /GPT unavailable/);
  t.mock.timers.tick(10_000);
  await timeoutFailure;
  assert.equal(current, null);
  const first = loadGpt();
  assert.equal(loadGpt(), first);
  const failure = assert.rejects(first, /GPT unavailable/);
  (current as unknown as FakeScript).dispatchEvent(new Event("error"));
  await failure;
  assert.equal(current, null);
  // Another integration may already have added a tag that is still loading.
  current = new FakeScript();
  const existing = current;
  let resolved = false;
  const next = loadGpt().then(() => { resolved = true; });
  await flush();
  assert.equal(current, existing);
  assert.equal(resolved, false);
  for (const callback of win.googletag.cmd) callback();
  await next;
  assert.equal(resolved, true);
});


test("opted-in request opens on ready but grants only on granted", async () => {
  let shown = 0;
  let grants = 0;
  const f = fixture(async () => { grants++; return true; }, true);
  await flush();
  f.emit("rewardedSlotReady", { makeRewardedVisible: () => { shown++; return true; } });
  assert.equal(shown, 1);
  assert.equal(grants, 0);
  f.emit("rewardedSlotGranted");
  f.emit("rewardedSlotGranted");
  assert.equal(grants, 1);
  f.session.dispose();
});

test("GPT loading time does not consume the ad response timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  // Advance while the GPT promise has not resolved yet.
  t.mock.timers.tick(10_000);
  await flush();
  t.mock.timers.tick(29_000);
  assert.equal(f.destroyed, 0);
  f.emit("rewardedSlotReady", { makeRewardedVisible: () => true });
  assert.equal(f.session.show(), true);
  f.session.dispose();
});
