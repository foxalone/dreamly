import { DREAM_LIMITS, JOURNAL_LIMITS, clampText } from "@/lib/dreamLength";
import type { GuestNote, GuestNoteKind } from "@/lib/guestNotes";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeTitle(text: string) {
  const title = text.trim().replace(/\s+/g, " ");
  if (!title) return "";
  return title.length <= 60 ? title : `${title.slice(0, 60)}…`;
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Stable id so a retry overwrites the same note instead of adding another. */
export function guestNoteImportId(kind: GuestNoteKind, createdAtMs: number) {
  return `guest_${kind}_${createdAtMs}`;
}

export function guestNoteImportFields(kind: GuestNoteKind, note: GuestNote, user: { uid: string; displayName?: string | null; email?: string | null }) {
  const limits = kind === "journal" ? JOURNAL_LIMITS : DREAM_LIMITS;
  const text = clampText(note.text, limits).trim();
  const written = new Date(note.createdAtMs);
  return {
    uid: user.uid,
    text,
    title: makeTitle(text),
    createdAtMs: note.createdAtMs,
    dateKey: `${written.getFullYear()}-${pad2(written.getMonth() + 1)}-${pad2(written.getDate())}`,
    timeKey: `${pad2(written.getHours())}:${pad2(written.getMinutes())}`,
    tzOffsetMin: written.getTimezoneOffset(),
    wordCount: countWords(text),
    charCount: text.length,
    tags: [] as string[],
    summary: "",
    source: "manual" as const,
    deleted: false,
    emojis: [] as unknown[],
    iconsEn: [] as string[],
    shared: false,
    sharedAtMs: null,
    sharedAt: null,
    roots: [] as string[],
    rootsTop: [] as { w: string; c: number }[],
    rootsEn: [] as string[],
    rootsLang: null,
    rootsUpdatedAt: null,
    sourceType: kind,
    ownerUid: user.uid,
    authorName: (user.displayName ?? "").trim() || null,
    authorEmail: (user.email ?? "").trim() || null,
    savedVia: "guest_import" as const,
  };
}
