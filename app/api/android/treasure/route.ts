import { NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { calculateSky } from "@/lib/horoscope/astronomy";
import { cookieFromRequest, requestHasHoroscopeAccess } from "@/lib/horoscope/access-cookie";
import { isSign, utcDay } from "@/lib/horoscope/model";
import { readStored } from "@/lib/horoscope/persistence";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { canReadTarotAccess, canReadTarotUnlock, isTarotCardId, TAROT_ACCESS_COOKIE, TAROT_UNLOCK_COOKIE } from "@/lib/tarot/access";
import { getDailyTarotReading } from "@/lib/tarot/dailyReading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const headers = { "Cache-Control": "private, no-store" };
const failure = (status: number, code: string) => NextResponse.json({ code }, { status, headers });

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") as Locale | null;
  if (!locale || !LOCALES.includes(locale)) return failure(400, "INVALID_LOCALE");
  const today = utcDay();
  try {
    if (query.get("tool") === "horoscope") {
      const sign = query.get("sign");
      if (sign !== null && !isSign(sign)) return failure(400, "INVALID_SIGN");
      const unlocked = isSign(sign) && requestHasHoroscopeAccess(request, sign);
      const stored = unlocked && isSign(sign) ? await readStored(adminDb(), today, sign, locale) : null;
      return NextResponse.json({ day: today, sky: stored?.astronomySnapshot ?? calculateSky(today), reading: stored?.reading ?? null }, { headers });
    }
    if (query.get("tool") !== "tarot") return failure(400, "INVALID_TOOL");
    const day = query.get("day"), card = query.get("card");
    if (!day || !card || !isTarotCardId(card) || day !== today) return failure(400, "INVALID_DRAW");
    const guest = readGuestId(request), secret = process.env.CRON_SECRET?.trim();
    if (!canReadTarotAccess(cookieFromRequest(request, TAROT_ACCESS_COOKIE), guest, day, card, secret) ||
        !canReadTarotUnlock(cookieFromRequest(request, TAROT_UNLOCK_COOKIE), guest, day, card, secret)) {
      return failure(402, "ACCESS_REQUIRED");
    }
    return NextResponse.json(await getDailyTarotReading(day, card, locale), { headers });
  } catch {
    return failure(503, "UNAVAILABLE");
  }
}
