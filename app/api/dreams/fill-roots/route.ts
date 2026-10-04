// app/api/dreams/fill-roots/route.ts
// Server-side root words for a homepage-Ask dream right after it was imported
// into the journal — for every user, like any diary save. Only fresh Ask
// imports (fromHomeAsk, written < 15 min ago) qualify, and fillMissingRoots is a
// no-op once roots exist, so this cannot be used to spend AI repeatedly.
import { after, NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { fillMissingRoots } from "@/lib/dreams/enrichSavedDream";
import { requireSignedInUid } from "../_lib/requireUser";

const MAX_AGE_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const dreamId = String(body?.dreamId ?? "").trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(dreamId)) {
      return NextResponse.json({ error: "Bad dreamId" }, { status: 400 });
    }

    const snap = await adminDb().collection("users").doc(auth.uid).collection("dreams").doc(dreamId).get();
    const d = snap.exists ? snap.data() ?? {} : null;
    // createdAtMs is when the guest wrote the dream (maybe days ago); the
    // import itself stamps updatedAt, so freshness is measured from that.
    const writtenMs = typeof d?.updatedAt?.toMillis === "function" ? d.updatedAt.toMillis() : 0;
    if (!d || d.fromHomeAsk !== true || !(Date.now() - writtenMs < MAX_AGE_MS)) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    after(async () => {
      try {
        await fillMissingRoots({ uid: auth.uid, itemId: dreamId, sourceType: "dream" });
      } catch (e) {
        console.error("fillMissingRoots failed", { uid: auth.uid, dreamId, e });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
