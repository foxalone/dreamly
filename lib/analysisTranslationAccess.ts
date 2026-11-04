import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { hasPaidAccess } from "@/lib/subscriptions/status";

export async function canReadFullAnalysis(db: ReturnType<typeof adminDb>, id: string, data: Record<string, unknown>, uid: string | null, guestId: string | null) {
  if ((uid && data.ownerUid === uid) || (guestId && data.ownerGuestId === guestId)) return true;
  if (uid) {
    const [user, unlock] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.doc(`users/${uid}/readingUnlocks/${id}`).get(),
    ]);
    return hasPaidAccess(user.data() as Record<string, unknown> | undefined) || unlock.exists;
  }
  return guestId ? (await db.doc(`guestQuickSymbol/${guestId}/readingUnlocks/${id}`).get()).exists : false;
}
