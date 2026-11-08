import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { requireAdmin } from "../_lib/auth";
import { adminDb } from "../_lib/firebaseAdmin";
import {
  applyDailySnapshot,
  clampTzOffsetMin,
  localDayKey,
  stampTrackedTotals,
  startOfLocalDayMs,
  type ContentTotals,
  type DaySnapshot,
} from "@/lib/contentCounts";

export const runtime = "nodejs";

function createdSince(data: FirebaseFirestore.DocumentData, start: number) {
  const ms = Number(data.createdAtMs ?? data.sharedAtMs ?? 0);
  return Number.isFinite(ms) && ms >= start;
}

/** Collection-group filters need indexes this project does not have, and the journals are small enough to tally in memory. */
function tally(docs: QueryDocumentSnapshot[], start: number, pick: (data: FirebaseFirestore.DocumentData) => "dreams" | "stories" | "journal" | "shared" | null) {
  const totals = { dreams: 0, stories: 0, journal: 0, shared: 0 };
  const added = { dreams: 0, stories: 0, journal: 0, shared: 0 };
  docs.forEach((doc) => {
    const data = doc.data();
    if (data.deleted === true) return;
    const kind = pick(data);
    if (!kind) return;
    totals[kind] += 1;
    if (createdSince(data, start)) added[kind] += 1;
  });
  return { totals, added };
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const tzOffsetMin = clampTzOffsetMin(new URL(req.url).searchParams.get("tzOffsetMin"));
    const now = Date.now();
    const todayKey = localDayKey(now, tzOffsetMin);
    const start = startOfLocalDayMs(now, tzOffsetMin);

    const [dreamSnap, guestSnap, storySnap, sharedSnap, commentSnap, userSnap, moonSnap, earthSnap, translationSnap, horoscopeMoreSnap, tarotMoreSnap, historySnap] = await Promise.all([
      db.collectionGroup("dreams").select("deleted", "createdAtMs").get(),
      db.collection("guest_dreams").select("deleted", "imported", "createdAtMs").get(),
      db.collectionGroup("stories").select("deleted", "sourceType", "createdAtMs").get(),
      db.collection("shared_dreams").select("deleted", "sharedAtMs").get(),
      db.collectionGroup("comments").select("deleted").get(),
      db.collection("users").select("commentXpTotal").get(),
      db.collection("site_metrics").doc("moon_clicks").get(),
      db.collection("site_metrics").doc("earth_clicks").get(),
      db.collection("site_metrics").doc("translation_clicks").get(),
      db.collection("site_metrics").doc("horoscope_more_clicks").get(),
      db.collection("site_metrics").doc("tarot_more_clicks").get(),
      db.collection("site_metrics").doc("content_counts").get(),
    ]);

    const userDreams = tally(dreamSnap.docs, start, () => "dreams");
    const guests = tally(guestSnap.docs, start, (data) => (data.imported === true ? null : "dreams"));
    const notes = tally(storySnap.docs, start, (data) => (data.sourceType === "journal" ? "journal" : "stories"));
    const shares = tally(sharedSnap.docs, start, () => "shared");
    const activeShares = new Set(sharedSnap.docs.filter((doc) => doc.data().deleted !== true).map((doc) => doc.id));
    const comments = commentSnap.docs.filter((doc) =>
      doc.data().deleted !== true && doc.ref.parent.parent?.parent.id === "shared_dreams" &&
      activeShares.has(doc.ref.parent.parent.id)).length;
    const xp = userSnap.docs.reduce((total, doc) => total + Math.max(0, Number(doc.data().commentXpTotal) || 0), 0);

    const current: ContentTotals = {
      dreams: userDreams.totals.dreams + guests.totals.dreams,
      stories: notes.totals.stories,
      journal: notes.totals.journal,
      shared: shares.totals.shared,
      moon: Number(moonSnap.data()?.total ?? 0) || 0,
      earth: Number(earthSnap.data()?.total ?? 0) || 0,
    };
    const stored = historySnap.data()?.days as Record<string, DaySnapshot> | undefined;
    const translation = Number(translationSnap.data()?.total ?? 0) || 0;
    const horoscopeMore = Number(horoscopeMoreSnap.data()?.total ?? 0) || 0;
    const tarotMore = Number(tarotMoreSnap.data()?.total ?? 0) || 0;
    const { delta, days: snapped } = applyDailySnapshot({
      todayKey,
      current,
      addedToday: {
        dreams: userDreams.added.dreams + guests.added.dreams,
        stories: notes.added.stories,
        journal: notes.added.journal,
        shared: shares.added.shared,
      },
      stored,
    });
    const days = stampTrackedTotals(snapped, todayKey, { translation, horoscopeMore, tarotMore, comments, xp });

    await db.collection("site_metrics").doc("content_counts").set({ days }, { merge: true }).catch((error) => {
      console.warn("content count snapshot skipped", error);
    });

    return NextResponse.json(
      {
        moon: current.moon,
        earth: current.earth,
        translation,
        horoscopeMore,
        tarotMore,
        comments,
        xp,
        counts: { dreams: current.dreams, stories: current.stories, journal: current.journal, shared: current.shared },
        delta,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "COUNT_FAILED";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
