import { cache } from "react";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { getDreamEntry } from "@/lib/dream-dictionary";
import {
  DREAM_PAGE_IMAGE_COLLECTION,
  dreamPageImageAlt,
  type DreamPageImageAssignment,
} from "@/lib/dreamPageImage";

type StoredAssignment = {
  imageUrl?: string;
  subject?: string;
  imageJobId?: string;
};

function assignmentFromData(slug: string, data: StoredAssignment | undefined): DreamPageImageAssignment | null {
  const imageUrl = String(data?.imageUrl || "");
  if (!imageUrl) return null;
  const entry = getDreamEntry(slug);
  return {
    slug,
    imageJobId: String(data?.imageJobId || ""),
    imageUrl,
    subject: String(data?.subject || ""),
    alt: dreamPageImageAlt(entry?.name || data?.subject || ""),
  };
}

export async function readDreamPageImageAssignment(slug: string): Promise<DreamPageImageAssignment | null> {
  const cleaned = slug.trim();
  if (!cleaned || !getDreamEntry(cleaned)) return null;
  try {
    const snapshot = await adminDb().collection(DREAM_PAGE_IMAGE_COLLECTION).doc(cleaned).get();
    if (!snapshot.exists) return null;
    return assignmentFromData(cleaned, snapshot.data() as StoredAssignment | undefined);
  } catch (error) {
    console.error("[dreamPageImage]", error);
    return null;
  }
}

export const getDreamPageImage = cache(readDreamPageImageAssignment);

export async function listDreamPageImageUrls(): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  try {
    const snapshot = await adminDb().collection(DREAM_PAGE_IMAGE_COLLECTION).get();
    for (const doc of snapshot.docs) {
      const imageUrl = String(doc.data()?.imageUrl || "");
      if (imageUrl) urls.set(doc.id, imageUrl);
    }
  } catch (error) {
    console.error("[dreamPageImage:list]", error);
  }
  return urls;
}
