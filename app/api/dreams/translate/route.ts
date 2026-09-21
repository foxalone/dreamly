import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getMissingOneiroOpenAiKeyMessage,
  getOneiroOpenAiApiKey,
} from "@/lib/openaiEnv";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeTranslationAccess, refundFreeTranslation } from "../_lib/translationQuota";
import {
  readCachedTranslation,
  recordTranslationServe,
  readTranslationUnlock,
  type TranslationEntry,
  type TranslationSource,
} from "../_lib/translationLedger";

export const runtime = "nodejs";

type Body = {
  sharedDreamId?: string;
  text?: string;
  targetLang?: string;
  idToken?: string;
};

type TargetLang = "en" | "ru" | "he";

const LANG_LABEL: Record<TargetLang, string> = {
  en: "English",
  ru: "Russian",
  he: "Hebrew",
};

function normalizeTargetLang(v: unknown): TargetLang | null {
  const l = String(v ?? "")
    .trim()
    .toLowerCase();
  if (l === "en" || l.startsWith("en-") || l === "en-us") return "en";
  if (l === "ru" || l.startsWith("ru-") || l === "ru-ru") return "ru";
  if (l === "he" || l.startsWith("he-") || l === "iw" || l === "he-il") return "he";
  return null;
}

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

  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    uid = auth.uid;

    const sharedDreamId = String(body?.sharedDreamId ?? "").trim();
    const targetLang = normalizeTargetLang(body?.targetLang);
    let text = String(body?.text ?? "").trim();

    if (!targetLang) {
      return NextResponse.json(
        { error: "Invalid targetLang. Use en, ru, or he." },
        { status: 400 }
      );
    }

    // Access model (see _lib/translationLedger.ts):
    //  - a user who already unlocked this dream+lang gets it again for free;
    //  - otherwise every request spends the daily free slot / requires Pro,
    //    even when the text is already cached — the cache only saves the
    //    OpenAI call, never the charge.
    const db = adminDb();
    const ref = sharedDreamId ? db.doc(`shared_dreams/${sharedDreamId}`) : null;
    let cached: { entry: TranslationEntry; legacy: boolean } | null = null;

    if (ref) {
      try {
        const snap = await ref.get();
        if (snap.exists) {
          const data = (snap.data() as Record<string, unknown>) ?? {};
          cached = await readCachedTranslation(ref, data, targetLang);
          if (!text) text = String(data?.text ?? "").trim();
        }
      } catch (e: any) {
        console.warn("translate cache read failed:", e?.message ?? e);
      }
    }

    if (ref && cached) {
      const unlock = await readTranslationUnlock(uid, sharedDreamId, targetLang);
      if (unlock) {
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
    }

    if (!text && !cached) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Subscribers: unlimited. Everyone else: one translation per day,
    // otherwise 402 SUBSCRIPTION_REQUIRED (client opens the plans modal).
    const access = await consumeTranslationAccess(uid);
    if ("error" in access) return access.error;
    const usedDailyFree = access.usedDailyFree;
    const paid = access.paid;

    const who = await lookupUser(uid);

    // Cache hit: no OpenAI call, but the slot above is already spent.
    if (ref && cached) {
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
    if (!apiKey) {
      if (usedDailyFree) await refundFreeTranslation(uid);
      return NextResponse.json(
        { error: getMissingOneiroOpenAiKeyMessage() },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_TRANSLATE_MODEL?.trim() || "gpt-5-nano";
    const openai = new OpenAI({ apiKey });
    const langLabel = LANG_LABEL[targetLang];

    let translation = "";
    try {
      const resp = await openai.responses.create({
        model,
        instructions:
          "You are a precise translator. Return only the translated text. Preserve paragraph breaks. Do not add notes, titles, or explanations.",
        input: `Translate the following dream text into ${langLabel}. If it is already in ${langLabel}, return it unchanged.\n\n"""${text}"""`,
        reasoning: { effort: "minimal" },
      });
      translation = extractOutputText(resp);
    } catch (e: any) {
      if (usedDailyFree) await refundFreeTranslation(uid);
      return NextResponse.json(
        { error: e?.message ?? "Translate failed" },
        { status: 500 }
      );
    }

    if (!translation) {
      if (usedDailyFree) await refundFreeTranslation(uid);
      return NextResponse.json({ error: "Empty translation" }, { status: 500 });
    }

    if (ref) {
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
    }

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
    return NextResponse.json(
      { error: e?.message ?? "Translate failed" },
      { status: 500 }
    );
  }
}
