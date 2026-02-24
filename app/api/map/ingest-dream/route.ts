import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";

type Body = { uid: string; dreamId: string };
type DreamEmoji = { native: string; id?: string; name?: string };

function s(v: any) {
  return String(v ?? "").trim();
}

function todayKeyUTC(ms: number) {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// TODO: заменить на реальный GeoIP провайдер.
// Сейчас fallback Washington, US.
async function geoFromRequest(req: Request) {
  const country = "US";
  const admin1 = "DC";
  const city = "Washington";
  const cityId = `${country}|${admin1}|${city}`;
  return { country, admin1, city, cityId };
}

// ✅ helper: if no coords yet -> call /api/map/resolve-city
async function resolveCityCoordsIfNeeded(req: Request, cityId: string) {
  try {
    const db = adminFirestore();
    const statsSnap = await db.collection("city_emoji_stats").doc(cityId).get();
    const d = statsSnap.exists ? (statsSnap.data() as any) : null;

    // if already has coords -> skip
    if (d && typeof d.lat === "number" && typeof d.lng === "number") return;

    // call internal API (same origin) - fire & forget
    const url = new URL("/api/map/resolve-city", req.url);
    fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId }),
    }).catch(() => {});
  } catch {
    // ignore: coords resolving is best-effort
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const uid = s(body?.uid);
    const dreamId = s(body?.dreamId);

    if (!uid || !dreamId) {
      return NextResponse.json(
        { error: "Missing uid or dreamId" },
        { status: 400 }
      );
    }

    const db = adminFirestore();

    // idempotency doc (чтобы не считать дважды)
    const ingestId = `${uid}_${dreamId}`;
    const ingestRef = db.collection("map_ingested").doc(ingestId);

    const ingestSnap = await ingestRef.get();
    if (ingestSnap.exists) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const dreamRef = db.collection("users").doc(uid).collection("dreams").doc(dreamId);
    const dreamSnap = await dreamRef.get();
    if (!dreamSnap.exists) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }

    const dream = dreamSnap.data() || {};
    const emojis: DreamEmoji[] = Array.isArray(dream.emojis) ? dream.emojis : [];
    const createdAtMs = Number(dream.createdAtMs ?? Date.now());
    const dateKey = s(dream.dateKey) || todayKeyUTC(createdAtMs);

    const natives = emojis.map((e) => s(e?.native)).filter(Boolean);
    if (natives.length === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no_emojis" });
    }

    const geo = await geoFromRequest(req);
    const { country, admin1, city, cityId } = geo;

    const userRef = db.collection("users").doc(uid);
    const userStatsRef = userRef.collection("stats").doc("emoji");
    const userDailyRef = userRef.collection("emoji_daily").doc(dateKey);

    const cityStatsRef = db.collection("city_emoji_stats").doc(cityId);
    const cityDailyRef = db.collection("city_emoji_daily").doc(`${cityId}_${dateKey}`);

    await db.runTransaction(async (tx) => {
      const ing = await tx.get(ingestRef);
      if (ing.exists) return;

      // user minimal profile (обновляем city и lastLogin)
      tx.set(
        userRef,
        {
          uid,
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          currentCityId: cityId,
          currentCity: city,
          currentCountry: country,
          currentAdmin1: admin1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // user stats all time
      tx.set(
        userStatsRef,
        {
          totalDreams: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      for (const em of natives) {
        tx.set(
          userStatsRef,
          { [`emojis.${em}`]: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      }

      // user daily
      tx.set(
        userDailyRef,
        {
          dateKey,
          totalDreams: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      for (const em of natives) {
        tx.set(
          userDailyRef,
          { [`emojis.${em}`]: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      }

      // city stats all time
      tx.set(
        cityStatsRef,
        {
          cityId,
          city,
          country,
          admin1,
          totalDreams: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      for (const em of natives) {
        tx.set(
          cityStatsRef,
          { [`emojis.${em}`]: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      }

      // city daily
      tx.set(
        cityDailyRef,
        {
          cityId,
          dateKey,
          totalDreams: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      for (const em of natives) {
        tx.set(
          cityDailyRef,
          { [`emojis.${em}`]: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      }

      // mark ingested
      tx.set(ingestRef, {
        uid,
        dreamId,
        cityId,
        dateKey,
        createdAtMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        emojisCount: natives.length,
      });
    });

    // ✅ HERE: after transaction, resolve coords (best-effort)
    // (не ждём, чтобы не тормозить ответ)
    resolveCityCoordsIfNeeded(req, cityId);

    return NextResponse.json({ ok: true, cityId, dateKey });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}