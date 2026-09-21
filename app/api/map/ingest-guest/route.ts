import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import {
  newGuestId,
  readClientIp,
  readGuestId,
  setGuestCookie,
} from "@/app/api/dreams/_lib/guestQuota";

export const runtime = "nodejs";

const GUEST_MAP_IP_DAILY_LIMIT = 8;

type Body = {
  emojis?: { native?: string; id?: string; name?: string }[];
  // Optional snapshot of the guest dream itself, so the admin dashboard can
  // show guest pins as rows (collection: guest_dreams, doc id = ingestId).
  text?: string;
  analysis?: string;
  lang?: string;
  lens?: string;
  iconsEn?: string[];
  rootsEn?: string[];
};

const GUEST_TEXT_MAX = 4000;
const GUEST_ANALYSIS_MAX = 12000;

function strList(v: unknown, max = 12): string[] {
  return (Array.isArray(v) ? v : []).map((x) => s(x)).filter(Boolean).slice(0, max);
}

function hashIp(ip: string) {
  const salt = process.env.GUEST_IP_SALT?.trim() || "dreamly-guest";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function todayKeyUTC(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const guestId = readGuestId(req) ?? newGuestId();
  const finish = <T extends NextResponse>(res: T): T => setGuestCookie(res, guestId);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const emojiObjs = (Array.isArray(body?.emojis) ? body.emojis : [])
      .map((item) => ({
        native: s(item?.native),
        ...(s(item?.id) ? { id: s(item?.id) } : {}),
        ...(s(item?.name) ? { name: s(item?.name) } : {}),
      }))
      .filter((item) => item.native)
      .slice(0, 6);
    const natives = emojiObjs.map((item) => item.native);

    if (natives.length === 0) {
      return finish(NextResponse.json({ ok: false, error: "Missing emojis" }, { status: 400 }));
    }

    const geo = await resolveIpCity(req);
    if (!geo?.cityId) {
      return finish(
        NextResponse.json({ ok: false, error: "Could not resolve city from IP", skipped: true }, { status: 200 })
      );
    }

    const db = adminFirestore();
    const dateKey = todayKeyUTC();
    const ingestId = `guest_${guestId}_${dateKey}`;
    const ingestRef = db.collection("map_ingested").doc(ingestId);
    const ipRef = db.collection("guestMapIngestIp").doc(`${hashIp(geo.ip || readClientIp(req))}_${dateKey}`);
    const already = await ingestRef.get();
    if (already.exists) {
      return finish(
        NextResponse.json({
          ok: true,
          skipped: true,
          cityId: geo.cityId,
          city: geo.city,
          country: geo.country,
          admin1: geo.admin1,
          dateKey,
        })
      );
    }

    const cityStatsRef = db.collection("city_emoji_stats").doc(geo.cityId);
    const cityDailyRef = db.collection("city_emoji_daily").doc(`${geo.cityId}_${dateKey}`);
    const guestDreamRef = db.collection("guest_dreams").doc(ingestId);
    const nowMs = Date.now();

    await db.runTransaction(async (tx) => {
      const ing = await tx.get(ingestRef);
      if (ing.exists) return;

      const ipSnap = await tx.get(ipRef);
      const ipUsed = Number(ipSnap.data()?.used ?? 0);
      if (Number.isFinite(ipUsed) && ipUsed >= GUEST_MAP_IP_DAILY_LIMIT) {
        throw new Error("IP_LIMIT");
      }

      tx.set(
        cityStatsRef,
        {
          cityId: geo.cityId,
          city: geo.city,
          country: geo.country,
          admin1: geo.admin1,
          totalDreams: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(typeof geo.lat === "number" ? { lat: geo.lat } : {}),
          ...(typeof geo.lng === "number" ? { lng: geo.lng } : {}),
        },
        { merge: true }
      );

      for (const em of natives) {
        tx.set(cityStatsRef, { [`emojis.${em}`]: admin.firestore.FieldValue.increment(1) }, { merge: true });
      }

      tx.set(
        cityDailyRef,
        {
          cityId: geo.cityId,
          dateKey,
          totalDreams: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      for (const em of natives) {
        tx.set(cityDailyRef, { [`emojis.${em}`]: admin.firestore.FieldValue.increment(1) }, { merge: true });
      }

      tx.set(ingestRef, {
        uid: null,
        guestId,
        dreamId: null,
        guestDreamId: ingestId,
        sourceType: "dream",
        cityId: geo.cityId,
        dateKey,
        createdAtMs: nowMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        emojisCount: natives.length,
      });

      // Admin-visible snapshot of the guest dream. Before this existed a guest
      // pin only bumped city counters and could never be traced back.
      tx.set(guestDreamRef, {
        guestId,
        sourceType: "guest",
        text: s(body?.text).slice(0, GUEST_TEXT_MAX),
        analysis: s(body?.analysis).slice(0, GUEST_ANALYSIS_MAX),
        lang: s(body?.lang) || null,
        lens: s(body?.lens) || null,
        emojis: emojiObjs,
        iconsEn: strList(body?.iconsEn),
        rootsEn: strList(body?.rootsEn),
        cityId: geo.cityId,
        city: geo.city ?? null,
        country: geo.country ?? null,
        admin1: geo.admin1 ?? null,
        citySource: "ip",
        dateKey,
        createdAtMs: nowMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        shared: false,
        deleted: false,
        imported: false,
        importedUid: null,
        importedDreamId: null,
        importedAtMs: null,
      });

      tx.set(
        ipRef,
        {
          used: admin.firestore.FieldValue.increment(1),
          dayKey: dateKey,
          lastAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    if (!geo.lat || !geo.lng) {
      const url = new URL("/api/map/resolve-city", req.url);
      fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId: geo.cityId }),
      }).catch(() => {});
    }

    return finish(
      NextResponse.json({
        ok: true,
        cityId: geo.cityId,
        city: geo.city,
        country: geo.country,
        admin1: geo.admin1,
        dateKey,
      })
    );
  } catch (e: any) {
    console.error(e);
    if (e?.message === "IP_LIMIT") {
      return finish(
        NextResponse.json({ ok: false, skipped: true, error: "IP limit reached" }, { status: 200 })
      );
    }
    return finish(NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 }));
  }
}
