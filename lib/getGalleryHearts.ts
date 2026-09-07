import { cache } from "react";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { GALLERY_HEARTS_COLLECTION, safeHeartCount } from "@/lib/galleryHearts";

export const listGalleryHeartCounts = cache(async (): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  try {
    const snapshot = await adminDb().collection(GALLERY_HEARTS_COLLECTION).get();
    for (const doc of snapshot.docs) {
      const count = safeHeartCount(doc.data()?.count);
      if (count > 0) counts[doc.id] = count;
    }
  } catch (error) {
    console.error("[galleryHearts:list]", error);
  }
  return counts;
});
