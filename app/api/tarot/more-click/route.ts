import { FieldValue } from "firebase-admin/firestore";
import { recordDailyClick } from "@/lib/clickMetrics";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { isAdminUid } from "@/app/api/admin/_lib/auth";
import { adminAuth, adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import { canReadTarotAccess, TAROT_ACCESS_COOKIE } from "@/lib/tarot/access";
import { createTarotMoreClickHandler } from "@/lib/tarotMoreClicks";

export const runtime = "nodejs";

export const POST = createTarotMoreClickHandler({
  verifyToken: token => adminAuth().verifyIdToken(token),
  isAdmin: isAdminUid,
  validDraw: (request, day, cardId) => canReadTarotAccess(
    cookieFromRequest(request, TAROT_ACCESS_COOKIE),
    readGuestId(request),
    day,
    cardId,
    process.env.CRON_SECRET?.trim(),
  ),
  increment: async cardId => {
    await recordDailyClick(adminDb(), "tarot_more_clicks", {
      cards: { [cardId]: FieldValue.increment(1) },
    });
  },
});
