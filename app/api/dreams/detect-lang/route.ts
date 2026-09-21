import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getMissingOneiroOpenAiKeyMessage,
  getOneiroOpenAiApiKey,
} from "@/lib/openaiEnv";
import { detectDreamLang } from "@/lib/detectDreamLang";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

type Body = {
  sharedDreamId?: string;
  idToken?: string;
};

/**
 * POST { sharedDreamId, idToken }
 * Detects the language of a shared dream once and stores it as
 * shared_dreams.<id>.lang. Only the dream's owner can trigger it; a doc that
 * already has `lang` is returned as-is without calling OpenAI.
 * Free for the user — no credits, no daily quota.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const uid = auth.uid;

    const sharedDreamId = String(body?.sharedDreamId ?? "").trim();
    if (!sharedDreamId) {
      return NextResponse.json({ error: "Missing sharedDreamId" }, { status: 400 });
    }

    const db = adminDb();
    const ref = db.doc(`shared_dreams/${sharedDreamId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = snap.data() as any;
    if (data?.ownerUid !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = String(data?.lang ?? "").trim();
    if (existing) {
      return NextResponse.json({ lang: existing, cached: true });
    }

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: getMissingOneiroOpenAiKeyMessage() },
        { status: 500 }
      );
    }

    const { lang, model } = await detectDreamLang(apiKey, String(data?.text ?? ""));
    if (!lang) {
      return NextResponse.json({ lang: null, cached: false, model });
    }

    await ref.update({
      lang,
      langModel: model,
      langAtMs: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ lang, cached: false, model });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Detect failed" },
      { status: 500 }
    );
  }
}
