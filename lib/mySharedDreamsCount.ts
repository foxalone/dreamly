import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

/**
 * How many dreams/stories this user has in the public feed right now
 * (shared and not deleted) — the number behind the creature level
 * (lib/shareBadges.ts). Null when the count could not be read.
 */
export async function countMySharedDreams(uid: string): Promise<number | null> {
  try {
    const q = query(
      collection(firestore, "shared_dreams"),
      where("ownerUid", "==", uid),
      where("deleted", "==", false)
    );
    const snap = await getCountFromServer(q);
    return snap.data().count ?? 0;
  } catch (e) {
    console.warn("shared count failed", e);
    return null;
  }
}
