import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";
import { jerusalemDayKey, jerusalemMidnightMs } from "@/lib/clickDay";
import { applyDailySnapshot, type DaySnapshot } from "@/lib/contentCounts";
import { readContentTotals } from "@/lib/contentCountsServer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const todayKey = jerusalemDayKey();
    const history = db.doc("site_metrics/content_counts");
    const { current, addedToday } = await readContentTotals(db, jerusalemMidnightMs(todayKey));

    const compare = (stored: Record<string, DaySnapshot> | undefined) =>
      applyDailySnapshot({ todayKey, current, addedToday, stored });

    const { delta } = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(history);
      const result = compare(snapshot.data()?.days);
      transaction.set(history, { days: result.days }, { mergeFields: ["days"] });
      return result;
    }).catch(async (error) => {
      console.warn("content count snapshot skipped", error);
      const snapshot = await history.get();
      return compare(snapshot.data()?.days);
    });

    const { dreams, stories, journal, shared, ...tracked } = current;
    return NextResponse.json(
      { ...tracked, counts: { dreams, stories, journal, shared }, delta },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "COUNT_FAILED";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
