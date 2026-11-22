import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { hasPaidAccess } from "@/lib/subscriptions/status";

export function readingUnlockPath(id: string, viewer: { uid: string } | { guestId: string }) {
  const collection = "uid" in viewer ? `users/${viewer.uid}` : `guestQuickSymbol/${viewer.guestId}`;
  return `${collection}/readingUnlocks/${id}`;
}

export async function canReadFullAnalysis(db: ReturnType<typeof adminDb>, id: string, data: Record<string, unknown>, uid: string | null, guestId: string | null) {
  if ((uid && data.ownerUid === uid) || (guestId && data.ownerGuestId === guestId)) return true;
  if (uid) {
    const [user, unlock] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.doc(readingUnlockPath(id, { uid })).get(),
    ]);
    return hasPaidAccess(user.data() as Record<string, unknown> | undefined) || unlock.exists;
  }
  return guestId ? (await db.doc(readingUnlockPath(id, { guestId })).get()).exists : false;
}
