import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export type ReactionKey = "heart" | "like" | "star";
export type ReactionState = Record<ReactionKey, boolean>;

export const EMPTY_REACTIONS: ReactionState = { heart: false, like: false, star: false };
export const SHARED_DREAM_ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

export function isReactionKey(value: unknown): value is ReactionKey {
  return value === "heart" || value === "like" || value === "star";
}

function reactionState(data: DocumentData | undefined): ReactionState {
  return { heart: data?.heart === true, like: data?.like === true, star: data?.star === true };
}

function count(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export async function readGuestReactions(db: Firestore, guestId: string, dreamIds: string[]): Promise<Record<string, ReactionState>> {
  const entries = await Promise.all(dreamIds.map(async (dreamId) => {
    const snap = await db.doc(`shared_dreams/${dreamId}/reactions/guest_${guestId}`).get();
    return [dreamId, reactionState(snap.data())] as const;
  }));
  return Object.fromEntries(entries);
}

export async function toggleGuestReaction(db: Firestore, guestId: string, dreamId: string, key: ReactionKey): Promise<{ active: boolean; count: number } | null> {
  const dreamRef = db.doc(`shared_dreams/${dreamId}`);
  const reactRef = dreamRef.collection("reactions").doc(`guest_${guestId}`);
  const indexRef = db.doc(`guestQuickSymbol/${guestId}/reactions/${dreamId}`);
  return db.runTransaction(async (tx) => {
    const [dreamSnap, reactSnap] = await Promise.all([tx.get(dreamRef), tx.get(reactRef)]);
    if (!dreamSnap.exists || dreamSnap.data()?.deleted === true) return null;
    const before = reactionState(reactSnap.data());
    const nextState = { ...before, [key]: !before[key] };
    const active = nextState[key];
    const nextCount = Math.max(0, count(dreamSnap.data()?.reactions?.[key]) + (active ? 1 : -1));
    tx.update(dreamRef, { [`reactions.${key}`]: nextCount, updatedAt: FieldValue.serverTimestamp() });
    tx.set(reactRef, { [key]: active, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (Object.values(nextState).some(Boolean)) tx.set(indexRef, { dreamId, updatedAt: FieldValue.serverTimestamp() });
    else tx.delete(indexRef);
    return { active, count: nextCount };
  });
}

/** Move one browser's choices to the signed-in account without increasing counts. */
export async function claimGuestReactionForDream(db: Firestore, guestId: string, uid: string, dreamId: string): Promise<boolean> {
  const dreamRef = db.doc(`shared_dreams/${dreamId}`);
  const guestRef = dreamRef.collection("reactions").doc(`guest_${guestId}`);
  const accountRef = dreamRef.collection("reactions").doc(uid);
  const indexRef = db.doc(`guestQuickSymbol/${guestId}/reactions/${dreamId}`);
  return db.runTransaction(async (tx) => {
    const [dreamSnap, guestSnap, accountSnap] = await Promise.all([
      tx.get(dreamRef), tx.get(guestRef), tx.get(accountRef),
    ]);
    if (!guestSnap.exists) {
      tx.delete(indexRef);
      return false;
    }
    const guest = reactionState(guestSnap.data());
    const account = reactionState(accountSnap.data());
    const additions: Partial<ReactionState> = {};
    const counterUpdates: Record<string, number> = {};
    if (dreamSnap.exists && dreamSnap.data()?.deleted !== true) {
      for (const key of ["heart", "like", "star"] as ReactionKey[]) {
        if (!guest[key]) continue;
        if (account[key]) counterUpdates[`reactions.${key}`] = Math.max(0, count(dreamSnap.data()?.reactions?.[key]) - 1);
        else additions[key] = true;
      }
      if (Object.keys(additions).length) tx.set(accountRef, { ...additions, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (Object.keys(counterUpdates).length) tx.update(dreamRef, { ...counterUpdates, updatedAt: FieldValue.serverTimestamp() });
    }
    tx.delete(guestRef);
    tx.delete(indexRef);
    return dreamSnap.exists && dreamSnap.data()?.deleted !== true && Object.values(guest).some(Boolean);
  });
}

/** New reactions have an index; one legacy scan covers reactions saved before it existed. */
export async function claimGuestReactions(db: Firestore, guestId: string, uid: string): Promise<number> {
  const guestRoot = db.doc(`guestQuickSymbol/${guestId}`);
  const [metadata, indexed] = await Promise.all([guestRoot.get(), guestRoot.collection("reactions").get()]);
  const ids = new Set(indexed.docs.map((doc) => doc.id).filter((id) => SHARED_DREAM_ID_RE.test(id)));
  const needsLegacyScan = !metadata.data()?.reactionsLegacyScannedAtMs;
  if (needsLegacyScan) {
    const shared = await db.collection("shared_dreams").select().get();
    for (let start = 0; start < shared.docs.length; start += 100) {
      const batch = shared.docs.slice(start, start + 100);
      const reactions = await db.getAll(...batch.map((doc) => doc.ref.collection("reactions").doc(`guest_${guestId}`)));
      reactions.forEach((reaction, index) => {
        if (reaction.exists) ids.add(batch[index].id);
      });
    }
  }
  let moved = 0;
  for (const id of ids) {
    if (await claimGuestReactionForDream(db, guestId, uid, id)) moved++;
  }
  if (needsLegacyScan) await guestRoot.set({ reactionsLegacyScannedAtMs: Date.now() }, { merge: true });
  return moved;
}
