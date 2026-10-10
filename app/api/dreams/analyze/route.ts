// src/app/api/dreams/analyze/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { pickDreamEmojisAi } from "@/lib/pickDreamEmojisAi";
import { isDreamTooLong } from "@/lib/dreamLength";
import { requireSignedInUid } from "../_lib/requireUser";
import { consumeAnalysisAccess, refundAdCredit, refundDreamSlot, refundFreeAnalysis } from "../_lib/subscription";
import {
  type GuestConsumeResult,
  consumeGuestAsk,
  newGuestId,
  readClientIp,
  readGuestId,
  refundGuestAsk,
  setGuestCookie,
} from "../_lib/guestQuota";
import { readGuestAskDedup, writeGuestAskDedup } from "../_lib/guestDedup";
import { grantEscapeForOwner } from "../../game/_lib/player";
import { matchEscapes } from "../../game/_lib/escapeMatch";
import { parseDreamLens } from "@/lib/dream-lenses";

import { dreamAnalysisMessages } from "@/lib/dreamAnalysisPrompt";

type Body = {
  text: string;
  lang?: string;
  lens?: string;
  idToken?: string;
  countTowardLimit?: boolean;
  /** The dream's already-created emojis: the escape uses exactly these (re-analysis
      would otherwise pick a fresh, different set). Falls back to this call's pick. */
  escapeEmojis?: { native?: string }[];
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

export async function POST(req: Request) {
  let chargedUid: string | null = null;
  let freeAnalysisUid: string | null = null;
  let adCreditUid: string | null = null;
  let guestId: string | null = null;
  let clientIp = "";
  let guestBooking: Extract<GuestConsumeResult, { ok: true }> | null = null;

  const finish = <T extends NextResponse>(res: T): T =>
    guestId ? setGuestCookie(res, guestId) : res;

  const refundCharge = async () => {
    if (chargedUid) {
      await refundDreamSlot(chargedUid);
      chargedUid = null;
      return;
    }
    if (freeAnalysisUid) {
      await refundFreeAnalysis(freeAnalysisUid);
      freeAnalysisUid = null;
      return;
    }
    if (adCreditUid) {
      await refundAdCredit(adCreditUid);
      adCreditUid = null;
      return;
    }
    if (guestId && guestBooking) {
      const booking = guestBooking;
      guestBooking = null;
      await refundGuestAsk(guestId, clientIp, booking);
    }
  };

  try {
    const body = (await req.json()) as Body;
    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    if (isDreamTooLong(text)) {
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
      // Same text from the same network today (cookie reset / incognito):
      // a FREE repeat gets the stored answer — no OpenAI call, no quota
      // spent. A repeat paid with an ad credit (e.g. the same dream through
      // another lens) falls through and buys a fresh analysis, like any
      // paid path — users who play by the rules get a real new reading.
      const dedup = await readGuestAskDedup(clientIp, text).catch(() => null);
      const booked = await consumeGuestAsk(guestId, clientIp);
      if (dedup?.analysis && (!booked.ok || booked.charge === "free")) {
        // Not ad-paid: hand back the free slot (if one was taken) and serve
        // the cache.
        if (booked.ok) await refundGuestAsk(guestId, clientIp, booked);
        return finish(
          NextResponse.json({
            analysis: dedup.analysis,
            model: dedup.model ?? null,
            lens: dedup.lens ?? null,
            guest: true,
            cost: 0,
            emojis: dedup.emojis ?? [],
            emojiModel: dedup.emojiModel ?? null,
            cached: true,
          })
        );
      }
      if (!booked.ok) {
        return finish(
          NextResponse.json(
            {
              error:
                booked.reason === "ip_limit"
                  ? "Too many free interpretations from this network. Sign in to continue."
                  : "That was your free interpretation. Sign in to continue.",
              code: "GUEST_LIMIT_REACHED",
              reason: booked.reason,
            },
            { status: 401 }
          )
        );
      }
      guestBooking = booked;
    } else {
      // Subscribers: DREAMS_PER_DAY analyses a day. Signed-in without a
      // subscription: 3 free analyses in total, max 1 a day.
      const access = await consumeAnalysisAccess(uid);
      if ("error" in access) return access.error;
      if (access.charge === "slot") chargedUid = uid;
      if (access.charge === "free") freeAnalysisUid = uid;
      if (access.charge === "ad") adCreditUid = uid;
    }
    const isGuest = !uid;

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      await refundCharge();
      return finish(NextResponse.json({ error: getMissingOneiroOpenAiKeyMessage() }, { status: 500 }));
    }

    const lang = (String(body?.lang ?? "").trim() || guessLang(text)) as string;
    const lens = parseDreamLens(body?.lens);

    const model = process.env.OPENAI_DREAM_MODEL?.trim() || "gpt-4o-mini";
    const openai = new OpenAI({ apiKey });

    // Emoji pick runs alongside the analysis call; it never fails the request.
    const emojiPromise = pickDreamEmojisAi(apiKey, text).catch(() => null);

    let analysis = "";
    try {
      const resp = await openai.chat.completions.create({
        model,
        temperature: 0.3,
        messages: dreamAnalysisMessages(text, lang, lens),
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

    const emojiPick = await emojiPromise;

    if (isGuest) {
      // Remember the answer for today's repeats of this text from this network.
      await writeGuestAskDedup(clientIp, text, {
        analysis,
        model,
        lens: lens ?? null,
        emojis: emojiPick?.emojis ?? [],
        emojiModel: emojiPick?.model ?? null,
        createdAtMs: Date.now(),
      }).catch(() => {});
    }

    // Dream Kingdoms: the dream's emojis escape into the floating dream catcher —
    // exactly the icons this dream created, one dream per day. Never fails the reading.
    let escape: { granted: number; total: number } | null = null;
    const escapeOwnerKey = uid ? `u_${uid}` : guestId ? `g_${guestId}` : null;
    const escapeSource =
      Array.isArray(body?.escapeEmojis) && body.escapeEmojis.length ? body.escapeEmojis : emojiPick?.emojis ?? [];
    if (escapeOwnerKey && escapeSource.length > 0) {
      escape = await grantEscapeForOwner(
        { ownerKey: escapeOwnerKey, uid, guestId: uid ? null : guestId, newGuest: false },
        matchEscapes(escapeSource)
      ).catch(() => null);
    }

    return finish(
      NextResponse.json({
        analysis,
        model,
        lens,
        guest: isGuest,
        cost: 0,
        emojis: emojiPick?.emojis ?? [],
        emojiModel: emojiPick?.model ?? null,
        escape,
      })
    );
  } catch (e: any) {
    await refundCharge();
    return finish(
      NextResponse.json({ error: e?.message ?? "Analyze failed" }, { status: 500 })
    );
  }
}
