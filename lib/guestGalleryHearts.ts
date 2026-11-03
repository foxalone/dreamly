import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { GALLERY_HEARTS_COLLECTION, USER_GALLERY_HEARTS_COLLECTION, safeHeartCount } from "./galleryHearts";

export async function guestGalleryLikes(db: Firestore, guestId: string): Promise<Record<string, boolean>> {
  const snap = await db.doc(`guestQuickSymbol/${guestId}`).collection("galleryHearts").get();
  return Object.fromEntries(snap.docs.map((doc) => [doc.id, true]));
}

export async function toggleGuestGalleryHeart(db: Firestore, guestId: string, slug: string): Promise<{ slug: string; liked: boolean; count: number }> {
  const countRef = db.collection(GALLERY_HEARTS_COLLECTION).doc(slug);
  const guestHeartRef = countRef.collection("guests").doc(guestId);
  const guestIndexRef = db.doc(`guestQuickSymbol/${guestId}/galleryHearts/${slug}`);
  return db.runTransaction(async (tx) => {
    const [countSnap, guestSnap] = await Promise.all([tx.get(countRef), tx.get(guestHeartRef)]);
    const liked = !guestSnap.exists;
    const count = Math.max(0, safeHeartCount(countSnap.data()?.count) + (liked ? 1 : -1));
    tx.set(countRef, { count, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (liked) {
      const stamp = { slug, createdAt: FieldValue.serverTimestamp() };
      tx.set(guestHeartRef, stamp);
      tx.set(guestIndexRef, stamp);
    } else {
      tx.delete(guestHeartRef);
      tx.delete(guestIndexRef);
    }
    return { slug, liked, count };
  });
}

export async function claimGuestGalleryHearts(db: Firestore, guestId: string, uid: string): Promise<number> {
  const guestIndex = db.doc(`guestQuickSymbol/${guestId}`).collection("galleryHearts");
  const snap = await guestIndex.get();
  let moved = 0;
  for (const entry of snap.docs) {
    const slug = entry.id;
    const countRef = db.collection(GALLERY_HEARTS_COLLECTION).doc(slug);
    const guestHeartRef = countRef.collection("guests").doc(guestId);
    const userHeartRef = countRef.collection("users").doc(uid);
    const userIndexRef = db.doc(`users/${uid}/${USER_GALLERY_HEARTS_COLLECTION}/${slug}`);
    const transferred = await db.runTransaction(async (tx) => {
      const [countSnap, guestSnap, userSnap] = await Promise.all([
        tx.get(countRef), tx.get(guestHeartRef), tx.get(userHeartRef),
      ]);
      if (!guestSnap.exists) {
        tx.delete(entry.ref);
        return false;
      }
      if (userSnap.exists) {
        tx.set(countRef, {
          count: Math.max(0, safeHeartCount(countSnap.data()?.count) - 1),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        tx.set(userHeartRef, { slug, createdAt: FieldValue.serverTimestamp() });
      }
      tx.set(userIndexRef, { slug, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.delete(guestHeartRef);
      tx.delete(entry.ref);
      return true;
    });
    if (transferred) moved++;
  }
  return moved;
}
