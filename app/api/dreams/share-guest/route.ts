import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { dreamPageIndexNowPaths, notifyIndexNow } from "@/lib/indexnow";
import { FieldValue } from "firebase-admin/firestore";

import { detectDreamLang } from "@/lib/detectDreamLang";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { checkShareableDreamText, guestSharedDocId, shareBadgeFor } from "@/lib/shareBadges";
import { DREAM_MAX_CHARS, isDreamTooLong } from "@/lib/dreamLength";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { readClientIp, readGuestId, setGuestCookie } from "../_lib/guestQuota";

export const runtime = "nodejs";

/**
 * POST — a guest (no account) shares their homepage dream to the public feed,
 * anonymously.
 *
 * Owner = the `dreamly_guest` cookie. The public doc is
 * shared_dreams/guest_{guestId}: one per guest, ever. A guest only gets one free
 * reading (GUEST_FREE_ASKS) so one shared dream is all a guest can have; more
 * needs an account. On sign-in the import claims the doc and moves it to
 * shared_dreams/{uid}_{dreamId} (see ../claim-guest-share).
 *
 * Guards: the guest must have used their reading (proves a real visitor, not a
 * script posting text), a cheap text check (no links / contacts / mashing),
 * and a per-IP daily cap.
 */

const GUEST_SHARE_IP_DAILY_LIMIT = 3;

type Body = {
  text?: string;
  lang?: string;
  lens?: string;
  emojis?: { native?: string; id?: string; name?: string }[];
  iconsEn?: string[];
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function hashIp(ip: string) {
  const salt = process.env.GUEST_IP_SALT?.trim() || "dreamly-guest";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function utcKeys(ms: number) {
  const iso = new Date(ms).toISOString();
  return { dateKey: iso.slice(0, 10), timeKey: iso.slice(11, 16) };
}

function makeTitle(text: string) {
  const t = text.replace(/\s+/g, " ");
  return t.length <= 60 ? t : `${t.slice(0, 60)}…`;
}

export async function POST(req: Request) {
  const guestId = readGuestId(req);
  if (!guestId) {
    return NextResponse.json({ ok: false, code: "NO_GUEST" }, { status: 400 });
  }
  const finish = <T extends NextResponse>(res: T): T => setGuestCookie(res, guestId);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const text = s(body?.text);
    const check = isDreamTooLong(text)
      ? ({ ok: false, reason: "too_long" } as const)
      : checkShareableDreamText(text, DREAM_MAX_CHARS);
    if (!check.ok) {
      return finish(NextResponse.json({ ok: false, code: "REJECTED", reason: check.reason }, { status: 422 }));
    }

    const emojis = (Array.isArray(body?.emojis) ? body.emojis : [])
      .map((e) => ({
        native: s(e?.native),
        ...(s(e?.id) ? { id: s(e?.id) } : {}),
        ...(s(e?.name) ? { name: s(e?.name) } : {}),
      }))
      .filter((e) => e.native)
      .slice(0, 6);
    const iconsEn = (Array.isArray(body?.iconsEn) ? body.iconsEn : []).map(s).filter(Boolean).slice(0, 12);

    const db = adminDb();
    const sharedId = guestSharedDocId(guestId);
    const sharedRef = db.collection("shared_dreams").doc(sharedId);
    const quotaRef = db.collection("guestQuickSymbol").doc(guestId);
    const nowMs = Date.now();
    const { dateKey, timeKey } = utcKeys(nowMs);
    const ip = readClientIp(req);
    const ipRef = db.collection("guestShareIp").doc(`${hashIp(ip)}_${dateKey}`);
    const geo = await resolveIpCity(req).catch(() => null);
    const badge = shareBadgeFor(1);

    const outcome = await db.runTransaction(async (tx) => {
      const [sharedSnap, quotaSnap, ipSnap] = await Promise.all([tx.get(sharedRef), tx.get(quotaRef), tx.get(ipRef)]);

      if (sharedSnap.exists) return "already" as const;
      if (!(Number(quotaSnap.data()?.used ?? 0) >= 1)) return "no_reading" as const;
      if (Number(ipSnap.data()?.used ?? 0) >= GUEST_SHARE_IP_DAILY_LIMIT) return "ip_limit" as const;

      tx.set(sharedRef, {
        ownerUid: null,
        ownerGuestId: guestId,
        ownerDreamId: null,
        ownerStoryId: null,
        sourceType: "dream",
        authorName: null,
        authorEmail: null,
        authorInitials: null,
        title: makeTitle(text),
        text,
        dateKey,
        timeKey,
        createdAtMs: nowMs,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        langGuess: s(body?.lang) || null,
        lens: s(body?.lens) || null,
        source: "manual",
        iconsEn,
        emojis,
        sharedAtMs: nowMs,
        sharedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        deleted: false,
        reactions: { heart: 0, like: 0, star: 0 },
        fromHomeAsk: true,
        fromGuest: true,
        shareBadge: badge.id,
        ...(geo?.cityId
          ? {
              cityId: geo.cityId,
              city: geo.city ?? null,
              country: geo.country ?? null,
              admin1: geo.admin1 ?? null,
              citySource: "ip",
            }
          : {}),
      });
      tx.set(
        ipRef,
        { used: FieldValue.increment(1), dayKey: dateKey, lastAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return "shared" as const;
    });

    if (outcome === "already") {
      return finish(NextResponse.json({ ok: false, code: "ALREADY_SHARED", sharedId }, { status: 409 }));
    }
    if (outcome === "no_reading") {
      return finish(NextResponse.json({ ok: false, code: "NO_READING" }, { status: 403 }));
    }
    if (outcome === "ip_limit") {
      return finish(NextResponse.json({ ok: false, code: "IP_LIMIT" }, { status: 429 }));
    }

    // Bing/Yandex: the dream's public page (/dream/<id>) exists now. Google
    // ignores IndexNow — it finds the page through the sitemap.
    void notifyIndexNow(dreamPageIndexNowPaths(sharedId), { reason: "guest-share" });

    // Mark the admin snapshot of today's guest dream (written by
    // /api/map/ingest-guest when the map pin went through), if there is one.
    await db
      .collection("guest_dreams")
      .doc(`guest_${guestId}_${dateKey}`)
      .update({ shared: true, sharedId, sharedAtMs: nowMs })
      .catch(() => {});

    // Language for the feed's translate button (same as /api/dreams/detect-lang).
    const apiKey = getOneiroOpenAiApiKey();
    if (apiKey) {
      try {
        const { lang, model } = await detectDreamLang(apiKey, text);
        if (lang) await sharedRef.update({ lang, langModel: model, langAtMs: Date.now() });
      } catch (e) {
        console.warn("guest share detect-lang failed", e);
      }
    }

    return finish(NextResponse.json({ ok: true, sharedId, count: 1, badge: badge.id }));
  } catch (e: unknown) {
    console.error(e);
    return finish(NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Server error" }, { status: 500 }));
  }
}
