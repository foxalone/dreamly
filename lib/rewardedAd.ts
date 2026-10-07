import { REWARDED_AD_UNIT_PATH } from "./subscriptions/plans";

// The subset of GPT used by the rewarded flow. GPT owns the slot's DOM.
type Slot = { addService: (service: PubAds) => unknown };
type AdEvent = { slot: Slot; isEmpty?: boolean; makeRewardedVisible?: () => boolean };
type Listener = (event: AdEvent) => void;
type PubAds = {
  addEventListener: (type: string, listener: Listener) => void;
  removeEventListener: (type: string, listener: Listener) => void;
};
export type RewardedGpt = {
  cmd: { push: (callback: () => void) => unknown };
  apiReady?: boolean;
  enums: { OutOfPageFormat: { REWARDED: number } };
  defineOutOfPageSlot: (path: string, format: number) => Slot | null;
  pubads: () => PubAds;
  enableServices: () => void;
  display: (slot: Slot) => void;
  destroySlots: (slots: Slot[]) => unknown;
};

declare global {
  interface Window {
    googletag?: RewardedGpt;
  }
}

const GPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
const READY_TIMEOUT_MS = 10_000;
const AD_TIMEOUT_MS = 30_000;
// Temporary diagnostics: no auth tokens or user identifiers are logged.
function log(event: string, details: Record<string, unknown> = {}) {
  console.info("[Dreamly rewarded]", event, details);
}
let gptPromise: Promise<RewardedGpt> | null = null;

export function loadGpt(): Promise<RewardedGpt> {
  if (window.googletag?.apiReady) return Promise.resolve(window.googletag);
  if (gptPromise) return gptPromise;
  const pending = new Promise<RewardedGpt>((resolve, reject) => {
    window.googletag ??= { cmd: [] } as unknown as RewardedGpt;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("error", failed);
    };
    const failed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove(); // A later attempt must be able to load a fresh script.
      log("GPT load failed", { reason: "script error or timeout" });
      reject(new Error("GPT unavailable"));
    };
    const timer = setTimeout(failed, READY_TIMEOUT_MS);
    script.addEventListener("error", failed);
    // An existing script tag or its load event alone does not mean GPT is ready.
    window.googletag.cmd.push(() => {
      if (settled) return;
      settled = true;
      cleanup();
      log("GPT loaded");
      resolve(window.googletag!);
    });
    if (!existing) {
      script.src = GPT_SRC;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });
  gptPromise = pending;
  void pending.catch(() => { if (gptPromise === pending) gptPromise = null; });
  return pending;
}

export type RewardedState = "loading" | "ready" | "busy" | "unavailable" | "failed";

/** One ad attempt; saving the reward survives disposal, UI callbacks do not. */
export function createRewardedAd(options: {
  onState: (state: RewardedState) => void;
  onGranted: (rewardId: string) => Promise<boolean>;
  onDone: () => void;
  load?: () => Promise<RewardedGpt>;
  showWhenReady?: boolean;
}) {
  let disposed = false;
  let ended = false;
  let opened = false;
  let gt: RewardedGpt | undefined;
  let slot: Slot | null = null;
  let show: (() => boolean) | null = null;
  let reward: Promise<boolean> | null = null;
  const listeners: Array<[string, Listener]> = [];
  const rewardId = crypto.randomUUID();
  let readyReceived = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cleanup() {
    clearTimeout(timer);
    show = null;
    if (!gt) return;
    for (const [type, listener] of listeners.splice(0)) gt.pubads().removeEventListener(type, listener);
    const oldSlot = slot;
    slot = null;
    if (oldSlot) gt.destroySlots([oldSlot]);
  }
  function fail(state: "unavailable" | "failed") {
    if (disposed || ended) return;
    ended = true;
    cleanup();
    options.onState(state);
  }

  queueMicrotask(() => { if (!disposed && !ended) options.onState("loading"); });
  void (options.load ?? loadGpt)().then((loaded) => {
    if (disposed || ended) return;
    gt = loaded;
    log("GPT loaded", { apiReady: gt.apiReady });
    log("Rewarded slot path", { path: REWARDED_AD_UNIT_PATH });
    timer = setTimeout(() => {
      log("rewardedSlotReady timeout", { readyReceived, timeoutMs: AD_TIMEOUT_MS });
      fail("unavailable");
    }, AD_TIMEOUT_MS);
    slot = gt.defineOutOfPageSlot(REWARDED_AD_UNIT_PATH, gt.enums.OutOfPageFormat.REWARDED);
    if (!slot) { log("Rewarded format unsupported"); fail("unavailable"); return; }
    log("Rewarded slot created");
    slot.addService(gt.pubads());
    const on = (type: string, callback: Listener) => {
      const listener: Listener = (event) => {
        if (!disposed && !ended && event.slot === slot) callback(event);
      };
      gt!.pubads().addEventListener(type, listener);
      listeners.push([type, listener]);
    };
    on("rewardedSlotReady", (event) => {
      readyReceived = true;
      log("rewardedSlotReady");
      if (opened) return;
      clearTimeout(timer);
      show = () => event.makeRewardedVisible?.() === true;
      options.onState("ready");
      if (options.showWhenReady) showAd();
    });
    on("slotRenderEnded", (event) => {
      log("slotRenderEnded", { "slotRenderEnded.isEmpty": event.isEmpty });
      if (event.isEmpty) fail("unavailable");
    });
    on("rewardedSlotGranted", () => {
      log("rewardedSlotGranted");
      if (!opened || reward) return;
      // Start the server request immediately, once, without waiting for close.
      log("credit grant request started");
      reward = (async () => options.onGranted(rewardId))().catch(() => false).then((ok) => {
        log(ok ? "credit grant succeeded" : "credit grant failed");
        return ok;
      });
    });
    on("rewardedSlotClosed", () => {
      log("rewardedSlotClosed", { readyReceived, granted: Boolean(reward) });
      ended = true;
      cleanup();
      if (!reward) { options.onState("unavailable"); return; }
      options.onState("busy");
      void reward.then((ok) => {
        if (disposed) return;
        if (ok) options.onDone();
        else options.onState("failed");
      });
    });
    gt.enableServices();
    log("Rewarded request started");
    gt.display(slot);
  }).catch((error) => { log("Rewarded request failed", { message: String(error) }); fail("unavailable"); });

  function showAd() {
    if (disposed || ended || opened || !show) return false;
    const makeVisible = show;
    show = null;
    opened = true;
    options.onState("busy");
    try {
      if (makeVisible()) { log("Rewarded ad opened"); return true; }
    } catch { /* Treat a GPT display exception like a rejected display. */ }
    log("Rewarded display rejected");
    fail("failed");
    return false;
  }

  return {
    show: showAd,
    dispose() {
      disposed = true;
      cleanup();
    },
  };
}
