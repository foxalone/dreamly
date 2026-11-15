import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { requireCronSecret } from "@/app/api/admin/_lib/gsc";
import { jerusalemDayKey, jerusalemMidnightMs } from "@/lib/clickDay";
import { closeDailySnapshot, shiftDayKey } from "@/lib/contentCounts";
import { readContentTotals } from "@/lib/contentCountsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const now = new Date();
    const today = jerusalemDayKey(now);
    const midnight = jerusalemMidnightMs(today);
    // The UTC schedule covers both Israeli offsets. Only run after local midnight.
    if (now.getTime() - midnight >= 60 * 60_000) {
      return NextResponse.json({ status: "outside_closing_window" });
    }

    const day = shiftDayKey(today, -1);
    const db = adminDb();
    const history = db.doc("site_metrics/content_counts");
    if ((await history.get()).data()?.days?.[day]?.closedAtMs === midnight) {
      return NextResponse.json({ day, status: "already_closed" });
    }

    // Take the Firestore state at the last microsecond of yesterday.
    const readTime = new Timestamp(midnight / 1000 - 1, 999_999_000);
    const { current } = await readContentTotals(db, jerusalemMidnightMs(day), readTime);
    const saved = await db.runTransaction(async (transaction) => {
      const stored = (await transaction.get(history)).data()?.days ?? {};
      if (stored[day]?.closedAtMs === midnight) return false;
      const days = closeDailySnapshot(stored, day, current, midnight);
      transaction.set(history, { days }, { mergeFields: ["days"] });
      return true;
    });
    return NextResponse.json({ day, status: saved ? "closed" : "already_closed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: message }, { status: 401 });
    console.error("content count close failed", error);
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: message.includes("not configured") ? 503 : 500 });
  }
}
