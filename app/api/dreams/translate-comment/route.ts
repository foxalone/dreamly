import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { consumeGuestTranslation, newGuestId, readGuestId, refundGuestTranslation, setGuestCookie } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeTranslationAccess, refundAdTranslateGrant, refundFreeTranslation } from "../_lib/translationQuota";
import { readTranslationUnlock, translationUnlockPath, type TranslationOwner } from "../_lib/translationLedger";
import { commentTranslationTargetId } from "@/lib/commentTranslation";
import { TRANSLATE_MODEL } from "@/lib/aiModels";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { normalizeTranslationLanguage, TRANSLATION_LANGUAGE_LABELS } from "@/lib/translationLanguage";

export const runtime = "nodejs";

type Body = { dreamId?: string; commentId?: string; targetLang?: string; idToken?: string };

function outputText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const result = response as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof result.output_text === "string" && result.output_text.trim()) return result.output_text.trim();
  return (result.output ?? []).flatMap((item) => item.content ?? [])
    .map((part) => typeof part.text === "string" ? part.text.trim() : "")
    .filter(Boolean).join("\n").trim();
}

/** A cached translation saves an AI call; each viewer still needs their own unlock. */
export async function POST(req: Request) {
  let chargedUid: string | null = null;
  let adUid: string | null = null;
  let chargedGuest: string | null = null;
  let target: { sharedDreamId: string; targetLang: string } | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const dreamId = String(body.dreamId ?? "").trim();
    const commentId = String(body.commentId ?? "").trim();
    const lang = normalizeTranslationLanguage(body.targetLang);
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(dreamId) || !/^[A-Za-z0-9_-]{1,120}$/.test(commentId) || !lang) {
      return NextResponse.json({ error: "Invalid translation request." }, { status: 400 });
    }
    const token = String(body.idToken ?? "").trim();
    const auth = token ? await requireSignedInUid(token) : null;
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid ?? null;
    let guestId = readGuestId(req);
    const newCookie = !uid && !guestId;
    if (newCookie) guestId = newGuestId();
    const finish = <T extends NextResponse>(response: T): T => {
      response.headers.set("Cache-Control", "private, no-store");
      return newCookie && guestId ? setGuestCookie(response, guestId) : response;
    };

    const db = adminDb();
    const dreamRef = db.collection("shared_dreams").doc(dreamId);
    const commentRef = dreamRef.collection("comments").doc(commentId);
    const [dreamSnap, commentSnap] = await Promise.all([dreamRef.get(), commentRef.get()]);
    if (!dreamSnap.exists || dreamSnap.data()?.deleted === true || !commentSnap.exists || commentSnap.data()?.deleted === true) {
      return finish(NextResponse.json({ error: "Comment not found." }, { status: 404 }));
    }
    const source = String(commentSnap.data()?.text ?? "").trim();
    if (!source) return finish(NextResponse.json({ error: "Comment not found." }, { status: 404 }));

    target = { sharedDreamId: commentTranslationTargetId(dreamId, commentId), targetLang: lang };
    const accountOwner: TranslationOwner | null = uid ? { uid } : null;
    const guestOwner: TranslationOwner | null = guestId ? { guestId } : null;
    const accountUnlocked = accountOwner ? await readTranslationUnlock(db, accountOwner, target.sharedDreamId, lang) : false;
    const guestUnlocked = !accountUnlocked && guestOwner
      ? await readTranslationUnlock(db, guestOwner, target.sharedDreamId, lang) : false;
    const unlocked = accountUnlocked || guestUnlocked;
    const owner: TranslationOwner = accountUnlocked ? accountOwner! : guestUnlocked ? guestOwner! : accountOwner ?? guestOwner!;

    const sourceHash = createHash("sha256").update(source).digest("hex");
    const cacheRef = commentRef.collection("private").doc("translations");
    const entry = (await cacheRef.get()).data()?.[lang] as { text?: unknown; sourceHash?: unknown } | undefined;
    const cached = entry?.sourceHash === sourceHash && typeof entry.text === "string" ? entry.text.trim() : "";
    if (unlocked && cached) return finish(NextResponse.json({ translation: cached, cached: true }));

    if (!unlocked) {
      if (uid) {
        const access = await consumeTranslationAccess(uid, target);
        if ("error" in access) return finish(access.error);
        if (access.usedDailyFree) chargedUid = uid;
        if (access.usedAdGrant) adUid = uid;
      } else if (!(await consumeGuestTranslation(guestId!, target))) {
        return finish(NextResponse.json({ code: "GUEST_AD_REQUIRED", error: "Sign in or watch an ad to translate." }, { status: 402 }));
      } else {
        chargedGuest = guestId;
      }
    }

    let translation = cached;
    if (!translation) {
      const key = getOneiroOpenAiApiKey();
      if (!key) throw new Error(getMissingOneiroOpenAiKeyMessage());
      const response = await new OpenAI({ apiKey: key }).responses.create({
        model: TRANSLATE_MODEL,
        instructions: "Translate this comment accurately. Return only the translation. Preserve emojis, names, tone, and line breaks. If it is already in the target language, return it unchanged. Do not add notes or explanations.",
        input: `Translate into ${TRANSLATION_LANGUAGE_LABELS[lang]}:\n\n${source}`,
        reasoning: { effort: "minimal" },
      });
      translation = outputText(response);
      if (!translation) throw new Error("Empty translation");
    }

    const now = Date.now();
    const batch = db.batch();
    if (!cached) batch.set(cacheRef, { [lang]: { text: translation, sourceHash, model: TRANSLATE_MODEL, atMs: now } }, { merge: true });
    if (!unlocked) batch.set(db.doc(translationUnlockPath(owner, target.sharedDreamId)), {
      sharedDreamId: target.sharedDreamId,
      updatedAtMs: now,
      langs: { [lang]: { atMs: now, source: cached ? "cache" : "ai", usedDailyFree: !!chargedUid, paid: false } },
    }, { merge: true });
    await batch.commit();
    chargedUid = null;
    adUid = null;
    chargedGuest = null;
    return finish(NextResponse.json({ translation, cached: !!cached }));
  } catch (error) {
    if (chargedUid) await refundFreeTranslation(chargedUid);
    if (adUid && target) await refundAdTranslateGrant(adUid, target);
    if (chargedGuest && target) await refundGuestTranslation(chargedGuest, target);
    console.error("comment translation failed:", error);
    return NextResponse.json({ error: "Could not translate the comment." }, { status: 500 });
  }
}
