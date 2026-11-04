import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/app/api/admin/_lib/gsc";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { earliestWorldDay } from "@/lib/featuredHoroscope";
import { generateFeatured } from "@/lib/featuredHoroscopeGenerate";
import { SIGNS } from "@/lib/horoscope/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const day = earliestWorldDay();
    const ref = adminFirestore().collection("featured_horoscopes").doc(day);
    if ((await ref.get()).exists) return NextResponse.json({ day, status: "exists" });
    const sign = SIGNS[randomInt(SIGNS.length)];
    const forecast = await generateFeatured(day, sign);
    try { await ref.create(forecast); }
    catch (error) {
      if ((await ref.get()).exists) return NextResponse.json({ day, status: "exists" });
      throw error;
    }
    return NextResponse.json({ day, sign, status: "published" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("not configured") ? 503 : 500;
    if (status === 500) console.error("featured horoscope cron", error);
    return NextResponse.json({ error: status === 401 ? "UNAUTHENTICATED" : "UNAVAILABLE" }, { status });
  }
}
