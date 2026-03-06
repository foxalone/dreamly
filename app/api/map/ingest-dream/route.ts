import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";

type Body = { uid: string; dreamId: string };
type DreamEmoji = { native: string; id?: string; name?: string };

type ResolvedCity = {
  cityId: string;
  city: string;
  country: string;
  admin1: string;
  source: "dream" | "user";
};

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

async function resolveCityCoordsIfNeeded(req: Request, cityId: string) {
  try {
    const db = adminFirestore();
    const statsSnap = await db.collection("city_emoji_stats").doc(cityId).get();
    const d = statsSnap.exists ? (statsSnap.data() as any) : null;

    if (d && typeof d.lat === "number" && typeof d.lng === "number") return;

    const url = new URL("/api/map/resolve-city", req.url);
    fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

function getDreamCity(dream: any): Omit<ResolvedCity, "source"> {
  const dreamCity = dream?.city && typeof dream.city === "object" ? dream.city : null;

  const cityId = s(dreamCity?.cityId || dream?.cityId);
  const city = s(dreamCity?.city || dream?.cityName || dream?.cityLabel || dream?.city);
  const country = s(dreamCity?.country || dream?.cityCountry || dream?.country);
  const admin1 = s(dreamCity?.admin1 || dream?.cityAdmin1 || dream?.admin1);

  return { cityId, city, country, admin1 };
}

function getUserCity(user: any): Omit<ResolvedCity, "source"> {
  return {
    cityId: s(user?.currentCityId),
    city: s(user?.currentCity),
    country: s(user?.currentCountry),
    admin1: s(user?.currentAdmin1),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const uid = s(body?.uid);
    const dreamId = s(body?.dreamId);

    if (!uid || !dreamId) {
      return NextResponse.json({ error: "Missing uid or dreamId" }, { status: 400 });
    }

    const db = adminFirestore();

    const ingestId = `${uid}_${dreamId}`;
    const ingestRef = db.collection("map_ingested").doc(ingestId);

    const ingestSnap = await ingestRef.get();
    if (ingestSnap.exists) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const userRef = db.collection("users").doc(uid);
    const dreamRef = userRef.collection("dreams").doc(dreamId);
    const dreamSnap = await dreamRef.get();
    if (!dreamSnap.exists) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }

    const dream = dreamSnap.data() || {};
    const isTikTokDream = s(dream?.studio?.kind).toLowerCase() === "tiktok";

    const emojis: DreamEmoji[] = Array.isArray(dream.emojis) ? dream.emojis : [];
    const createdAtMs = Number(dream.createdAtMs ?? Date.now());
    const dateKey = s(dream.dateKey) || todayKeyUTC(createdAtMs);

    const natives = emojis.map((e) => s(e?.native)).filter(Boolean);
    if (natives.length === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no_emojis" });
    }

    const userSnap = await userRef.get();
    const user = userSnap.exists ? (userSnap.data() as any) : {};

    const fromDream = getDreamCity(dream);
    const fromUser = getUserCity(user);

    const useDream = !!fromDream.cityId;
    const resolvedCity: ResolvedCity = {
      ...(useDream ? fromDream : fromUser),
      source: useDream ? "dream" : "user",
    };

    if (isTikTokDream) {
      console.log("[tiktok/ingest] city source:", resolvedCity.source, {
        dream: fromDream,
        user: fromUser,
      });
    }

    const userStatsRef = userRef.collection("stats").doc("emoji");
    const userDailyRef = userRef.collection("emoji_daily").doc(dateKey);

    await db.runTransaction(async (tx) => {
      const ing = await tx.get(ingestRef);
      if (ing.exists) return;

      tx.set(
        userRef,
        {
          uid,
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

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

      if (resolvedCity.cityId) {
        const cityStatsRef = db.collection("city_emoji_stats").doc(resolvedCity.cityId);
        const cityDailyRef = db.collection("city_emoji_daily").doc(`${resolvedCity.cityId}_${dateKey}`);

        tx.set(
          cityStatsRef,
          {
            cityId: resolvedCity.cityId,
            city: resolvedCity.city,
            country: resolvedCity.country,
            admin1: resolvedCity.admin1,
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

        tx.set(
          cityDailyRef,
          {
            cityId: resolvedCity.cityId,
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
      }

      tx.set(ingestRef, {
        uid,
        dreamId,
        cityId: resolvedCity.cityId || null,
        dateKey,
        createdAtMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        emojisCount: natives.length,
      });
    });

    if (isTikTokDream) {
      console.log("[tiktok/ingest] cityId -> city_emoji_stats:", resolvedCity.cityId || null);
    }

    if (resolvedCity.cityId) resolveCityCoordsIfNeeded(req, resolvedCity.cityId);

    return NextResponse.json({ ok: true, cityId: resolvedCity.cityId || null, dateKey });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
