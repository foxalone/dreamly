// src/app/api/dreams/emoji-pick/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

type Candidate = {
  id?: string;
  name?: string;
  native: string;
  keywords?: string[];
};

type Body = {
  root: string;
  lang?: string;
  candidates: Candidate[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const root = String(body?.root ?? "").trim();
    const lang = String(body?.lang ?? "").trim() || "unknown";
    const candidates = Array.isArray(body?.candidates) ? body.candidates : [];

    if (!root) return NextResponse.json({ error: "Missing root" }, { status: 400 });
    if (candidates.length === 0)
      return NextResponse.json({ error: "Missing candidates" }, { status: 400 });

    // ✅ Убираем мусор/дубликаты + hard cap
    const uniq = new Map<string, Candidate>();
    for (const c of candidates) {
      const native = String(c?.native ?? "");
      if (!native) continue;
      if (!uniq.has(native)) uniq.set(native, c);
      if (uniq.size >= 30) break;
    }
    const safeCandidates = Array.from(uniq.values()).slice(0, 20);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ JSON Schema для строгого ответа
    const schema = {
      name: "emoji_pick",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          native: { type: "string" },
          id: { type: "string" },
          name: { type: "string" },
          reason: { type: "string" },
        },
        required: ["native"],
      },
    } as const;

    // ✅ ВАЖНО: input делаем СТРОКОЙ (так TS/SDK не ругается)
    const prompt =
      `You pick the single best emoji from the provided candidate list.\n` +
      `You MUST choose ONLY from the candidates.\n` +
      `Return valid JSON matching the schema.\n\n` +
      JSON.stringify(
        {
          root,
          lang,
          instruction:
            "Pick the best semantic match for this root word for a dream-journal UI. Prefer concrete, non-abstract, non-flag emojis. Choose exactly one.",
          candidates: safeCandidates.map((c) => ({
            native: c.native,
            id: c.id ?? "",
            name: c.name ?? "",
            keywords: Array.isArray(c.keywords) ? c.keywords.slice(0, 12) : [],
          })),
        },
        null,
        2
      );

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json_schema", json_schema: schema },
      temperature: 0.2,
    });

    // ✅ В новом SDK есть удобное поле
    const outText = (resp as any).output_text ?? "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(outText);
    } catch {
      parsed = null;
    }

    const pickedNative = String(parsed?.native ?? "").trim();
    const found = safeCandidates.find((c) => c.native === pickedNative);

    if (!found) {
      const first = safeCandidates[0];
      return NextResponse.json({
        native: first.native,
        id: first.id ?? "",
        name: first.name ?? "",
        reason: "fallback_first_candidate",
      });
    }

    return NextResponse.json({
      native: found.native,
      id: found.id ?? "",
      name: found.name ?? "",
      reason: String(parsed?.reason ?? ""),
    });
  } catch (e: any) {
    console.error("emoji-pick error:", e);
    return NextResponse.json(
      { error: e?.message ?? "emoji-pick failed" },
      { status: 500 }
    );
  }
}