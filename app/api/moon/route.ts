import { randomInt, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { lunarPoint, MOON_THRESHOLD, publishedDreamCount } from "@/lib/moon/model";

import { lunarPublicDreams, lunarDreamSummary } from "@/lib/moon/publicDreams";
import { shareBadgeFor } from "@/lib/shareBadges";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await requireSignedInUid(body.idToken);
    if ("error" in user) return user.error;
    const db = adminFirestore();
    const shares = await db.collection("shared_dreams").where("ownerUid", "==", user.uid).select("ownerDreamId", "ownerStoryId", "text", "deleted", "sourceType", "sharedAtMs", "emojis").get();
    const count = publishedDreamCount(shares.docs.map(doc => ({ id: doc.id, data: doc.data() })));
    // A dedicated server-only collection: client Firestore rules deny it by default.
    const ref = db.collection("moon_residents").doc(user.uid);
    if (count < MOON_THRESHOLD) return NextResponse.json({ eligible: false, count, joined: false }, { status: typeof body.resident === "string" ? 403 : 200, headers });
    if (body.join === true) {
      await db.runTransaction(async tx => {
        const existing = await tx.get(ref);
        if (!existing.exists) {
          const point = lunarPoint(randomInt(0, 1_000_000) / 1_000_000, randomInt(0, 1_000_000) / 1_000_000);
          tx.create(ref, { ...point, joinedAtMs: Date.now(), version: 1 });
        }
      });
    }
    const membership = await ref.get();
    if (!membership.exists) return NextResponse.json({ eligible: true, count, joined: false }, { headers });
    const point = { lng: Number(membership.get("lng")), lat: Number(membership.get("lat")) };
    if (body.pins !== true && typeof body.resident !== "string") return NextResponse.json({ eligible: true, count, joined: true, point }, { headers });
    const residents = await db.collection("moon_residents").get();
    if (typeof body.resident === "string") {
      const resident = residents.docs.find(doc => createHash("sha256").update(`moon:${doc.id}`).digest("hex").slice(0, 24) === body.resident);
      if (!resident) return NextResponse.json({ error: "RESIDENT_NOT_FOUND" }, { status: 404, headers });
      const published = resident.id === user.uid ? shares : await db.collection("shared_dreams").where("ownerUid", "==", resident.id).select("ownerDreamId", "ownerStoryId", "text", "deleted", "sourceType", "sharedAtMs", "emojis").get();
      return NextResponse.json({ dreams: lunarPublicDreams(published.docs.map(doc => ({ id: doc.id, data: doc.data() }))) }, { headers });
    }
    const pins = [];
    // One current sharing-level character per resident. Never read private diaries.
    for (let offset = 0; offset < residents.docs.length; offset += 6) {
      const batch = await Promise.all(residents.docs.slice(offset, offset + 6).map(async resident => {
        const published = resident.id === user.uid ? shares : await db.collection("shared_dreams").where("ownerUid", "==", resident.id).select("ownerDreamId", "ownerStoryId", "text", "deleted", "sourceType", "sharedAtMs", "emojis").get();
        const sharedCount = publishedDreamCount(published.docs.map(doc => ({ id: doc.id, data: doc.data() })));
        const summary = lunarDreamSummary(lunarPublicDreams(published.docs.map(doc => ({ id: doc.id, data: doc.data() }))));
        return {
          ...summary,
          joinedAtMs: Number(resident.get("joinedAtMs")) || 0,
          id: createHash("sha256").update(`moon:${resident.id}`).digest("hex").slice(0, 24),
          lng: Number(resident.get("lng")), lat: Number(resident.get("lat")),
          character: shareBadgeFor(sharedCount).id, dreams: sharedCount, mine: resident.id === user.uid,
        };
      }));
      pins.push(...batch);
    }
    return NextResponse.json({ eligible: true, count, joined: true, point, pins }, { headers });
  } catch (error) {
    console.error("Moon access failed", error);
    return NextResponse.json({ error: "MOON_UNAVAILABLE" }, { status: 503, headers });
  }
}
