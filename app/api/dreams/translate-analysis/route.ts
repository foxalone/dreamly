import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { consumeGuestTranslation, newGuestId, readGuestId, refundGuestTranslation, setGuestCookie } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeTranslationAccess, refundAdTranslateGrant, refundFreeTranslation } from "../_lib/translationQuota";
import { readTranslationUnlock, translationUnlockPath, type TranslationOwner } from "../_lib/translationLedger";
import { analysisTranslationTargetId } from "@/lib/analysisTranslation";
import { TRANSLATE_MODEL } from "@/lib/aiModels";
import { ensureSharedDreamAnalysis, readFullSharedDreamAnalysis } from "@/lib/ensureSharedDreamAnalysis";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { normalizeTranslationLanguage, TRANSLATION_LANGUAGE_LABELS } from "@/lib/translationLanguage";
import { canReadFullAnalysis } from "@/lib/analysisTranslationAccess";

export const runtime = "nodejs";

type Body = { sharedDreamId?: string; targetLang?: string; idToken?: string; full?: boolean; existingOnly?: boolean };
type Scope = "preview" | "full";

function cachedText(raw: unknown, hash: string): string | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as { text?: unknown; sourceHash?: unknown };
  return entry.sourceHash === hash && typeof entry.text === "string" ? entry.text.trim() || null : null;
}

function outputText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const result = response as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof result.output_text === "string" && result.output_text.trim()) return result.output_text.trim();
  return (result.output ?? []).flatMap((item) => item.content ?? [])
    .map((part) => typeof part.text === "string" ? part.text.trim() : "")
    .filter(Boolean).join("\n").trim();
}

/** Translate only the published analysis preview, or a full reading already unlocked by this viewer. */
export async function POST(req: Request) {
  let chargedUid: string | null = null;
  let adUid: string | null = null;
  let chargedGuest: string | null = null;
  let target: { sharedDreamId: string; targetLang: string } | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const id = String(body.sharedDreamId ?? "").trim();
    const lang = normalizeTranslationLanguage(body.targetLang);
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(id) || !lang) {
      return NextResponse.json({ error: "Invalid translation request." }, { status: 400 });
    }
    const token = String(body.idToken ?? "").trim();
    const auth = token ? await requireSignedInUid(token) : null;
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid ?? null;
    let guestId = readGuestId(req);
    const newCookie = !uid && !guestId && body.existingOnly !== true;
    if (newCookie) guestId = newGuestId();
    const finish = <T extends NextResponse>(response: T): T => {
      response.headers.set("Cache-Control", "private, no-store");
      return newCookie && guestId ? setGuestCookie(response, guestId) : response;
    };
    if (!uid && !guestId) return finish(NextResponse.json({ translation: null }));

    const db = adminDb();
    const ref = db.doc(`shared_dreams/${id}`);
    const snap = await ref.get();
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    if (!snap.exists || data.deleted === true) return finish(NextResponse.json({ error: "Dream not found." }, { status: 404 }));

    target = { sharedDreamId: analysisTranslationTargetId(id), targetLang: lang };
    const accountOwner: TranslationOwner | null = uid ? { uid } : null;
    const guestOwner: TranslationOwner | null = guestId ? { guestId } : null;
    const accountUnlocked = accountOwner ? await readTranslationUnlock(db, accountOwner, target.sharedDreamId, lang) : false;
    const guestUnlocked = !accountUnlocked && guestOwner
      ? await readTranslationUnlock(db, guestOwner, target.sharedDreamId, lang)
      : false;
    const unlocked = accountUnlocked || guestUnlocked;
    const owner: TranslationOwner = accountUnlocked ? accountOwner! : guestUnlocked ? guestOwner! : accountOwner ?? guestOwner!;
    if (body.existingOnly === true && !unlocked) return finish(NextResponse.json({ translation: null, unlocked: false }));

    const scope: Scope = body.full === true ? "full" : "preview";
    if (scope === "full" && !(await canReadFullAnalysis(db, id, data, uid, guestId))) {
      return finish(NextResponse.json({ code: "READING_LOCKED" }, { status: 403 }));
    }
    const source = scope === "full"
      ? await readFullSharedDreamAnalysis(db, id, data)
      : data.analysisIsPreview === true && typeof data.analysisText === "string" && data.analysisText.trim()
        ? data.analysisText.trim()
        : (await ensureSharedDreamAnalysis(db, id, data)).preview;
    if (!source) return finish(NextResponse.json({ error: "No analysis." }, { status: 404 }));

    const hash = createHash("sha256").update(source).digest("hex");
    const cacheRef = ref.collection("private").doc("analysisTranslations");
    const cache = (await cacheRef.get()).data() as Record<string, Record<string, unknown>> | undefined;
    const cached = cachedText(cache?.[scope]?.[lang], hash);
    if (unlocked && cached) return finish(NextResponse.json({ translation: cached, scope, cached: true }));
    if (body.existingOnly === true) return finish(NextResponse.json({ translation: null, scope, unlocked }));

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
      const resp = await new OpenAI({ apiKey: key }).responses.create({
        model: TRANSLATE_MODEL,
        instructions: "Translate this dream analysis precisely. Return only the translated text. Preserve its meaning and paragraph breaks. Do not add notes or explanations.",
        input: `Translate into ${TRANSLATION_LANGUAGE_LABELS[lang]}:\n\n${source}`,
        reasoning: { effort: "minimal" },
      });
      translation = outputText(resp);
      if (!translation) throw new Error("Empty translation");
    }

    const now = Date.now();
    const batch = db.batch();
    if (!cached) batch.set(cacheRef, { [scope]: { [lang]: { text: translation, sourceHash: hash, model: TRANSLATE_MODEL, atMs: now } } }, { merge: true });
    if (!unlocked) {
      batch.set(db.doc(translationUnlockPath(owner, target.sharedDreamId)), {
        sharedDreamId: target.sharedDreamId,
        updatedAtMs: now,
        langs: { [lang]: { atMs: now, source: cached ? "cache" : "ai", usedDailyFree: !!chargedUid, paid: false } },
      }, { merge: true });
    }
    await batch.commit();
    chargedUid = null;
    adUid = null;
    chargedGuest = null;
    return finish(NextResponse.json({ translation, scope, cached: !!cached }));
  } catch (error) {
    if (chargedUid) await refundFreeTranslation(chargedUid);
    if (adUid && target) await refundAdTranslateGrant(adUid, target);
    if (chargedGuest && target) await refundGuestTranslation(chargedGuest, target);
    console.error("analysis translation failed:", error);
    return NextResponse.json({ error: "Could not translate the analysis." }, { status: 500 });
  }
}
