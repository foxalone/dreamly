// app/api/dreams/rootwords/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function toStr(x: any) {
  return String(x ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = toStr(body?.text);

    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are a symbolic dream analyzer.

Your task is NOT lemmatization.
Extract the CORE SYMBOLIC STRUCTURE of the dream.

OUTPUT (must match the provided JSON schema):

- lang: "en" | "ru" | "he" | "unknown"
- core: 4–6 most fundamental symbolic roots.
- support: 6–12 secondary supporting roots.
- themes: 3–5 short conceptual themes (1–3 words each).

CORE RULES:
1) Core symbols must be the elements without which the dream loses its identity.
2) Prefer symbolic anchors over decorative scenery.
3) Include emotional or transformation elements if present.
4) Be highly selective. Fewer, stronger symbols are better.
5) Cover the whole dream (beginning, middle, ending).

SUPPORT RULES:
- Include meaningful objects, actions, atmosphere elements.
- Avoid generic filler words.

REMOVE:
- stop-words
- numbers
- emojis
- proper names
- generic adjectives unless they function as symbols

LANGUAGE:
- Preserve original language.
- Return base lemma form.
- Do NOT translate.

Return only valid JSON.
`.trim(),
        },
        { role: "user", content: text },
      ],

      // ✅ structured output через text.format
      text: {
        format: {
          type: "json_schema",
          name: "root_words",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              lang: { type: "string" },
              core: { type: "array", items: { type: "string" } },
              support: { type: "array", items: { type: "string" } },
              themes: { type: "array", items: { type: "string" } },
            },
            required: ["lang", "core", "support", "themes"],
          },
        },
      },
      temperature: 0.2,
    });

    const jsonText = toStr((resp as any).output_text);
    const data = JSON.parse(jsonText);

    // ✅ на всякий случай страховка формата
    return NextResponse.json({
      lang: toStr(data?.lang) || "unknown",
      core: Array.isArray(data?.core) ? data.core.map((x: any) => toStr(x)).filter(Boolean) : [],
      support: Array.isArray(data?.support)
        ? data.support.map((x: any) => toStr(x)).filter(Boolean)
        : [],
      themes: Array.isArray(data?.themes) ? data.themes.map((x: any) => toStr(x)).filter(Boolean) : [],
    });
  } catch (e: any) {
    console.error("rootwords error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}