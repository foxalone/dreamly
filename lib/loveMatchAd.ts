import { validLoveMatchInput, type LoveMatchInput } from "./loveMatchAi";

const key = "dreamly.loveMatchPending";
const purchaseKey = "dreamly.loveMatchPurchase";
type Pending = { input: LoveMatchInput; challenge?: string; purchaseOrderId?: string; ready?: boolean; atMs: number };

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

export function markLoveMatchPurchaseReady(orderId: string): boolean {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(orderId)) return false;
  try {
    sessionStorage.setItem(purchaseKey, orderId);
    const pending = peekLoveMatchPending();
    if (pending) sessionStorage.setItem(key, JSON.stringify({ ...pending, challenge: undefined, purchaseOrderId: orderId, ready: true } satisfies Pending));
    return true;
  } catch { return false; }
}

export function peekLoveMatchPurchaseOrder(): string | null {
  try {
    const orderId = sessionStorage.getItem(purchaseKey) ?? "";
    return /^[A-Za-z0-9_-]{8,80}$/.test(orderId) ? orderId : null;
  } catch { return null; }
}

export function clearLoveMatchPurchaseOrder() {
  try { sessionStorage.removeItem(purchaseKey); } catch { /* ignore */ }
}

export function clearLoveMatchPending() {
  try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
}
