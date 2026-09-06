export const HOME_DREAM_PENDING_KEY = "dreamly:homeDreamPending";
export const HOME_DREAM_MAX_CHARS = 2000;
const HOME_DREAM_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type HomeDreamPending = {
  text: string;
  analysis?: string;
  shareToMap?: boolean;
  lang?: string;
  createdAtMs?: number;
};

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
    shareToMap: parsed.shareToMap === true,
    lang: typeof parsed.lang === "string" ? parsed.lang : undefined,
    createdAtMs: createdAtMs || Date.now(),
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
      shareToMap: extra?.shareToMap ?? prev?.shareToMap ?? false,
      lang: extra?.lang || prev?.lang,
      createdAtMs: extra?.createdAtMs || prev?.createdAtMs || Date.now(),
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
