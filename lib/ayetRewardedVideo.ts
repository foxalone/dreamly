const SDK_URL = "https://cdn.ayet.io/offerwall/js/ayetvideosdk.min.js";

export type AyetAdConfig = { placementId: number; adSlot: string; attemptId: string };

export type AyetVideoSdk = {
  init: (placementId: number, externalIdentifier: string, optionalParameter: null) => Promise<unknown>;
  requestAd: (adSlot: string, ready: () => void, failed: () => void) => void;
  playFullsizeAd: () => void;
  destroy: () => void;
  callbackError?: () => void;
  callbackPlaying?: () => void;
  callbackComplete?: () => void;
  callbackRewarded?: (details: unknown) => void;
};

declare global {
  interface Window {
    AyetVideoSdk?: AyetVideoSdk;
    __tcfapi?: (...args: unknown[]) => void;
  }
}

export class AyetPlaybackError extends Error {
  constructor(public reason: "unavailable" | "interrupted") { super(reason); }
}

export function loadAyetPlayer(signal: AbortSignal, { title, cancelLabel, onCancel }: { title: string; cancelLabel: string; onCancel: () => void }) {
  if (signal.aborted) return Promise.reject(new AyetPlaybackError("interrupted"));
  return new Promise<{ sdk: AyetVideoSdk; show: () => void; close: () => void }>((resolve, reject) => {
    // init() keeps the first externalIdentifier in a window. Each attempt needs a fresh SDK.
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[130] bg-black";
    overlay.hidden = true;
    const frame = document.createElement("iframe");
    frame.className = "block h-full w-full border-0";
    frame.title = title;
    frame.allow = "autoplay; fullscreen";
    frame.src = "/ayet-player.html";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "absolute end-3 bottom-3 rounded-full bg-black/80 px-4 py-2 text-sm font-medium text-white";
    cancel.textContent = cancelLabel;
    cancel.onclick = onCancel;
    overlay.append(frame, cancel);

    function close() { overlay.remove(); }
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
    function fail(reason: AyetPlaybackError["reason"]) {
      finish();
      close();
      reject(new AyetPlaybackError(reason));
    }
    function abort() { fail("interrupted"); }
    const timer = setTimeout(() => fail("unavailable"), 15_000);
    signal.addEventListener("abort", abort, { once: true });
    frame.onload = () => {
      const target = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!target || !doc) return fail("unavailable");
      if (typeof window.__tcfapi === "function") target.__tcfapi = window.__tcfapi.bind(window);
      const script = doc.createElement("script");
      script.src = SDK_URL;
      script.onerror = () => fail("unavailable");
      script.onload = () => {
        if (!target.AyetVideoSdk) return fail("unavailable");
        finish();
        resolve({ sdk: target.AyetVideoSdk, show: () => { overlay.hidden = false; cancel.focus(); }, close });
      };
      doc.head.appendChild(script);
    };
    document.body.appendChild(overlay);
  });
}

export function playAyetRewarded(sdk: AyetVideoSdk, config: AyetAdConfig, signal: AbortSignal, show: () => void): Promise<unknown> {
  if (signal.aborted) return Promise.reject(new AyetPlaybackError("interrupted"));
  return new Promise((resolve, reject) => {
    let settled = false;
    let playing = false;
    let timer: ReturnType<typeof setTimeout>;
    const previousError = sdk.callbackError;
    const previousPlaying = sdk.callbackPlaying;
    const previousComplete = sdk.callbackComplete;
    const previousRewarded = sdk.callbackRewarded;

    function finish(error?: AyetPlaybackError, reward?: unknown) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      sdk.callbackError = previousError;
      sdk.callbackPlaying = previousPlaying;
      sdk.callbackComplete = previousComplete;
      sdk.callbackRewarded = previousRewarded;
      try { sdk.destroy(); } catch { /* A failed ad may have no player to remove. */ }
      if (error) reject(error);
      else resolve(reward);
    }

    function abort() { finish(new AyetPlaybackError("interrupted")); }
    function unavailable() { finish(new AyetPlaybackError("unavailable")); }
    function wait(ms: number, expired: () => void) {
      clearTimeout(timer);
      timer = setTimeout(expired, ms);
    }

    signal.addEventListener("abort", abort, { once: true });
    wait(25_000, unavailable);
    void Promise.resolve().then(() => sdk.init(config.placementId, config.attemptId, null)).then(() => {
      if (settled) return;
      sdk.callbackError = () => playing ? abort() : unavailable();
      sdk.callbackPlaying = () => {
        playing = true;
        wait(5 * 60_000, abort);
      };
      // The player can close before ayeT finishes checking the view.
      sdk.callbackComplete = () => wait(20_000, abort);
      sdk.callbackRewarded = details => {
        if (details && typeof details === "object" && "externalIdentifier" in details && details.externalIdentifier === config.attemptId) {
          finish(undefined, details);
        }
      };
      sdk.requestAd(config.adSlot, () => {
        if (settled) return;
        try { show(); sdk.playFullsizeAd(); } catch { unavailable(); }
      }, unavailable);
    }).catch(unavailable);
  });
}
