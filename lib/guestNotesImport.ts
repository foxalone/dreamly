import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "@/lib/firebase";
import { readGuestNotes, removeGuestNote, type GuestNoteKind } from "@/lib/guestNotes";
import { guestNoteImportFields, guestNoteImportId } from "@/lib/guestNoteImportFields";

export type GuestNoteImportStatus = "done" | "save_limit" | "failed";
export { guestNoteImportFields, guestNoteImportId } from "@/lib/guestNoteImportFields";

const KINDS: GuestNoteKind[] = ["story", "journal"];

let inFlight: Promise<GuestNoteImportStatus> | null = null;

async function takeSaveSlot(user: User): Promise<"ok" | "limit" | "failed"> {
  try {
    const idToken = await user.getIdToken();
    const slot = await fetch("/api/dreams/consume-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (slot.ok) return "ok";
    const data = await slot.json().catch(() => ({}));
    return data?.code === "SAVE_IP_LIMIT" ? "limit" : "failed";
  } catch {
    return "failed";
  }
}

async function importQueue(user: User): Promise<GuestNoteImportStatus> {
  for (const kind of KINDS) {
    for (const note of readGuestNotes(kind)) {
      const id = guestNoteImportId(kind, note.createdAtMs);
      const ref = doc(firestore, "users", user.uid, "stories", id);
      try {
        const existing = await getDoc(ref);
        if (existing.exists()) {
          removeGuestNote(kind, note);
          continue;
        }
        const slot = await takeSaveSlot(user);
        if (slot === "limit") return "save_limit";
        if (slot !== "ok") return "failed";
        const fields = guestNoteImportFields(kind, note, user);
        await setDoc(ref, {
          ...fields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        removeGuestNote(kind, note);
      } catch (error) {
        console.warn("guest note import failed", error);
        return "failed";
      }
    }
  }
  return "done";
}

/** Move guest stories and diary notes into the account. Dreams stay on their own importer. */
export function importGuestNotes(user: User): Promise<GuestNoteImportStatus> {
  if (inFlight) return inFlight;
  const run = () => importQueue(user);
  inFlight = (async () => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request("dreamly:guest-notes-import", run);
    }
    return run();
  })().finally(() => { inFlight = null; });
  return inFlight;
}
