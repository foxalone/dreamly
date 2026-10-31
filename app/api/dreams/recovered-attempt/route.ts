import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { readGuestId } from "../_lib/guestQuota";
import { guestDreamSnapshotId } from "../_lib/guestDreamSnapshot";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const guestId = readGuestId(req);
  if (!guestId || !/^[a-f0-9]{64}$/.test(id)) {
    return NextResponse.json({ ready: false }, { status: 404 });
  }
  try {
    const db = adminFirestore();
    const attempt = await db.collection("analysis_attempts").doc(id).get();
    const row = attempt.data();
    if (!row || row.guestId !== guestId || row.recoveryBatch !== "2026-10-28-provider-rate-limit") {
      return NextResponse.json({ ready: false }, { status: 404 });
    }
    const snapshot = await db.collection("guest_dreams").doc(guestDreamSnapshotId(guestId, row.text)).get();
    const dream = snapshot.data();
    if (row.status !== "succeeded" || !row.analysis || !dream?.analysis || dream.deleted) {
      return NextResponse.json({ ready: false }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ready: true, analysis: row.analysis,
      emojis: row.emojis ?? dream.emojis ?? [], iconsEn: dream.iconsEn ?? [], rootsEn: dream.rootsEn ?? [],
      city: dream.cityId && dream.city && dream.country ? {
        cityId: dream.cityId, city: dream.city, country: dream.country, admin1: dream.admin1 ?? "",
      } : null,
      mapIngested: Boolean(dream.mapIngestId),
      sharedId: dream.shared === true && typeof dream.sharedId === "string" ? dream.sharedId : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("Recovered dream lookup failed", error);
    return NextResponse.json({ ready: false }, { status: 503 });
  }
}
