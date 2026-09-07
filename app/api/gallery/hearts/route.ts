import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";
import { getDreamEntry } from "@/lib/dream-dictionary";
import {
  GALLERY_HEARTS_COLLECTION,
  USER_GALLERY_HEARTS_COLLECTION,
  isValidGalleryHeartSlugFormat,
  normalizeGalleryHeartSlug,
  safeHeartCount,
} from "@/lib/galleryHearts";
import { requireSignedInUid } from "../../dreams/_lib/requireUser";

export const runtime = "nodejs";

type ToggleBody = {
  slug?: unknown;
  idToken?: unknown;
};

async function optionalUidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

function countsFromDocs(docs: Array<{ id: string; data: () => { count?: unknown } }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const doc of docs) {
    const count = safeHeartCount(doc.data()?.count);
    if (count > 0) counts[doc.id] = count;
  }
  return counts;
}

export async function GET(req: Request) {
  try {
    const db = adminDb();
    const uid = await optionalUidFromRequest(req);
    const [countsSnap, likedSnap] = await Promise.all([
      db.collection(GALLERY_HEARTS_COLLECTION).get(),
      uid
        ? db.collection("users").doc(uid).collection(USER_GALLERY_HEARTS_COLLECTION).get()
        : Promise.resolve(null),
    ]);

    const liked: Record<string, boolean> = {};
    if (likedSnap) {
      for (const doc of likedSnap.docs) liked[doc.id] = true;
    }

    return NextResponse.json({
      counts: countsFromDocs(countsSnap.docs),
      liked,
    });
  } catch (error) {
    console.error("[galleryHearts:get]", error);
    return NextResponse.json({ error: "Failed to load hearts." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as ToggleBody;
    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;

    const slug = normalizeGalleryHeartSlug(body?.slug);
    if (!isValidGalleryHeartSlugFormat(slug) || !getDreamEntry(slug)) {
      return NextResponse.json({ error: "Unknown dream." }, { status: 400 });
    }

    const db = adminDb();
    const countRef = db.collection(GALLERY_HEARTS_COLLECTION).doc(slug);
    const userHeartRef = countRef.collection("users").doc(auth.uid);
    const userIndexRef = db
      .collection("users")
      .doc(auth.uid)
      .collection(USER_GALLERY_HEARTS_COLLECTION)
      .doc(slug);

    const result = await db.runTransaction(async (tx) => {
      const [countSnap, userSnap] = await Promise.all([
        tx.get(countRef),
        tx.get(userHeartRef),
      ]);
      const currentlyLiked = userSnap.exists;
      const currentCount = safeHeartCount(countSnap.data()?.count);
      const nextLiked = !currentlyLiked;
      const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

      tx.set(
        countRef,
        { count: nextCount, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      if (nextLiked) {
        const stamp = { createdAt: FieldValue.serverTimestamp(), slug };
        tx.set(userHeartRef, stamp);
        tx.set(userIndexRef, stamp);
      } else {
        tx.delete(userHeartRef);
        tx.delete(userIndexRef);
      }

      return { slug, liked: nextLiked, count: nextCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[galleryHearts:post]", error);
    return NextResponse.json({ error: "Failed to save heart." }, { status: 500 });
  }
}
