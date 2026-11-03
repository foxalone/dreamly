import { FieldValue } from "firebase-admin/firestore";
import { createTranslationClickHandler } from "@/lib/translationClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createTranslationClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async source => {
    await adminDb().collection("site_metrics").doc("translation_clicks").set({
      total: FieldValue.increment(1),
      sources: { [source]: FieldValue.increment(1) },
      lastAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  },
});
