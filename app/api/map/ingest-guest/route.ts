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
  emojis?: { native?: string }[];
};

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
    const natives = (Array.isArray(body?.emojis) ? body.emojis : [])
      .map((item) => s(item?.native))
      .filter(Boolean)
      .slice(0, 6);

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
        sourceType: "dream",
        cityId: geo.cityId,
        dateKey,
        createdAtMs: Date.now(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        emojisCount: natives.length,
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
