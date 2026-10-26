/**
 * Rewarded ad via the AdSense Offerwall ("View a short ad").
 *
 * Google Ad Manager's own rewarded slot (lib/rewardedAd.ts) is only filled by
 * line items / Ad Exchange, which this network does not have, so GPT answers
 * "no fill". The AdSense Offerwall, on the other hand, is filled by Google
 * itself — but it cannot be opened from JavaScript: it renders on page load,
 * on the pages included in its AdSense configuration. Dreamly therefore uses
 * a dedicated page, /ad/unlock, where the Offerwall is configured to appear at
 * once ("Show after 0 page views"). The page waits for the Offerwall to be shown
 * and closed, books the selected action with the same /ad-reward routes, and returns
 * to `next`.
 *
 * The action to resume is kept in sessionStorage (the paywall's retry closure
 * cannot survive the navigation).
 */
import type { PaywallKind } from "@/lib/paywall";
import { localePath, localeFromPathname } from "@/lib/i18n/path";

export const AD_UNLOCK_PATH = "/ad/unlock";

const PENDING_KEY = "dreamly.adUnlock";

export type AdUnlockPending = {
  kind: PaywallKind;
  /** Full guest dream: only its journal card may consume the analysis retry. */
  dreamText?: string;
  quickSymbol?: { query: string; lens: import("@/lib/dream-lenses").DreamLens };
  /** feed translation: the shared dream to translate when back */
  dreamId?: string;
  targetLang?: string;
  /** Keep an unsaved journal entry across the Offerwall's full navigation. */
  draft?: { text: string; tab: "DREAMS" | "STORIES"; usedVoice: boolean };
  /** Set only after the server confirms ad access or the first-free fallback. */
  ready?: boolean;
  atMs: number;
};

export function adUnlockUrl(kind: PaywallKind, next?: string, translation?: { sharedDreamId: string; targetLang: string }) {
  const params = new URLSearchParams({ kind });
  if (kind === "translate" && translation) {
    params.set("sharedDreamId", translation.sharedDreamId);
    params.set("targetLang", translation.targetLang);
  }
  const target = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  const locale = localeFromPathname(typeof window !== "undefined" ? window.location.pathname : target);
  params.set("next", kind === "analysis" ? localePath("/app/dreams", locale) : safeNext(target));
  if (typeof window !== "undefined") params.set("locale", locale);
  return `${AD_UNLOCK_PATH}?${params.toString()}`;
}

/** Only same-origin paths are followed back. */
export function safeNext(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith(AD_UNLOCK_PATH)) return "/";
  return s;
}

export function setAdUnlockPending(p: Omit<AdUnlockPending, "atMs">) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...p, atMs: Date.now() }));
  } catch {
    /* private mode etc. — other actions still work; a translation needs its target */
  }
}

export function clearAdUnlockPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** A navigation back is not a grant. Keep the action until access is confirmed. */
export function markAdUnlockReady() {
  try {
    const pending = peekAdUnlockPending();
    if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, ready: true }));
  } catch { /* Storage may be unavailable. */ }
}

/** Returns and clears a ready action, if any and recent (10 min). */
export function takeAdUnlockPending(kind?: PaywallKind, dreamText?: string): AdUnlockPending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AdUnlockPending;
    if (kind && p.kind !== kind) return null;
    if (dreamText !== undefined && (p.quickSymbol || (p.dreamId && !p.dreamText))) return null;
    if (dreamText !== undefined && p.dreamText && p.dreamText !== dreamText) return null;
    if (p?.kind === "analysis" && p.ready !== true) return null;
    sessionStorage.removeItem(PENDING_KEY);
    if (!p || typeof p.atMs !== "number" || Date.now() - p.atMs > 10 * 60_000) return null;
    return p;
  } catch {
    return null;
  }
}

/** Read the selected action on the Offerwall page without consuming its return-to-feed retry. */
export function peekAdUnlockPending(kind?: PaywallKind): AdUnlockPending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AdUnlockPending;
    return p && (!kind || p.kind === kind) && typeof p.atMs === "number" && Date.now() - p.atMs <= 10 * 60_000 ? p : null;
  } catch {
    return null;
  }
}

/**
 * Elements the AdSense Offerwall (Funding Choices) adds to the page. Class
 * and id names are prefixed "fc-"; the dialog itself is a fixed overlay.
 */
export function isOfferwallElement(el: Element): boolean {
  const cls = typeof el.className === "string" ? el.className : "";
  const id = el.id ?? "";
  return /(^|\s)fc-/.test(cls) || id.startsWith("fc-") || /(^|\s)fc-/.test(el.getAttribute("class") ?? "");
}

/**
 * The Offerwall grants an entitlement after the ad (configured as "1 page
 * view") and keeps it in the first-party cookie FCOEC. That page view would be
 * the NEXT visit to /ad/unlock, so the Offerwall would only render every other
 * time. The action is already booked on our server by then, so once it is,
 * the entitlement is dropped and the next unlock shows an ad again.
 */
export function clearOfferwallEntitlement() {
  try {
    const host = window.location.hostname;
    for (const domain of ["", host, `.${host}`]) {
      document.cookie = `FCOEC=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  } catch {
    /* ignore */
  }
}
