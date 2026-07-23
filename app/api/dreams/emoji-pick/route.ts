// src/app/api/dreams/emoji-pick/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { requireSignedInUid } from "../_lib/requireUser";
import {
  EMOJI_PICK_CREDIT_COST,
  chargeOpenAiCall,
  refundOpenAiCall,
  type OpenAiCharge,
} from "../_lib/credits";

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
  idToken?: string;
};

function toStr(x: unknown) {
  return String(x ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : toStr(error);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function pickFirst(
  cands: Candidate[],
  reason: string,
  extras?: { cost?: number; credits?: number; usedDailyFree?: boolean }
) {
  const first = cands[0];
  return NextResponse.json({
    native: first.native,
    id: first.id ?? "",
    name: first.name ?? "",
    reason,
    ...(extras ?? {}),
  });
}

function extractOutputText(resp: unknown): string {
  const direct = isRecord(resp) ? toStr(resp.output_text) : "";
  if (direct) return direct;

  const out = isRecord(resp) ? resp.output : undefined;
  if (Array.isArray(out)) {
    const chunks: string[] = [];
    for (const item of out) {
      const content = isRecord(item) ? item.content : undefined;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const t = isRecord(c) ? toStr(c.text) : "";
        if (t) chunks.push(t);
      }
    }
    const joined = chunks.join("\n").trim();
    if (joined) return joined;
  }

  return "";
}

export async function POST(req: Request) {
  let uid: string | null = null;
  let charge: OpenAiCharge | null = null;

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    uid = auth.uid;

    const root = toStr(body?.root);
    const lang = toStr(body?.lang) || "unknown";
    const candidates = Array.isArray(body?.candidates) ? body.candidates : [];

    if (!root) return NextResponse.json({ error: "Missing root" }, { status: 400 });
    if (!candidates.length) return NextResponse.json({ error: "Missing candidates" }, { status: 400 });

    const uniq = new Map<string, Candidate>();
    for (const c of candidates) {
      const native = toStr(c?.native);
      if (!native) continue;
      if (!uniq.has(native)) uniq.set(native, c);
      if (uniq.size >= 30) break;
    }
    const safeCandidates = Array.from(uniq.values()).slice(0, 20);
    if (!safeCandidates.length) return NextResponse.json({ error: "No valid candidates" }, { status: 400 });

    const charged = await chargeOpenAiCall(uid, EMOJI_PICK_CREDIT_COST);
    if ("error" in charged) return charged.error;
    charge = charged;

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      await refundOpenAiCall(uid, charge);
      charge = null;
      return NextResponse.json(
        { error: getMissingOneiroOpenAiKeyMessage() },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });
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
      required: ["native", "id", "name", "reason"],
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

    let parsed: Record<string, unknown> | null = null;

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

      const outText = extractOutputText(resp);
      if (outText) parsed = parseJsonObject(outText);
    } catch (e: unknown) {
      console.warn("emoji-pick structured failed:", errorMessage(e));
    }

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
        if (txt2) parsed = parseJsonObject(txt2);
      } catch (e: unknown) {
        console.warn("emoji-pick fallback failed:", errorMessage(e));
      }
    }

    const pickedNative = toStr(parsed?.native);
    const found = safeCandidates.find((c) => c.native === pickedNative);
    const paid = {
      cost: charge.cost,
      credits: charge.credits,
      usedDailyFree: charge.usedDailyFree,
    };

    if (!found) {
      return pickFirst(safeCandidates, "fallback_first_candidate", paid);
    }

    return NextResponse.json({
      native: found.native,
      id: found.id ?? "",
      name: found.name ?? "",
      reason: toStr(parsed?.reason) || "picked",
      ...paid,
    });
  } catch (e: unknown) {
    if (uid && charge) await refundOpenAiCall(uid, charge);
    console.error("emoji-pick error:", e);
    return NextResponse.json(
      { error: errorMessage(e) || "emoji-pick failed" },
      { status: 500 }
    );
  }
}
