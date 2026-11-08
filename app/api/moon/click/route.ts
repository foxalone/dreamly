import { FieldValue } from "firebase-admin/firestore";
import { recordDailyClick } from "@/lib/clickMetrics";
import { createMoonClickHandler } from "@/lib/moonClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createMoonClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async source => {
    await recordDailyClick(adminDb(), "moon_clicks", {
      sources: { [source]: FieldValue.increment(1) },
    });
  },
});
