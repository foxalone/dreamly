import { FieldValue } from "firebase-admin/firestore";
import { recordDailyClick } from "@/lib/clickMetrics";
import { createEarthClickHandler } from "@/lib/earthClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createEarthClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async source => {
    await recordDailyClick(adminDb(), "earth_clicks", {
      sources: { [source]: FieldValue.increment(1) },
    });
  },
});
