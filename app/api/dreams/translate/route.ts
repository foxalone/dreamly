import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getMissingOneiroOpenAiKeyMessage,
  getOneiroOpenAiApiKey,
} from "@/lib/openaiEnv";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeTranslationAccess, refundAdTranslateGrant, refundFreeTranslation } from "../_lib/translationQuota";
import { type TranslationAdTarget } from "@/lib/translationAdGrant";
import {
  consumeGuestTranslation,
  newGuestId,
  readGuestId,
  refundGuestTranslation,
  setGuestCookie,
} from "../_lib/guestQuota";
import {
  readCachedTranslation,
  recordTranslationServe,
  readTranslationUnlock,
  type TranslationOwner,
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

/**
 * Who is asking:
 *  - with `idToken` → a signed-in user (daily free slot / ad credit / Pro);
 *  - without it → a guest identified by the dreamly_guest cookie. Guests have
 *    no free slot: they translate only with an ad credit
 *    (POST /api/dreams/guest-ad-reward kind=translate) and get the same
 *    permanent unlock, which moves into their account when they sign in
 *    (POST /api/dreams/claim-guest-translations). A guest without a cookie
 *    gets one on the 402 so the ad flow can attach the credit to it.
 */
export async function POST(req: Request) {
  let uid: string | null = null;
  let guestId: string | null = null;
  let refundDaily = false;
  let refundAd = false;
  let refundGuest = false;
  // set when the guest cookie was minted in this request
  let cookieGuestId: string | null = null;
  let adTarget: TranslationAdTarget | null = null;
  const finish = <T extends NextResponse>(res: T): T => (cookieGuestId ? setGuestCookie(res, cookieGuestId) : res);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    if (String(body?.idToken ?? "").trim()) {
      const auth = await requireSignedInUid(body?.idToken);
      if ("error" in auth) return auth.error;
      uid = auth.uid;
    } else {
      guestId = readGuestId(req);
      if (!guestId) {
        guestId = newGuestId();
        cookieGuestId = guestId;
      }
    }
    const owner: TranslationOwner = uid ? { uid } : { guestId: guestId! };

    const sharedDreamId = String(body?.sharedDreamId ?? "").trim();
    const targetLang = normalizeTargetLang(body?.targetLang);

    if (!targetLang) {
      return NextResponse.json(
        { error: "Invalid targetLang. Use en, es, ar, pt, de, ru, or he." },
        { status: 400 }
      );
    }
    adTarget = { sharedDreamId, targetLang };

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

    const unlocked = await readTranslationUnlock(db, owner, sharedDreamId, targetLang);
    if (cached && unlocked) {
      return finish(NextResponse.json({
        translation: cached.entry.text,
        cached: true,
        source: "unlocked" satisfies TranslationSource,
        cost: 0,
        usedDailyFree: false,
        model: cached.entry.model,
        targetLang,
      }));
    }

    if (!text && !cached) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Subscribers: unlimited. Others use the daily free slot or a pass for this translation.
    // Without either, return 402 so the client offers an ad or a subscription.
    // An existing unlock remains free even if its cached text needs rebuilding.
    let usedDailyFree = false;
    let paid = false;
    if (unlocked) {
      // existing access — nothing to charge
    } else if (uid) {
      const access = await consumeTranslationAccess(uid, adTarget);
      if ("error" in access) return access.error;
      refundDaily = access.usedDailyFree;
      refundAd = access.usedAdGrant;
      usedDailyFree = access.usedDailyFree;
      paid = access.paid;
    } else {
      // Guest: a pass for this translation or nothing. 402 → the client offers
      // "sign in with Google" / "watch an ad".
      const ok = await consumeGuestTranslation(guestId!, adTarget);
      if (!ok) {
        return finish(
          NextResponse.json(
            { error: "Sign in or watch an ad to translate.", code: "GUEST_AD_REQUIRED", reason: "GUEST_TRANSLATION" },
            { status: 402 }
          )
        );
      }
      refundGuest = true;
    }

    const who = uid ? await lookupUser(uid) : { name: "guest", email: null };

    // Cache hit: no OpenAI call, but the slot above is already spent.
    if (cached) {
      await recordTranslationServe({
        db,
        dreamRef: ref,
        sharedDreamId,
        uid: uid ?? "",
        guestId: guestId ?? undefined,
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
      refundGuest = false;
      return finish(NextResponse.json({
        translation: cached.entry.text,
        cached: true,
        source: "cache" satisfies TranslationSource,
        cost: 0,
        usedDailyFree,
        model: cached.entry.model,
        targetLang,
      }));
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
      uid: uid ?? "",
      guestId: guestId ?? undefined,
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
    refundGuest = false;
    return finish(NextResponse.json({
      translation,
      cached: false,
      source: "ai" satisfies TranslationSource,
      cost: 0,
      usedDailyFree,
      model,
      targetLang,
    }));
  } catch (e: any) {
    if (uid && refundDaily) await refundFreeTranslation(uid);
    if (uid && refundAd && adTarget) await refundAdTranslateGrant(uid, adTarget);
    if (guestId && refundGuest && adTarget) await refundGuestTranslation(guestId, adTarget);
    return NextResponse.json(
      { error: e?.message ?? "Translate failed" },
      { status: 500 }
    );
  }
}
