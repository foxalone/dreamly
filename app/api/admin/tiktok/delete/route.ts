import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../_lib/auth";
import { adminDb, seedUid } from "../../_lib/firebaseAdmin";

type Body = { dreamId?: string };

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = (await req.json().catch(() => ({}))) as Body;
    const dreamId = String(body?.dreamId ?? "").trim();
    if (!dreamId) return NextResponse.json({ error: "Missing dreamId" }, { status: 400 });

    const uid = seedUid();
    const db = adminDb();
    const nowMs = Date.now();

    await db.doc(`users/${uid}/dreams/${dreamId}`).set(
      {
        deleted: true,
        deletedAtMs: nowMs,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const sharedId = `${uid}_${dreamId}`;
    await db.doc(`shared_dreams/${sharedId}`).set(
      {
        deleted: true,
        deletedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "delete failed";
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}