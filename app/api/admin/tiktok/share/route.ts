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

    const dreamRef = db.doc(`users/${uid}/dreams/${dreamId}`);
    const snap = await dreamRef.get();
    if (!snap.exists) return NextResponse.json({ error: "Dream not found" }, { status: 404 });

    const dream = snap.data() as any;
    const nowMs = Date.now();

    await dreamRef.set(
      {
        shared: true,
        sharedAtMs: nowMs,
        sharedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const sharedId = `${uid}_${dreamId}`;
    const initials = String(dream?.studio?.authorInitials ?? "UU").trim() || "UU";

    await db.doc(`shared_dreams/${sharedId}`).set(
      {
        ownerUid: uid,
        ownerDreamId: dreamId,

        // ✅ рандомные инициалы (не email, не uid)
        authorName: null,
        authorEmail: null,
        authorInitials: initials,

        title: dream?.title ?? "",
        text: dream?.text ?? "",

        dateKey: dream?.dateKey ?? null,
        timeKey: dream?.timeKey ?? null,
        createdAtMs: dream?.createdAtMs ?? null,

        wordCount: dream?.wordCount ?? null,
        charCount: dream?.charCount ?? null,
        langGuess: dream?.langGuess ?? null,

        iconsEn: dream?.iconsEn ?? [],
        emojis: dream?.emojis ?? [],

        // city override
        cityId: dream?.cityId ?? null,
        city: dream?.city ?? null,
        country: dream?.country ?? null,
        admin1: dream?.admin1 ?? null,
        lat: dream?.lat ?? null,
        lng: dream?.lng ?? null,

        sharedAtMs: nowMs,
        sharedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),

        deleted: false,
        reactions: { heart: 0, like: 0, star: 0 },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "share failed";
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}