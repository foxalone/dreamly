export const HOME_DREAM_PENDING_KEY = "dreamly:homeDreamPending";

export type HomeDreamPending = {
  text: string;
};

export function writeHomeDreamPending(text: string) {
  try {
    const cleaned = text.trim();
    if (!cleaned) return;
    sessionStorage.setItem(HOME_DREAM_PENDING_KEY, JSON.stringify({ text: cleaned } satisfies HomeDreamPending));
  } catch {
    // ignore
  }
}

export function takeHomeDreamPending(): HomeDreamPending | null {
  try {
    const raw = sessionStorage.getItem(HOME_DREAM_PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HOME_DREAM_PENDING_KEY);
    const parsed = JSON.parse(raw) as HomeDreamPending;
    const text = String(parsed?.text ?? "").trim();
    return text ? { text } : null;
  } catch {
    return null;
  }
}

export const HOME_DREAM_MAX_CHARS = 2000;
