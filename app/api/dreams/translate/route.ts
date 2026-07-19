import { NextResponse } from "next/server";
import OpenAI from "openai";
import { FieldValue } from "firebase-admin/firestore";
import {
  getMissingOneiroOpenAiKeyMessage,
  getOneiroOpenAiApiKey,
} from "@/lib/openaiEnv";
import { adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

type Body = {
  sharedDreamId?: string;
  text?: string;
  targetLang?: string;
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

function translationText(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v) {
    return String((v as any).text ?? "").trim();
  }
  return "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Extract text from responses.create (gpt-5 family). */
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

export async function POST(req: Request) {
  try {
    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: getMissingOneiroOpenAiKeyMessage() },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const sharedDreamId = String(body?.sharedDreamId ?? "").trim();
    const targetLang = normalizeTargetLang(body?.targetLang);
    let text = String(body?.text ?? "").trim();

    if (!targetLang) {
      return NextResponse.json(
        { error: "Invalid targetLang. Use en, ru, or he." },
        { status: 400 }
      );
    }

    // 1) Firebase cache (shared across users)
    if (sharedDreamId) {
      try {
        const db = adminDb();
        const ref = db.doc(`shared_dreams/${sharedDreamId}`);
        const snap = await ref.get();
        if (snap.exists) {
          const data = snap.data() as any;
          const cached = translationText(data?.translations?.[targetLang]);
          if (cached) {
            return NextResponse.json({
              translation: cached,
              cached: true,
              model: data?.translations?.[targetLang]?.model ?? null,
              targetLang,
            });
          }
          if (!text) text = String(data?.text ?? "").trim();
        }
      } catch (e: any) {
        console.warn("translate cache read failed:", e?.message ?? e);
      }
    }

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // 2) GPT translate — gpt-5-nano via Responses API
    // Separate env from OPENAI_DREAM_MODEL (analyze still uses gpt-4o-mini)
    const model = process.env.OPENAI_TRANSLATE_MODEL?.trim() || "gpt-5-nano";
    const openai = new OpenAI({ apiKey });
    const langLabel = LANG_LABEL[targetLang];

    const resp = await openai.responses.create({
      model,
      instructions:
        "You are a precise translator. Return only the translated text. Preserve paragraph breaks. Do not add notes, titles, or explanations.",
      input: `Translate the following dream text into ${langLabel}. If it is already in ${langLabel}, return it unchanged.\n\n"""${text}"""`,
      // keep reasoning cheap for plain translation
      reasoning: { effort: "minimal" },
    });

    const translation = extractOutputText(resp);
    if (!translation) {
      return NextResponse.json({ error: "Empty translation" }, { status: 500 });
    }

    // 3) Save to Firebase for reuse
    if (sharedDreamId) {
      try {
        const db = adminDb();
        const ref = db.doc(`shared_dreams/${sharedDreamId}`);
        await ref.update({
          [`translations.${targetLang}`]: {
            text: translation,
            model,
            atMs: Date.now(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (e: any) {
        console.warn("translate cache write failed:", e?.message ?? e);
      }
    }

    return NextResponse.json({
      translation,
      cached: false,
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
