import { DREAM_LIMITS, JOURNAL_LIMITS, clampText, isTextTooLong, type TextLimits } from "@/lib/dreamLength";

export type GuestNoteKind = "story" | "journal";

export type GuestNote = {
  text: string;
  createdAtMs: number;
};

const TTL_MS = 1000 * 60 * 60 * 24 * 30;

const KEY: Record<GuestNoteKind, string> = {
  story: "dreamly:guestStories",
  journal: "dreamly:guestJournal",
};

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function limitsFor(kind: GuestNoteKind): TextLimits {
  return kind === "journal" ? JOURNAL_LIMITS : DREAM_LIMITS;
}

function normalize(raw: unknown, kind: GuestNoteKind): GuestNote | null {
  if (!raw || typeof raw !== "object") return null;
  const limits = limitsFor(kind);
  const text = clampText(String((raw as GuestNote).text ?? ""), limits).trim();
  if (!text || isTextTooLong(text, limits)) return null;
  const createdAtMs = Number((raw as GuestNote).createdAtMs ?? 0);
  if (!createdAtMs || Date.now() - createdAtMs > TTL_MS) return null;
  return { text, createdAtMs };
}

function save(kind: GuestNoteKind, notes: GuestNote[]) {
  if (notes.length) storage()?.setItem(KEY[kind], JSON.stringify(notes));
  else storage()?.removeItem(KEY[kind]);
}

/** Oldest first, same order as the guest dream queue. */
export function readGuestNotes(kind: GuestNoteKind): GuestNote[] {
  try {
    const raw = storage()?.getItem(KEY[kind]);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalize(item, kind)).filter((item): item is GuestNote => item !== null);
  } catch {
    return [];
  }
}

export function writeGuestNote(kind: GuestNoteKind, text: string) {
  const limits = limitsFor(kind);
  const cleaned = clampText(text, limits).trim();
  if (!cleaned || isTextTooLong(cleaned, limits)) return;
  const notes = readGuestNotes(kind);
  notes.push({ text: cleaned, createdAtMs: Date.now() });
  save(kind, notes);
}

export function removeGuestNote(kind: GuestNoteKind, note: GuestNote) {
  save(
    kind,
    readGuestNotes(kind).filter((item) => item.createdAtMs !== note.createdAtMs || item.text !== note.text),
  );
}
