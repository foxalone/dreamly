import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";
import { adminDb } from "../../_lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

type ResultRow = {
  uid: string;
  storyId: string;
  status: "ingested" | "skipped" | "error";
  reason?: string;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const db = adminDb();
    const snap = await db.collectionGroup("stories").get();

    const results: ResultRow[] = [];
    let ingested = 0;
    let skipped = 0;
    let errors = 0;

    for (const docSnap of snap.docs) {
      // users/{uid}/stories/{storyId}
      const parts = docSnap.ref.path.split("/");
      const uidIdx = parts.indexOf("users");
      const uid = uidIdx >= 0 ? s(parts[uidIdx + 1]) : "";
      const storyId = docSnap.id;

      if (!uid || !storyId) {
        skipped += 1;
        results.push({
          uid: uid || "?",
          storyId,
          status: "skipped",
          reason: "bad_path",
        });
        continue;
      }

      const data = docSnap.data() as any;
      if (data?.deleted === true) {
        skipped += 1;
        results.push({ uid, storyId, status: "skipped", reason: "deleted" });
        continue;
      }

      const emojis = Array.isArray(data?.emojis) ? data.emojis : [];
      const hasEmoji = emojis.some((e: any) => s(e?.native));
      if (!hasEmoji) {
        skipped += 1;
        results.push({ uid, storyId, status: "skipped", reason: "no_emojis" });
        continue;
      }

      const ingestId = `${uid}_story_${storyId}`;
      const already = await db.collection("map_ingested").doc(ingestId).get();
      if (already.exists) {
        skipped += 1;
        results.push({
          uid,
          storyId,
          status: "skipped",
          reason: "already_ingested",
        });
        continue;
      }

      try {
        const url = new URL("/api/map/ingest-dream", req.url);
        const resp = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            dreamId: storyId,
            sourceType: "story",
          }),
        });

        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          errors += 1;
          results.push({
            uid,
            storyId,
            status: "error",
            reason: s(json?.error) || `http_${resp.status}`,
          });
          continue;
        }

        if (json?.skipped) {
          skipped += 1;
          results.push({
            uid,
            storyId,
            status: "skipped",
            reason: s(json?.reason) || "ingest_skipped",
          });
        } else {
          ingested += 1;
          results.push({ uid, storyId, status: "ingested" });
        }
      } catch (e: any) {
        errors += 1;
        results.push({
          uid,
          storyId,
          status: "error",
          reason: e?.message ?? "fetch_failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      totalStories: snap.size,
      ingested,
      skipped,
      errors,
      results,
    });
  } catch (e: any) {
    const msg = e?.message ?? "backfill failed";
    const code =
      msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
