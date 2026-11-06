import { validLoveMatchInput, type LoveMatchInput } from "./loveMatchAi";

const key = "dreamly.loveMatchPending";
type Pending = { input: LoveMatchInput; challenge?: string; ready?: boolean; atMs: number };

export function saveLoveMatchPending(input: LoveMatchInput, challenge?: string): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify({ input, challenge, atMs: Date.now() } satisfies Pending));
    return true;
  } catch { return false; }
}

export function peekLoveMatchPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const pending = JSON.parse(raw) as Pending;
    if (!pending || !validLoveMatchInput(pending.input) || !Number.isFinite(pending.atMs) || Date.now() - pending.atMs > 10 * 60_000) {
      sessionStorage.removeItem(key);
      return null;
    }
    return pending;
  } catch { return null; }
}

export function markLoveMatchAdReady(challenge: string): boolean {
  const pending = peekLoveMatchPending();
  if (!pending || pending.challenge !== challenge) return false;
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...pending, ready: true } satisfies Pending));
    return true;
  } catch { return false; }
}

export function clearLoveMatchPending() {
  try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
}
