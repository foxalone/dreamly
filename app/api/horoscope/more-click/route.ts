import { FieldValue } from "firebase-admin/firestore";
import { recordDailyClick } from "@/lib/clickMetrics";
import { createHoroscopeMoreClickHandler } from "@/lib/horoscopeMoreClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createHoroscopeMoreClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async sign => {
    await recordDailyClick(adminDb(), "horoscope_more_clicks", {
      signs: { [sign]: FieldValue.increment(1) },
    });
  },
});
