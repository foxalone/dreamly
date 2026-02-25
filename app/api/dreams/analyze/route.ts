// src/app/api/dreams/analyze/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

type Body = {
  text: string;
  lang?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  try {
    const body = (await req.json()) as Body;

    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
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

    // Using chat.completions for compatibility
    const model = process.env.OPENAI_DREAM_MODEL || "gpt-4o-mini";

    const resp = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });

    const analysis = (resp.choices?.[0]?.message?.content ?? "").trim();
    if (!analysis) {
      return NextResponse.json({ error: "Empty analysis" }, { status: 500 });
    }

    return NextResponse.json({
      analysis,
      model,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Analyze failed" },
      { status: 500 }
    );
  }
}