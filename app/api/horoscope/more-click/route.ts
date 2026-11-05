import { FieldValue } from "firebase-admin/firestore";
import { createHoroscopeMoreClickHandler } from "@/lib/horoscopeMoreClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createHoroscopeMoreClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async sign => {
    await adminDb().collection("site_metrics").doc("horoscope_more_clicks").set({
      total: FieldValue.increment(1),
      signs: { [sign]: FieldValue.increment(1) },
      lastAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  },
});
