// src/app/api/dreams/analyze/route.ts
import { saveGuestDreamSnapshot } from "../_lib/guestDreamSnapshot";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { DREAM_ANALYSIS_MODEL } from "@/lib/aiModels";
import { pickDreamEmojisAi } from "@/lib/pickDreamEmojisAi";
import { pickDreamMapVisuals } from "@/lib/dream-map/pickDreamMapVisuals";
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
import { grantEscapeForOwner } from "../../game/_lib/player";
import { matchEscapes } from "../../game/_lib/escapeMatch";
import { analysisProviderFailure } from "@/lib/analysisAttempts";
import { parseDreamLens } from "@/lib/dream-lenses";

import { dreamAnalysisMessages } from "@/lib/dreamAnalysisPrompt";
import { startAnalysisAttempt, finishAnalysisAttempt, recordAttemptAccess } from "../_lib/analysisAttempts";

type Body = {
  text: string;
  source?: string;
  dreamId?: string;
  attemptId?: string;
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
  const startedAtMs = Date.now();
  let chargedUid: string | null = null;
  let freeAnalysisUid: string | null = null;
  let adCreditUid: string | null = null;
  let guestId: string | null = null;
  let clientIp = "";
  let guestBooking: Extract<GuestConsumeResult, { ok: true }> | null = null;
  let attemptId: string | null = null;
  let failureCode: string | undefined;

  const finish = async <T extends NextResponse>(res: T): Promise<T> => {
    const result = await res.clone().json().catch(() => ({}));
    await finishAnalysisAttempt(attemptId, res.status, failureCode ?? result.code, result, startedAtMs);
    if (attemptId) res.headers.set("X-Dreamly-Attempt", attemptId);
    return guestId ? setGuestCookie(res, guestId) : res;
  };

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

    if (!uid) guestId = readGuestId(req) ?? newGuestId();
    attemptId = await startAnalysisAttempt({
      text, uid, guestId: readGuestId(req) ?? guestId,
      lang: String(body.lang ?? "").trim() || guessLang(text),
      lens: parseDreamLens(body.lens),
      source: body.source, dreamId: body.dreamId, attemptId: body.attemptId,
    }, req);

    if (!uid) {
      guestId ??= newGuestId();
      clientIp = readClientIp(req);
      // Try an ad from the first guest reading; only its no-fill fallback is free.
      // Previously stored answers must never bypass quota accounting.
      const booked = await consumeGuestAsk(guestId, clientIp);
      if (!booked.ok) {
        return finish(
          NextResponse.json(
            {
              error: "Watch a short ad or sign in to interpret your dream.",
              code: "GUEST_LIMIT_REACHED",
              reason: booked.reason,
            },
            { status: 401 }
          )
        );
      }
      guestBooking = booked;
      await recordAttemptAccess(attemptId, null, guestId, booked.charge === "free" ? "guest_free_access" : "ad_credit_used");
    } else {
      // Subscribers: DREAMS_PER_DAY analyses a day. Signed-in without a
      // subscription: 3 free analyses in total, max 1 a day.
      const access = await consumeAnalysisAccess(uid);
      if ("error" in access) return finish(access.error);
      if (access.charge === "slot") chargedUid = uid;
      if (access.charge === "free") freeAnalysisUid = uid;
      if (access.charge === "ad") adCreditUid = uid;
    }
    const isGuest = !uid;

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      failureCode = "API_KEY_MISSING";
      await refundCharge();
      return finish(NextResponse.json({ error: getMissingOneiroOpenAiKeyMessage() }, { status: 500 }));
    }

    const lang = (String(body?.lang ?? "").trim() || guessLang(text)) as string;
    const lens = parseDreamLens(body?.lens);

    const model = DREAM_ANALYSIS_MODEL;
    const openai = new OpenAI({ apiKey });

    // Emoji pick runs alongside the analysis call; it never fails the request.
    const emojiPromise = pickDreamEmojisAi(apiKey, text).catch(() => null);

    let analysis = "";
    try {
      const resp = await openai.chat.completions.create({
        model,
        reasoning_effort: "minimal",
        messages: dreamAnalysisMessages(text, lang, lens),
      });
      analysis = (resp.choices?.[0]?.message?.content ?? "").trim();
    } catch (e: unknown) {
      failureCode = analysisProviderFailure(e);
      await refundCharge();
      return finish(
        NextResponse.json({ error: e instanceof Error ? e.message : "Analyze failed" }, { status: 500 })
      );
    }

    if (!analysis) {
      failureCode = "EMPTY_ANALYSIS";
      await refundCharge();
      return finish(NextResponse.json({ error: "Empty analysis" }, { status: 500 }));
    }

    const emojiPick = await emojiPromise;
    const fallbackEmojis = emojiPick?.emojis?.length ? [] : (await pickDreamMapVisuals(text).catch(() => null))?.emojis ?? [];
    const dreamEmojis = emojiPick?.emojis?.length ? emojiPick.emojis : fallbackEmojis.length ? fallbackEmojis : [{ native: "💭" }];

    if (isGuest && guestId) {
      await saveGuestDreamSnapshot({ guestId, text, analysis, model, lens, lang, emojis: dreamEmojis })
        .catch((error) => console.warn("Guest dream snapshot failed", error));
    }

    // Every analysis paid with an ad credit grants its own icons. Free/plan
    // analyses retain the once-per-day rule. Never fails the reading.
    let escape: { granted: number; total: number; emojis: string[]; grantedEmojis: string[] } | null = null;
    const escapeOwnerKey = uid ? `u_${uid}` : guestId ? `g_${guestId}` : null;
    const escapeSource =
      Array.isArray(body?.escapeEmojis) && body.escapeEmojis.length ? body.escapeEmojis : dreamEmojis;
    if (escapeOwnerKey && escapeSource.length > 0) {
      const matched = matchEscapes(escapeSource);
      escape = await grantEscapeForOwner(
        { ownerKey: escapeOwnerKey, uid, guestId: uid ? null : guestId, newGuest: false },
        matched.length ? matched : matchEscapes([{ native: "💭" }]),
        Boolean(adCreditUid || guestBooking?.charge === "ad")
      ).catch(() => null);
    }

    return finish(
      NextResponse.json({
        analysis,
        model,
        lens,
        guest: isGuest,
        cost: 0,
        emojis: dreamEmojis,
        emojiModel: emojiPick?.model ?? null,
        escape,
      })
    );
  } catch (e: unknown) {
    await refundCharge();
    return finish(
      NextResponse.json({ error: e instanceof Error ? e.message : "Analyze failed" }, { status: 500 })
    );
  }
}
