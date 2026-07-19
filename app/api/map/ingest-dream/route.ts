import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";

type SourceType = "dream" | "story";
type Body = { uid: string; dreamId: string; sourceType?: SourceType };
type DreamEmoji = { native: string; id?: string; name?: string };

type ResolvedCity = {
  cityId: string;
  city: string;
  country: string;
  admin1: string;
  source: "item" | "user";
};

function s(v: any) {
  return String(v ?? "").trim();
}

function normalizeSourceType(v: unknown): SourceType {
  return s(v).toLowerCase() === "story" ? "story" : "dream";
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

function getItemCity(item: any): Omit<ResolvedCity, "source"> {
  const itemCity = item?.city && typeof item.city === "object" ? item.city : null;

  const cityId = s(itemCity?.cityId || item?.cityId);
  const city = s(itemCity?.city || item?.cityName || item?.cityLabel || item?.city);
  const country = s(itemCity?.country || item?.cityCountry || item?.country);
  const admin1 = s(itemCity?.admin1 || item?.cityAdmin1 || item?.admin1);

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

function emojiFieldPrefix(sourceType: SourceType) {
  return sourceType === "story" ? "storyEmojis" : "emojis";
}

function totalField(sourceType: SourceType) {
  return sourceType === "story" ? "totalStories" : "totalDreams";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const uid = s(body?.uid);
    const itemId = s(body?.dreamId);
    const sourceType = normalizeSourceType(body?.sourceType);

    if (!uid || !itemId) {
      return NextResponse.json({ error: "Missing uid or dreamId" }, { status: 400 });
    }

    const db = adminFirestore();

    const ingestId =
      sourceType === "story" ? `${uid}_story_${itemId}` : `${uid}_${itemId}`;
    const ingestRef = db.collection("map_ingested").doc(ingestId);

    const ingestSnap = await ingestRef.get();
    if (ingestSnap.exists) {
      return NextResponse.json({ ok: true, skipped: true, sourceType });
    }

    const userRef = db.collection("users").doc(uid);
    const collectionName = sourceType === "story" ? "stories" : "dreams";
    const itemRef = userRef.collection(collectionName).doc(itemId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      return NextResponse.json(
        { error: sourceType === "story" ? "Story not found" : "Dream not found" },
        { status: 404 }
      );
    }

    const item = itemSnap.data() || {};
    const isTikTokDream =
      sourceType === "dream" && s(item?.studio?.kind).toLowerCase() === "tiktok";

    const emojis: DreamEmoji[] = Array.isArray(item.emojis) ? item.emojis : [];
    const createdAtMs = Number(item.createdAtMs ?? Date.now());
    const dateKey = s(item.dateKey) || todayKeyUTC(createdAtMs);

    const natives = emojis.map((e) => s(e?.native)).filter(Boolean);
    if (natives.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "no_emojis",
        sourceType,
      });
    }

    const userSnap = await userRef.get();
    const user = userSnap.exists ? (userSnap.data() as any) : {};

    const fromItem = getItemCity(item);
    const fromUser = getUserCity(user);

    const useItem = !!fromItem.cityId;
    const resolvedCity: ResolvedCity = {
      ...(useItem ? fromItem : fromUser),
      source: useItem ? "item" : "user",
    };

    if (isTikTokDream) {
      console.log("[tiktok/ingest] city source:", resolvedCity.source, {
        item: fromItem,
        user: fromUser,
      });
    }

    const emojiPrefix = emojiFieldPrefix(sourceType);
    const totalKey = totalField(sourceType);

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
          [totalKey]: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      for (const em of natives) {
        tx.set(
          userStatsRef,
          { [`${emojiPrefix}.${em}`]: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      }

      tx.set(
        userDailyRef,
        {
          dateKey,
          [totalKey]: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      for (const em of natives) {
        tx.set(
          userDailyRef,
          { [`${emojiPrefix}.${em}`]: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      }

      if (resolvedCity.cityId) {
        const cityStatsRef = db.collection("city_emoji_stats").doc(resolvedCity.cityId);
        const cityDailyRef = db
          .collection("city_emoji_daily")
          .doc(`${resolvedCity.cityId}_${dateKey}`);

        tx.set(
          cityStatsRef,
          {
            cityId: resolvedCity.cityId,
            city: resolvedCity.city,
            country: resolvedCity.country,
            admin1: resolvedCity.admin1,
            [totalKey]: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        for (const em of natives) {
          tx.set(
            cityStatsRef,
            { [`${emojiPrefix}.${em}`]: admin.firestore.FieldValue.increment(1) },
            { merge: true }
          );
        }

        tx.set(
          cityDailyRef,
          {
            cityId: resolvedCity.cityId,
            dateKey,
            [totalKey]: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        for (const em of natives) {
          tx.set(
            cityDailyRef,
            { [`${emojiPrefix}.${em}`]: admin.firestore.FieldValue.increment(1) },
            { merge: true }
          );
        }
      }

      tx.set(ingestRef, {
        uid,
        dreamId: itemId,
        itemId,
        sourceType,
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

    return NextResponse.json({
      ok: true,
      cityId: resolvedCity.cityId || null,
      dateKey,
      sourceType,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
