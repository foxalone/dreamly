import { FieldValue } from "firebase-admin/firestore";
import { recordDailyClick } from "@/lib/clickMetrics";
import { createTranslationClickHandler } from "@/lib/translationClicks";
import { isAdminUid } from "../../admin/_lib/auth";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

export const POST = createTranslationClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  increment: async source => {
    await recordDailyClick(adminDb(), "translation_clicks", {
      sources: { [source]: FieldValue.increment(1) },
    });
  },
});
