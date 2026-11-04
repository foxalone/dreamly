import "server-only";

import { randomInt } from "node:crypto";
import { adminFirestore } from "@/lib/firebaseAdmin";

export type FeaturedDreamRecommendation = { id: string; excerpt: string; lang: string | null };

/** Pick public dreams from a recent pool so the end of each forecast feels fresh. */
export async function randomPublicDreams(): Promise<FeaturedDreamRecommendation[]> {
  try {
    const snap = await adminFirestore().collection("shared_dreams")
      .orderBy("sharedAtMs", "desc").limit(80).get();
    const dreams = snap.docs.flatMap(doc => {
      const data = doc.data();
      const text = typeof data.text === "string" ? data.text.replace(/\s+/g, " ").trim() : "";
      if (data.deleted === true || data.sourceType === "story" || !text || !/^[A-Za-z0-9_-]{1,120}$/.test(doc.id)) return [];
      const excerpt = text.length > 140 ? `${text.slice(0, 139).trimEnd()}…` : text;
      const lang = typeof data.lang === "string" && /^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(data.lang) ? data.lang : null;
      return [{ id: doc.id, excerpt, lang }];
    });
    for (let i = dreams.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [dreams[i], dreams[j]] = [dreams[j], dreams[i]];
    }
    return dreams.slice(0, 3);
  } catch (error) {
    console.error("featured dream recommendations", error);
    return [];
  }
}
