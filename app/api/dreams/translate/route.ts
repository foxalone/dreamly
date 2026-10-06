import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getMissingOneiroOpenAiKeyMessage,
  getOneiroOpenAiApiKey,
} from "@/lib/openaiEnv";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeTranslationAccess, refundAdTranslateCredit, refundFreeTranslation } from "../_lib/translationQuota";
import {
  readCachedTranslation,
  recordTranslationServe,
  readTranslationUnlock,
  type TranslationSource,
} from "../_lib/translationLedger";

import { normalizeTranslationLanguage as normalizeTargetLang, TRANSLATION_LANGUAGE_LABELS as LANG_LABEL } from "@/lib/translationLanguage";

export const runtime = "nodejs";

type Body = {
  sharedDreamId?: string;
  targetLang?: string;
  idToken?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function extractOutputText(resp: unknown): string {
  const direct = isRecord(resp) ? String(resp.output_text ?? "").trim() : "";
  if (direct) return direct;

  const out = isRecord(resp) ? resp.output : undefined;
  if (!Array.isArray(out)) return "";

  const chunks: string[] = [];
  for (const item of out) {
    const content = isRecord(item) ? item.content : undefined;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      const t = isRecord(c) ? String(c.text ?? "").trim() : "";
      if (t) chunks.push(t);
    }
  }
  return chunks.join("\n").trim();
}

async function lookupUser(uid: string): Promise<{ name: string | null; email: string | null }> {
  try {
    const u = await adminAuth().getUser(uid);
    return {
      name: (u.displayName ?? "").trim() || null,
      email: (u.email ?? "").trim() || null,
    };
  } catch {
    return { name: null, email: null };
  }
}

export async function POST(req: Request) {
  let uid: string | null = null;
  let refundDaily = false;
  let refundAd = false;

  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    uid = auth.uid;

    const sharedDreamId = String(body?.sharedDreamId ?? "").trim();
    const targetLang = normalizeTargetLang(body?.targetLang);

    if (!targetLang) {
      return NextResponse.json(
        { error: "Invalid targetLang. Use en, es, ar, pt, de, ru, or he." },
        { status: 400 }
      );
    }

    // Access model (see _lib/translationLedger.ts):
    //  - a user who already unlocked this dream+lang gets it again for free;
    //  - otherwise every request uses the daily free slot, an ad credit or Pro,
    //    even when the text is already cached — the cache only saves the
    //    OpenAI call, never the charge.
    const db = adminDb();
    if (!sharedDreamId || sharedDreamId.includes("/")) {
      return NextResponse.json({ error: "A valid sharedDreamId is required." }, { status: 400 });
    }
    const ref = db.doc(`shared_dreams/${sharedDreamId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Dream not found." }, { status: 404 });
    }
    const dream = (snap.data() as Record<string, unknown>) ?? {};
    // Use the stored dream so a caller cannot replace a permanently saved translation.
    const text = String(dream.text ?? "").trim();
    const cached = await readCachedTranslation(ref, dream, targetLang);

    const unlocked = await readTranslationUnlock(db, uid, sharedDreamId, targetLang);
    if (cached && unlocked) {
      return NextResponse.json({
        translation: cached.entry.text,
        cached: true,
        source: "unlocked" satisfies TranslationSource,
        cost: 0,
        usedDailyFree: false,
        model: cached.entry.model,
        targetLang,
      });
    }

    if (!text && !cached) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Subscribers: unlimited. Others use the daily free slot, then ad credits.
    // Without either, return 402 so the client offers an ad or a subscription.
    // An existing unlock remains free even if its cached text needs rebuilding.
    const access = unlocked
      ? { ok: true as const, paid: false, usedDailyFree: false, usedAdCredit: false }
      : await consumeTranslationAccess(uid);
    if ("error" in access) return access.error;
    refundDaily = access.usedDailyFree;
    refundAd = access.usedAdCredit;
    const usedDailyFree = access.usedDailyFree;
    const paid = access.paid;

    const who = await lookupUser(uid);

    // Cache hit: no OpenAI call, but the slot above is already spent.
    if (cached) {
      await recordTranslationServe({
        db,
        dreamRef: ref,
        sharedDreamId,
        uid,
        who,
        targetLang,
        source: "cache",
        model: cached.entry.model,
        usedDailyFree,
        paid,
        cached,
      });
      refundDaily = false;
      refundAd = false;
      return NextResponse.json({
        translation: cached.entry.text,
        cached: true,
        source: "cache" satisfies TranslationSource,
        cost: 0,
        usedDailyFree,
        model: cached.entry.model,
        targetLang,
      });
    }

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) throw new Error(getMissingOneiroOpenAiKeyMessage());

    const model = process.env.OPENAI_TRANSLATE_MODEL?.trim() || "gpt-5-nano";
    const openai = new OpenAI({ apiKey });
    const langLabel = LANG_LABEL[targetLang];

    const resp = await openai.responses.create({
      model,
      instructions:
        "You are a precise translator. Return only the translated text. Preserve paragraph breaks. Do not add notes, titles, or explanations.",
      input: `Translate the following dream text into ${langLabel}. If it is already in ${langLabel}, return it unchanged.\n\n"""${text}"""`,
      reasoning: { effort: "minimal" },
    });
    const translation = extractOutputText(resp);
    if (!translation) throw new Error("Empty translation");

    await recordTranslationServe({
      db,
      dreamRef: ref,
      sharedDreamId,
      uid,
      who,
      targetLang,
      source: "ai",
      model,
      usedDailyFree,
      paid,
      translation,
    });

    refundDaily = false;
    refundAd = false;
    return NextResponse.json({
      translation,
      cached: false,
      source: "ai" satisfies TranslationSource,
      cost: 0,
      usedDailyFree,
      model,
      targetLang,
    });
  } catch (e: any) {
    if (uid && refundDaily) await refundFreeTranslation(uid);
    if (uid && refundAd) await refundAdTranslateCredit(uid);
    return NextResponse.json(
      { error: e?.message ?? "Translate failed" },
      { status: 500 }
    );
  }
}
