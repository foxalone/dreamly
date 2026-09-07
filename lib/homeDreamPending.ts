import { parseDreamLens, type DreamLens } from "@/lib/dream-lenses";

import { DREAM_MAX_CHARS } from "@/lib/subscriptions/plans";

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
  shareToMap?: boolean;
  lang?: string;
  lens?: DreamLens;
  createdAtMs?: number;
  emojis?: { native: string; id?: string; name?: string }[];
  iconsEn?: string[];
  rootsEn?: string[];
  city?: HomeDreamCity;
  guestMapIngested?: boolean;
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
  if (text.length > HOME_DREAM_MAX_CHARS) return null;

  const createdAtMs = Number(parsed.createdAtMs ?? 0);
  if (createdAtMs && Date.now() - createdAtMs > HOME_DREAM_TTL_MS) return null;

  const analysis = String(parsed.analysis ?? "").trim();
  return {
    text,
    analysis: analysis || undefined,
    shareToMap: parsed.shareToMap !== false,
    lang: typeof parsed.lang === "string" ? parsed.lang : undefined,
    lens: parsed.lens ? parseDreamLens(parsed.lens) : undefined,
    createdAtMs: createdAtMs || Date.now(),
    emojis: Array.isArray(parsed.emojis) ? parsed.emojis.filter((item) => item?.native) : undefined,
    iconsEn: Array.isArray(parsed.iconsEn) ? parsed.iconsEn.map(String).filter(Boolean) : undefined,
    rootsEn: Array.isArray(parsed.rootsEn) ? parsed.rootsEn.map(String).filter(Boolean) : undefined,
    city: normalizeCity(parsed.city),
    guestMapIngested: parsed.guestMapIngested === true,
  };
}

export function readHomeDreamPending(): HomeDreamPending | null {
  try {
    const raw = storage()?.getItem(HOME_DREAM_PENDING_KEY);
    if (!raw) return null;
    const pending = normalize(JSON.parse(raw));
    if (!pending) {
      storage()?.removeItem(HOME_DREAM_PENDING_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

export function writeHomeDreamPending(text: string, extra?: Omit<HomeDreamPending, "text">) {
  try {
    const cleaned = text.trim();
    if (!cleaned) return;
    const prev = readHomeDreamPending();
    const next: HomeDreamPending = {
      text: cleaned.slice(0, HOME_DREAM_MAX_CHARS),
      analysis: extra && extra.analysis !== undefined ? extra.analysis.trim() || undefined : prev?.analysis,
      shareToMap: extra?.shareToMap ?? prev?.shareToMap ?? true,
      lang: extra?.lang || prev?.lang,
      lens: extra?.lens || prev?.lens,
      createdAtMs: extra?.createdAtMs || prev?.createdAtMs || Date.now(),
      emojis: extra?.emojis ?? prev?.emojis,
      iconsEn: extra?.iconsEn ?? prev?.iconsEn,
      rootsEn: extra?.rootsEn ?? prev?.rootsEn,
      city: extra && "city" in extra ? extra.city : prev?.city,
      guestMapIngested: extra?.guestMapIngested ?? prev?.guestMapIngested,
    };
    storage()?.setItem(HOME_DREAM_PENDING_KEY, JSON.stringify(next));
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
  if (pending) clearHomeDreamPending();
  return pending;
}
