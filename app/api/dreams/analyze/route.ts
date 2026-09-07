// src/app/api/dreams/analyze/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { HOME_DREAM_MAX_CHARS } from "@/lib/homeDreamPending";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeDreamSlot, refundDreamSlot, requirePaidAccess } from "../_lib/subscription";
import {
  consumeGuestAsk,
  newGuestId,
  readClientIp,
  readGuestId,
  refundGuestAsk,
  setGuestCookie,
} from "../_lib/guestQuota";
import { dreamLensPrompt, parseDreamLens } from "@/lib/dream-lenses";

type Body = {
  text: string;
  lang?: string;
  lens?: string;
  idToken?: string;
  countTowardLimit?: boolean;
};

function guessLang(text: string): string {
  const t = text ?? "";
  const hasHe = /[\u0590-\u05FF]/.test(t);
  const hasAr = /[\u0600-\u06FF]/.test(t);
  const hasCy = /[\u0400-\u04FF]/.test(t);
  const hasLat = /[A-Za-z]/.test(t);
  if (hasHe && !hasCy && !hasLat && !hasAr) return "he";
  if (hasAr && !hasHe && !hasCy) return "ar";
  if (hasCy && !hasHe && !hasAr) return "ru";
  if (hasLat && !hasHe && !hasCy && !hasAr) return "en";
  return "unknown";
}

function analysisLanguageName(lang: string): string {
  switch (lang) {
    case "es":
      return "Spanish";
    case "ar":
      return "Arabic";
    case "pt":
      return "Brazilian Portuguese";
    case "de":
      return "German";
    case "ru":
      return "Russian";
    case "he":
      return "Hebrew";
    default:
      return "English";
  }
}

export async function POST(req: Request) {
  let chargedUid: string | null = null;
  let guestId: string | null = null;
  let clientIp = "";

  const finish = <T extends NextResponse>(res: T): T =>
    guestId ? setGuestCookie(res, guestId) : res;

  const refundCharge = async () => {
    if (chargedUid) {
      await refundDreamSlot(chargedUid);
      chargedUid = null;
      return;
    }
    if (guestId) await refundGuestAsk(guestId, clientIp);
  };

  try {
    const body = (await req.json()) as Body;
    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    if (text.length > HOME_DREAM_MAX_CHARS) {
      return NextResponse.json({ error: "Dream text is too long." }, { status: 400 });
    }

    const token = String(body?.idToken ?? "").trim();
    let uid: string | null = null;
    if (token) {
      const auth = await requireSignedInUid(token);
      if (!("error" in auth)) uid = auth.uid;
    }

    if (!uid) {
      guestId = readGuestId(req) ?? newGuestId();
      clientIp = readClientIp(req);
      const booked = await consumeGuestAsk(guestId, clientIp);
      if (!booked.ok) {
        return finish(
          NextResponse.json(
            {
              error:
                booked.reason === "ip_limit"
                  ? "Too many free interpretations from this network. Sign in to continue."
                  : "That was your free interpretation. Sign in to continue.",
              code: "GUEST_LIMIT_REACHED",
            },
            { status: 401 }
          )
        );
      }
    } else {
      const countTowardLimit = body?.countTowardLimit !== false;
      if (countTowardLimit) {
        const debit = await consumeDreamSlot(uid);
        if ("error" in debit) return debit.error;
        chargedUid = uid;
      } else {
        const access = await requirePaidAccess(uid);
        if ("error" in access) return access.error;
      }
    }
    const isGuest = !uid;

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      await refundCharge();
      return finish(NextResponse.json({ error: getMissingOneiroOpenAiKeyMessage() }, { status: 500 }));
    }

    const lang = (String(body?.lang ?? "").trim() || guessLang(text)) as string;
    const lens = parseDreamLens(body?.lens);

    const system =
      "You provide concise dream analysis text only. No headings, no questions, no advice.";

    const userPrompt = `
Dream text:
"""${text}"""

Write a concise dream analysis in ${analysisLanguageName(lang)}.

Interpretive lens: ${lens}.
${dreamLensPrompt(lens)}
The lens changes emphasis and vocabulary only. Keep the same format.

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
      await refundCharge();
      return finish(
        NextResponse.json({ error: e?.message ?? "Analyze failed" }, { status: 500 })
      );
    }

    if (!analysis) {
      await refundCharge();
      return finish(NextResponse.json({ error: "Empty analysis" }, { status: 500 }));
    }

    return finish(
      NextResponse.json({
        analysis,
        model,
        lens,
        guest: isGuest,
        cost: 0,
      })
    );
  } catch (e: any) {
    if (chargedUid || guestId) await refundCharge();
    return finish(
      NextResponse.json({ error: e?.message ?? "Analyze failed" }, { status: 500 })
    );
  }
}
