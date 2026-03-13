import { getDatabase, onDisconnect, onValue, ref, set } from "firebase/database";
import type { User } from "firebase/auth";
import app from "@/lib/firebase";
import type { PresenceRecord } from "./chatTypes";

const db = getDatabase(app);

export function setupPresence(user: User): () => void {
  const connectedRef = ref(db, ".info/connected");
  const presenceRef = ref(db, `presence/${user.uid}`);

  const unsubscribe = onValue(connectedRef, async (snapshot) => {
    const connected = snapshot.val() === true;
    if (!connected) return;

    const now = Date.now();
    await onDisconnect(presenceRef).set({
      online: false,
      lastSeenAt: Date.now(),
      name: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    });

    await set(presenceRef, {
      online: true,
      lastSeenAt: now,
      name: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    } satisfies PresenceRecord);
  });

  return () => {
    unsubscribe();
    void set(presenceRef, {
      online: false,
      lastSeenAt: Date.now(),
      name: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    } satisfies PresenceRecord);
  };
}

export function subscribePresence(
  uid: string,
  callback: (presence: PresenceRecord | null) => void
): () => void {
  const presenceRef = ref(db, `presence/${uid}`);
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    callback((snapshot.val() as PresenceRecord | null) ?? null);
  });

  return () => unsubscribe();
}
