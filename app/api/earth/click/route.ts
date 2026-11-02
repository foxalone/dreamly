import { FieldValue } from "firebase-admin/firestore";
import { createEarthClickHandler } from "@/lib/earthClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createEarthClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async source => {
    await adminDb().collection("site_metrics").doc("earth_clicks").set({
      total: FieldValue.increment(1),
      sources: { [source]: FieldValue.increment(1) },
      lastAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  },
});
