// app/api/dreams/fill-roots/route.ts
// Fill semantic symbols for new imports and repair legacy map-token imports.
// Ownership and the completed roots version gate this background operation.
import { needsImportedVisualRepair } from "@/lib/importedDreamRoots";
import { after, NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { fillMissingRoots } from "@/lib/dreams/enrichSavedDream";
import { requireSignedInUid } from "../_lib/requireUser";

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
    if (!d || d.deleted === true || !needsImportedVisualRepair(d)) {
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
