import { parseDreamLens, type DreamLens } from "@/lib/dream-lenses";

import { DREAM_MAX_CHARS, clampDreamText, isDreamTooLong } from "@/lib/dreamLength";

export const HOME_DREAM_PENDING_KEY = "dreamly:homeDreamPending";
export const HOME_DREAM_MAX_CHARS = DREAM_MAX_CHARS;
const HOME_DREAM_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type HomeDreamCity = {
  cityId: string;
  city: string;
  country: string;
  admin1: string;
};

export type HomeDreamPending = {
  text: string;
  analysis?: string;
  resumeAnalysis?: boolean;
  /** Share this dream anonymously to the public feed. (Map pins happen for every dream.) */
  shareToFeed?: boolean;
  lang?: string;
  lens?: DreamLens;
  createdAtMs?: number;
  emojis?: { native: string; id?: string; name?: string }[];
  iconsEn?: string[];
  rootsEn?: string[];
  city?: HomeDreamCity;
  guestMapIngested?: boolean;
  /** shared_dreams/guest_{guestId} when the guest shared this dream anonymously; claimed on sign-in. */
  guestSharedId?: string;
};

function normalizeCity(raw: unknown): HomeDreamCity | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const parsed = raw as HomeDreamCity;
  const cityId = String(parsed.cityId ?? "").trim();
  const city = String(parsed.city ?? "").trim();
  const country = String(parsed.country ?? "").trim();
  const admin1 = String(parsed.admin1 ?? "").trim();
  if (!cityId || !city || !country) return undefined;
  return { cityId, city, country, admin1 };
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalize(raw: unknown): HomeDreamPending | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as HomeDreamPending;
  const text = String(parsed.text ?? "").trim();
  if (!text) return null;
  if (isDreamTooLong(text)) return null;

  const createdAtMs = Number(parsed.createdAtMs ?? 0);
  if (createdAtMs && Date.now() - createdAtMs > HOME_DREAM_TTL_MS) return null;

  const analysis = String(parsed.analysis ?? "").trim();
  return {
    text,
    analysis: analysis || undefined,
    resumeAnalysis: parsed.resumeAnalysis === true,
    // Older caches stored the same choice as `shareToMap`.
    shareToFeed: (parsed.shareToFeed ?? (parsed as { shareToMap?: boolean }).shareToMap) !== false,
    lang: typeof parsed.lang === "string" ? parsed.lang : undefined,
    lens: parsed.lens ? parseDreamLens(parsed.lens) : undefined,
    createdAtMs: createdAtMs || Date.now(),
    emojis: Array.isArray(parsed.emojis) ? parsed.emojis.filter((item) => item?.native) : undefined,
    iconsEn: Array.isArray(parsed.iconsEn) ? parsed.iconsEn.map(String).filter(Boolean) : undefined,
    rootsEn: Array.isArray(parsed.rootsEn) ? parsed.rootsEn.map(String).filter(Boolean) : undefined,
    city: normalizeCity(parsed.city),
    guestMapIngested: parsed.guestMapIngested === true,
    guestSharedId: typeof parsed.guestSharedId === "string" && parsed.guestSharedId ? parsed.guestSharedId : undefined,
  };
}

/** Old single-dream caches are read as a one-item queue. */
export function readHomeDreamQueue(): HomeDreamPending[] {
  try {
    const raw = storage()?.getItem(HOME_DREAM_PENDING_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : [parsed])
      .map(normalize).filter((item): item is HomeDreamPending => item !== null);
  } catch {
    return [];
  }
}

function saveQueue(queue: HomeDreamPending[]) {
  if (queue.length) storage()?.setItem(HOME_DREAM_PENDING_KEY, JSON.stringify(queue));
  else storage()?.removeItem(HOME_DREAM_PENDING_KEY);
}

/** The form restores the latest dream; import processes the queue oldest first. */
export function readHomeDreamPending(): HomeDreamPending | null {
  const queue = readHomeDreamQueue();
  return queue[queue.length - 1] ?? null;
}

/** Remove only the acknowledged entry, preserving dreams added in the meantime. */
export function removeHomeDreamPending(pending: HomeDreamPending) {
  saveQueue(readHomeDreamQueue().filter((item) =>
    item.createdAtMs !== pending.createdAtMs || item.text !== pending.text
  ));
}

export function writeHomeDreamPending(text: string, extra?: Omit<HomeDreamPending, "text">) {
  try {
    const cleaned = text.trim();
    if (!cleaned) return;
    const nextText = clampDreamText(cleaned).trim();
    const queue = readHomeDreamQueue();
    const prevRaw = queue[queue.length - 1];
    const index = queue.findIndex((item) => item.text === nextText);
    const prev = index >= 0 ? queue[index] : undefined;
    const next: HomeDreamPending = {
      text: nextText,
      resumeAnalysis: extra?.resumeAnalysis ?? prev?.resumeAnalysis,
      analysis: extra && extra.analysis !== undefined ? extra.analysis.trim() || undefined : prev?.analysis,
      shareToFeed: extra?.shareToFeed ?? prev?.shareToFeed ?? prevRaw?.shareToFeed ?? true,
      lang: extra?.lang || prev?.lang || prevRaw?.lang,
      lens: extra?.lens || prev?.lens || prevRaw?.lens,
      createdAtMs: prev?.createdAtMs || extra?.createdAtMs || Math.max(Date.now(), ...queue.map((item) => (item.createdAtMs ?? 0) + 1)),
      emojis: extra?.emojis ?? prev?.emojis,
      iconsEn: extra?.iconsEn ?? prev?.iconsEn,
      rootsEn: extra?.rootsEn ?? prev?.rootsEn,
      city: extra && "city" in extra ? extra.city : prevRaw?.city,
      guestMapIngested: extra?.guestMapIngested ?? prev?.guestMapIngested,
      guestSharedId: extra?.guestSharedId ?? prev?.guestSharedId,
    };
    if (index >= 0) queue[index] = next;
    else queue.push(next);
    saveQueue(queue);
  } catch {
    // ignore quota / private mode
  }
}

export function clearHomeDreamPending() {
  try {
    storage()?.removeItem(HOME_DREAM_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function takeHomeDreamPending(): HomeDreamPending | null {
  const pending = readHomeDreamPending();
  if (pending) removeHomeDreamPending(pending);
  return pending;
}
