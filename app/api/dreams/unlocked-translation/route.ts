import { NextResponse } from "next/server";

import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { readUnlockedTranslation } from "../_lib/translationLedger";
import { normalizeTranslationLanguage } from "@/lib/translationLanguage";

export const runtime = "nodejs";

type Body = { sharedDreamId?: string; targetLang?: string; idToken?: string };

/** Show an existing feed translation on the public dream page without using an allowance. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const sharedDreamId = String(body.sharedDreamId ?? "").trim();
    const targetLang = normalizeTranslationLanguage(body.targetLang);
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(sharedDreamId) || !targetLang) {
      return NextResponse.json({ error: "Invalid translation request." }, { status: 400 });
    }

    const token = String(body.idToken ?? "").trim();
    const auth = token ? await requireSignedInUid(token) : null;
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid;
    const guestId = readGuestId(req);
    const response = (translation: string | null) => NextResponse.json(
      { translation },
      { headers: { "Cache-Control": "private, no-store" } }
    );
    if (!uid && !guestId) return response(null);

    const db = adminDb();
    const snap = await db.doc(`shared_dreams/${sharedDreamId}`).get();
    if (!snap.exists || snap.data()?.deleted === true) return response(null);
    const data = (snap.data() as Record<string, unknown>) ?? {};

    // A signed-in viewer may still have a guest unlock in this browser before
    // the feed's guest-to-account claim has run.
    const accountText = uid
      ? await readUnlockedTranslation(db, { uid }, sharedDreamId, data, targetLang)
      : null;
    const guestText = !accountText && guestId
      ? await readUnlockedTranslation(db, { guestId }, sharedDreamId, data, targetLang)
      : null;
    return response(accountText ?? guestText);
  } catch (error) {
    console.error("unlocked translation read failed:", error);
    return NextResponse.json({ error: "Could not load the translation." }, { status: 500 });
  }
}
