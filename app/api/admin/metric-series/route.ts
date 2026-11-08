import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";
import { clampTzOffsetMin, localDayKey, type DaySnapshot } from "@/lib/contentCounts";
import { buildMetricSeries, readByDay, type ClickKey, type CountEvent, type XpEvent } from "@/lib/metricSeries";

export const runtime = "nodejs";
export const maxDuration = 60;

function totalOf(snap: FirebaseFirestore.DocumentSnapshot): number {
  return Number(snap.data()?.total ?? 0) || 0;
}

function stampMs(data: FirebaseFirestore.DocumentData): number {
  const ms = Number(data.createdAtMs ?? data.sharedAtMs ?? 0);
  return Number.isFinite(ms) ? ms : 0;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const tzOffsetMin = clampTzOffsetMin(new URL(req.url).searchParams.get("tzOffsetMin"));
    const todayKey = localDayKey(Date.now(), tzOffsetMin);

    const xpPromise = db.collectionGroup("commentXpReceipts").select("xpAwarded", "createdAtMs").get().catch((error) => {
      console.warn("metric series xp receipts skipped", error);
      return null;
    });

    const [dreamSnap, guestSnap, storySnap, sharedSnap, commentSnap, moonSnap, earthSnap, translationSnap, horoscopeMoreSnap, tarotMoreSnap, historySnap, xpSnap] = await Promise.all([
      db.collectionGroup("dreams").select("deleted", "createdAtMs").get(),
      db.collection("guest_dreams").select("deleted", "imported", "createdAtMs").get(),
      db.collectionGroup("stories").select("deleted", "sourceType", "createdAtMs").get(),
      db.collection("shared_dreams").select("deleted", "sharedAtMs").get(),
      db.collectionGroup("comments").select("deleted", "createdAtMs", "xpAwarded").get(),
      db.collection("site_metrics").doc("moon_clicks").get(),
      db.collection("site_metrics").doc("earth_clicks").get(),
      db.collection("site_metrics").doc("translation_clicks").get(),
      db.collection("site_metrics").doc("horoscope_more_clicks").get(),
      db.collection("site_metrics").doc("tarot_more_clicks").get(),
      db.collection("site_metrics").doc("content_counts").get(),
      xpPromise,
    ]);

    const events: CountEvent[] = [];
    const push = (docs: QueryDocumentSnapshot[], kind: CountEvent["kind"], accept: (data: FirebaseFirestore.DocumentData) => boolean) => {
      for (const doc of docs) {
        const data = doc.data();
        if (!accept(data)) continue;
        events.push({ ms: stampMs(data), kind });
      }
    };
    push(dreamSnap.docs, "dreams", (data) => data.deleted !== true);
    push(guestSnap.docs, "dreams", (data) => data.deleted !== true && data.imported !== true);
    push(storySnap.docs, "stories", (data) => data.deleted !== true && data.sourceType !== "journal");
    push(storySnap.docs, "journal", (data) => data.deleted !== true && data.sourceType === "journal");
    const activeShares = new Set(sharedSnap.docs.filter((doc) => doc.data().deleted !== true).map((doc) => doc.id));
    push(sharedSnap.docs, "shared", (data) => data.deleted !== true);
    for (const doc of commentSnap.docs) {
      const data = doc.data();
      const dreamId = doc.ref.parent.parent?.id;
      if (data.deleted === true || doc.ref.parent.parent?.parent.id !== "shared_dreams" || !dreamId || !activeShares.has(dreamId)) continue;
      events.push({ ms: stampMs(data), kind: "comments" });
    }

    const xpEvents: XpEvent[] = xpSnap
      ? xpSnap.docs.map((doc) => ({
          ms: Number(doc.data().createdAtMs ?? 0) || 0,
          xp: Number(doc.data().xpAwarded ?? 0) || 0,
        }))
      : commentSnap.docs.flatMap((doc) => {
          if (doc.ref.parent.parent?.parent.id !== "shared_dreams") return [];
          return [{ ms: stampMs(doc.data()), xp: Number(doc.data().xpAwarded ?? 0) || 0 }];
        });

    const currentClicks: Record<ClickKey, number> = {
      moon: totalOf(moonSnap),
      earth: totalOf(earthSnap),
      translation: totalOf(translationSnap),
      horoscopeMore: totalOf(horoscopeMoreSnap),
      tarotMore: totalOf(tarotMoreSnap),
    };
    const days = buildMetricSeries({
      todayKey,
      tzOffsetMin,
      events,
      xpEvents,
      storedDays: historySnap.data()?.days as Record<string, DaySnapshot> | undefined,
      currentClicks,
      byDay: {
        moon: readByDay(moonSnap.data()?.byDay),
        earth: readByDay(earthSnap.data()?.byDay),
        translation: readByDay(translationSnap.data()?.byDay),
        horoscopeMore: readByDay(horoscopeMoreSnap.data()?.byDay),
        tarotMore: readByDay(tarotMoreSnap.data()?.byDay),
      },
    });

    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERIES_FAILED";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
