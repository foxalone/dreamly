// src/app/api/dreams/analyze/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { requireSignedInUid } from "../_lib/requireUser";
import {
  ANALYZE_CREDIT_COST,
  debitCredits,
  refundCredits,
} from "../_lib/credits";

type Body = {
  text: string;
  lang?: string;
  idToken?: string;
};

function guessLang(text: string): "ru" | "en" | "he" | "unknown" {
  const t = text ?? "";
  const hasHe = /[\u0590-\u05FF]/.test(t);
  const hasCy = /[\u0400-\u04FF]/.test(t);
  const hasLat = /[A-Za-z]/.test(t);
  if (hasHe && !hasCy && !hasLat) return "he";
  if (hasCy && !hasHe) return "ru";
  if (hasLat && !hasHe && !hasCy) return "en";
  return "unknown";
}

export async function POST(req: Request) {
  let chargedUid: string | null = null;

  try {
    const body = (await req.json()) as Body;

    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const { uid } = auth;

    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const debit = await debitCredits(uid, ANALYZE_CREDIT_COST);
    if ("error" in debit) return debit.error;
    chargedUid = uid;

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      await refundCredits(uid, ANALYZE_CREDIT_COST);
      chargedUid = null;
      return NextResponse.json({ error: getMissingOneiroOpenAiKeyMessage() }, { status: 500 });
    }

    const lang = (String(body?.lang ?? "").trim() || guessLang(text)) as string;

    const system =
      "You provide concise dream analysis text only. No headings, no questions, no advice.";

    const userPrompt = `
Dream text:
"""${text}"""

Write a concise dream analysis in ${lang === "ru" ? "Russian" : lang === "he" ? "Hebrew" : "English"}.

Rules:
- Do NOT include any titles or section headers.
- Do NOT include words like "Summary", "Key symbols", or "Possible emotions".
- Do NOT ask questions.
- Do NOT give advice or suggestions.
- Do NOT address the user directly.
- Avoid medical or diagnostic language.
- Write as a natural, flowing interpretation paragraph (2–4 short paragraphs max).

Keep it under ~1000 characters.
`.trim();

    const model = process.env.OPENAI_DREAM_MODEL || "gpt-4o-mini";
    const openai = new OpenAI({ apiKey });

    let analysis = "";
    try {
      const resp = await openai.chat.completions.create({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      });
      analysis = (resp.choices?.[0]?.message?.content ?? "").trim();
    } catch (e: any) {
      await refundCredits(uid, ANALYZE_CREDIT_COST);
      chargedUid = null;
      return NextResponse.json(
        { error: e?.message ?? "Analyze failed" },
        { status: 500 }
      );
    }

    if (!analysis) {
      await refundCredits(uid, ANALYZE_CREDIT_COST);
      chargedUid = null;
      return NextResponse.json({ error: "Empty analysis" }, { status: 500 });
    }

    return NextResponse.json({
      analysis,
      model,
      cost: ANALYZE_CREDIT_COST,
      credits: debit.credits,
    });
  } catch (e: any) {
    if (chargedUid) {
      await refundCredits(chargedUid, ANALYZE_CREDIT_COST);
    }
    return NextResponse.json(
      { error: e?.message ?? "Analyze failed" },
      { status: 500 }
    );
  }
}
