// src/app/api/dreams/emoji-pick/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

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

function toStr(x: any) {
  return String(x ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const root = toStr(body?.root);
    const lang = toStr(body?.lang) || "unknown";
    const candidates = Array.isArray(body?.candidates) ? body!.candidates : [];

    if (!root) return NextResponse.json({ error: "Missing root" }, { status: 400 });
    if (!candidates.length)
      return NextResponse.json({ error: "Missing candidates" }, { status: 400 });

    // ✅ Убираем мусор/дубликаты + hard cap
    const uniq = new Map<string, Candidate>();
    for (const c of candidates) {
      const native = toStr((c as any)?.native);
      if (!native) continue;
      if (!uniq.has(native)) uniq.set(native, c as Candidate);
      if (uniq.size >= 30) break;
    }
    const safeCandidates = Array.from(uniq.values()).slice(0, 20);

    if (!safeCandidates.length) {
      return NextResponse.json({ error: "No valid candidates" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ JSON schema (строгий)
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        native: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
        reason: { type: "string" },
      },
      required: ["native"],
    } as const;

    // ✅ input делаем строкой (чтобы не гадать с типами)
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

    // ✅ FIX: structured output через text.format (а не response_format)
    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "emoji_pick",
          strict: true,
          schema,
        },
      },
      temperature: 0.2,
    });

    const outText = toStr((resp as any).output_text);

    let parsed: any = null;
    try {
      parsed = JSON.parse(outText);
    } catch {
      parsed = null;
    }

    const pickedNative = toStr(parsed?.native);
    const found = safeCandidates.find((c) => c.native === pickedNative);

    // fallback: первый кандидат
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
      reason: toStr(parsed?.reason),
    });
  } catch (e: any) {
    console.error("emoji-pick error:", e);
    return NextResponse.json({ error: e?.message ?? "emoji-pick failed" }, { status: 500 });
  }
}