import { loveMatchCanonical, validAiLoveMatch, validLoveMatchInput, type AiLoveMatch, type LoveMatchInput } from "./loveMatchAi";

const key = "dreamly.loveMatchSaved";
const storageKey = (ownerUid: string | null) => `${key}:${ownerUid ?? "guest"}`;

export function loveMatchInitial(name: string): string {
  const letter = Array.from(name.trim())[0];
  return letter ? letter.toLocaleUpperCase() : "•";
}

export type SavedLoveMatch = {
  input: LoveMatchInput;
  match: AiLoveMatch;
  accountSaved: boolean;
};

export function readSavedLoveMatch(ownerUid: string | null): SavedLoveMatch | null {
  try {
    // Older unscoped records have no reliable owner and must not be assigned to a later sign-in.
    localStorage.removeItem(key);
    const scopedKey = storageKey(ownerUid);
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedLoveMatch;
    if (!saved || !validLoveMatchInput(saved.input) || !validAiLoveMatch(saved.match)) {
      localStorage.removeItem(scopedKey);
      return null;
    }
    return { input: saved.input, match: saved.match, accountSaved: saved.accountSaved === true };
  } catch { return null; }
}

export function writeSavedLoveMatch(ownerUid: string | null, saved: SavedLoveMatch): boolean {
  try {
    localStorage.setItem(storageKey(ownerUid), JSON.stringify(saved));
    return true;
  } catch { return false; }
}

export async function forgetSavedLoveMatch(ownerUid: string | null, id: string): Promise<void> {
  const saved = readSavedLoveMatch(ownerUid);
  if (!saved) return;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(loveMatchCanonical(saved.input)));
  const savedId = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (savedId === id) localStorage.removeItem(storageKey(ownerUid));
}

export function removeSavedLoveMatch(ownerUid: string | null, input: LoveMatchInput): void {
  const saved = readSavedLoveMatch(ownerUid);
  if (saved && loveMatchCanonical(saved.input) === loveMatchCanonical(input)) localStorage.removeItem(storageKey(ownerUid));
}

export function markSavedLoveMatchInAccount(ownerUid: string, input: LoveMatchInput): void {
  const saved = readSavedLoveMatch(ownerUid);
  if (!saved || loveMatchCanonical(saved.input) !== loveMatchCanonical(input)) return;
  writeSavedLoveMatch(ownerUid, { ...saved, accountSaved: true });
}
