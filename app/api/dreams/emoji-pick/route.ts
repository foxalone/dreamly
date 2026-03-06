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

function pickFirst(cands: Candidate[], reason: string) {
  const first = cands[0];
  return NextResponse.json({
    native: first.native,
    id: first.id ?? "",
    name: first.name ?? "",
    reason,
  });
}

// максимально “живучее” извлечение текста из responses.create
function extractOutputText(resp: any): string {
  // 1) некоторые версии SDK дают output_text
  const direct = toStr(resp?.output_text);
  if (direct) return direct;

  // 2) официальный формат: output -> content -> text
  const out = resp?.output;
  if (Array.isArray(out)) {
    const chunks: string[] = [];
    for (const item of out) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const t = toStr(c?.text);
        if (t) chunks.push(t);
      }
    }
    const joined = chunks.join("\n").trim();
    if (joined) return joined;
  }

  // 3) на крайний случай
  return "";
}

export async function POST(req: Request) {
  try {
    const apiKey = toStr(process.env.OPENAI_API_KEY);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment (.env.local). Restart dev server after setting it." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const root = toStr(body?.root);
    const lang = toStr(body?.lang) || "unknown";
    const candidates = Array.isArray(body?.candidates) ? (body!.candidates as Candidate[]) : [];

    if (!root) return NextResponse.json({ error: "Missing root" }, { status: 400 });
    if (!candidates.length) return NextResponse.json({ error: "Missing candidates" }, { status: 400 });

    // ✅ Убираем мусор/дубликаты + hard cap
    const uniq = new Map<string, Candidate>();
    for (const c of candidates) {
      const native = toStr(c?.native);
      if (!native) continue;
      if (!uniq.has(native)) uniq.set(native, c);
      if (uniq.size >= 30) break;
    }
    const safeCandidates = Array.from(uniq.values()).slice(0, 20);
    if (!safeCandidates.length) return NextResponse.json({ error: "No valid candidates" }, { status: 400 });

    const client = new OpenAI({ apiKey });

    // Лучше использовать модель, которая у тебя точно доступна
    const model = toStr(process.env.OPENAI_EMOJI_MODEL) || "gpt-4o-mini";

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

    const payload = {
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
    };

    // 1) Пытаемся structured output
    let outText = "";
    let parsed: any = null;

    try {
      const resp = await client.responses.create({
        model,
        input:
          `You pick the single best emoji from the provided candidate list.\n` +
          `You MUST choose ONLY from the candidates.\n` +
          `Return valid JSON matching the schema.\n\n` +
          JSON.stringify(payload, null, 2),
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

      outText = extractOutputText(resp);
      if (outText) {
        try {
          parsed = JSON.parse(outText);
        } catch {
          parsed = null;
        }
      }
    } catch (e: any) {
      // structured output иногда может падать — сделаем fallback ниже
      console.warn("emoji-pick structured failed:", e?.message ?? e);
    }

    // 2) Fallback: обычный JSON без schema
    if (!parsed || !toStr(parsed?.native)) {
      try {
        const resp2 = await client.responses.create({
          model,
          input:
            `Choose exactly ONE emoji from candidates. Return ONLY JSON like {"native":"...","reason":"..."}.\n\n` +
            JSON.stringify(payload, null, 2),
          temperature: 0.2,
        });

        const txt2 = extractOutputText(resp2);
        if (txt2) {
          try {
            parsed = JSON.parse(txt2);
          } catch {
            parsed = null;
          }
        }
      } catch (e: any) {
        console.warn("emoji-pick fallback failed:", e?.message ?? e);
      }
    }

    const pickedNative = toStr(parsed?.native);
    const found = safeCandidates.find((c) => c.native === pickedNative);

    if (!found) {
      // fallback: первый кандидат (никогда не 500 из-за OpenAI)
      return pickFirst(safeCandidates, "fallback_first_candidate");
    }

    return NextResponse.json({
      native: found.native,
      id: found.id ?? "",
      name: found.name ?? "",
      reason: toStr(parsed?.reason) || "picked",
    });
  } catch (e: any) {
    // важное: вернуть текст ошибки, чтобы ты видел его в Network->Response
    console.error("emoji-pick error:", e);
    return NextResponse.json(
      { error: e?.message ?? "emoji-pick failed", stack: toStr(e?.stack) ? "see server logs" : undefined },
      { status: 500 }
    );
  }
}