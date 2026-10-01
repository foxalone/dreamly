// lib/map/ingestDreamServer.ts
// Map ingest for one journal item: pins the dream's city on the item and bumps
// the user / city emoji counters once (map_ingested marker). Used by
// /api/map/ingest-dream, by the server-side enrichment after a diary save, and
// by the admin emoji regenerate for items that were never ingested.
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import type { IpCity } from "@/lib/geo/resolveIpCity";

export type SourceType = "dream" | "story";
type DreamEmoji = { native: string; id?: string; name?: string };
type CitySource = "ip" | "item" | "user" | "history";

export type ResolvedCity = {
  cityId: string;
  city: string;
  country: string;
  admin1: string;
  source: CitySource;
  lat: number | null;
  lng: number | null;
};

function emptyCity(source: CitySource): ResolvedCity {
  return { cityId: "", city: "", country: "", admin1: "", source, lat: null, lng: null };
}

function s(v: any) {
  return String(v ?? "").trim();
}

export function normalizeSourceType(v: unknown): SourceType {
  return s(v).toLowerCase() === "story" ? "story" : "dream";
}

function todayKeyUTC(ms: number) {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function resolveCityCoordsIfNeeded(baseUrl: string | null, cityId: string) {
  if (!baseUrl) return;
  try {
    const db = adminFirestore();
    const statsSnap = await db.collection("city_emoji_stats").doc(cityId).get();
    const d = statsSnap.exists ? (statsSnap.data() as any) : null;

    if (d && typeof d.lat === "number" && typeof d.lng === "number") return;

    const url = new URL("/api/map/resolve-city", baseUrl);
    fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

function getItemCity(item: any): ResolvedCity {
  const itemCity = item?.city && typeof item.city === "object" ? item.city : null;

  const cityId = s(itemCity?.cityId || item?.cityId);
  const city = s(itemCity?.city || item?.cityName || item?.cityLabel || item?.city);
  const country = s(itemCity?.country || item?.cityCountry || item?.country);
  const admin1 = s(itemCity?.admin1 || item?.cityAdmin1 || item?.admin1);
  const lat = Number(itemCity?.lat ?? item?.lat);
  const lng = Number(itemCity?.lng ?? item?.lng);

  return {
    cityId,
    city,
    country,
    admin1,
    source: "item",
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function getUserCity(user: any): ResolvedCity {
  return {
    cityId: s(user?.currentCityId),
    city: s(user?.currentCity),
    country: s(user?.currentCountry),
    admin1: s(user?.currentAdmin1),
    source: "user",
    lat: null,
    lng: null,
  };
}

export function cityWriteFields(city: ResolvedCity) {
  return {
    cityId: city.cityId,
    city: city.city,
    country: city.country,
    admin1: city.admin1 || null,
    citySource: city.source,
    ...(typeof city.lat === "number" ? { lat: city.lat } : {}),
    ...(typeof city.lng === "number" ? { lng: city.lng } : {}),
  };
}

function emojiFieldPrefix(sourceType: SourceType) {
  return sourceType === "story" ? "storyEmojis" : "emojis";
}

function totalField(sourceType: SourceType) {
  return sourceType === "story" ? "totalStories" : "totalDreams";
}

async function cityFromHistory(
  userRef: admin.firestore.DocumentReference,
  exceptItemId: string
): Promise<ResolvedCity> {
  try {
    const snap = await userRef.collection("dreams").orderBy("createdAtMs", "desc").limit(25).get();
    for (const d of snap.docs) {
      if (d.id === exceptItemId) continue;
      const c = getItemCity(d.data());
      if (c.cityId && c.city) return { ...c, source: "history" };
    }
  } catch (e) {
    console.warn("cityFromHistory failed", e);
  }
  return emptyCity("history");
}

export class IngestNotFoundError extends Error {}

export type IngestResult = {
  ok: true;
  skipped?: boolean;
  reason?: string;
  cityId?: string | null;
  dateKey?: string;
  sourceType: SourceType;
  citySource?: CitySource;
};

export async function ingestDreamServer(params: {
  uid: string;
  itemId: string;
  sourceType: SourceType;
  skipCity?: boolean;
  /** City of the request that saved the dream; null → fall back to item / user city. */
  ipCity: (IpCity & { ip?: string }) | null;
  /** Origin used to kick /api/map/resolve-city for missing coords. */
  baseUrl: string | null;
  guestId?: string | null;
  /** Skip (no marker, no counters) when no city can be found anywhere. */
  requireCity?: boolean;
}): Promise<IngestResult> {
    const { uid, itemId, sourceType } = params;
    const skipCity = params.skipCity === true;
    const db = adminFirestore();

    const ingestId =
      sourceType === "story" ? `${uid}_story_${itemId}` : `${uid}_${itemId}`;
    const ingestRef = db.collection("map_ingested").doc(ingestId);

    const ingestSnap = await ingestRef.get();
    if (ingestSnap.exists) {
      return { ok: true, skipped: true, sourceType };
    }

    const userRef = db.collection("users").doc(uid);
    const collectionName = sourceType === "story" ? "stories" : "dreams";
    const itemRef = userRef.collection(collectionName).doc(itemId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      throw new IngestNotFoundError(sourceType === "story" ? "Story not found" : "Dream not found");
    }

    const item = itemSnap.data() || {};

    const emojis: DreamEmoji[] = Array.isArray(item.emojis) ? item.emojis : [];
    const createdAtMs = Number(item.createdAtMs ?? Date.now());
    const dateKey = s(item.dateKey) || todayKeyUTC(createdAtMs);

    const natives = emojis.map((e) => s(e?.native)).filter(Boolean);
    if (natives.length === 0) {
      return { ok: true, skipped: true, reason: "no_emojis", sourceType };
    }

    const userSnap = await userRef.get();
    const user = userSnap.exists ? (userSnap.data() as any) : {};

    const fromItem = getItemCity(item);
    const fromUser = getUserCity(user);
    const fromIp = params.ipCity;
    const ipCity: ResolvedCity = fromIp?.cityId
      ? {
          cityId: fromIp.cityId,
          city: fromIp.city,
          country: fromIp.country,
          admin1: fromIp.admin1,
          source: "ip",
          lat: fromIp.lat,
          lng: fromIp.lng,
        }
      : emptyCity("ip");

    // Always pin by current IP. If this dream was already counted as a guest
    // pin, keep that snapshot so the journal row matches the map.
    let resolvedCity: ResolvedCity =
      skipCity && fromItem.cityId
        ? fromItem
        : ipCity.cityId
          ? ipCity
          : fromItem.cityId
            ? fromItem
            : fromUser.cityId
              ? fromUser
              : emptyCity("ip");

    // Last resort (no request IP, e.g. an admin fix): the city of the user's
    // most recent other dream that has one.
    if (!resolvedCity.cityId) {
      resolvedCity = await cityFromHistory(userRef, itemId);
    }

    // Callers without a request IP ask not to ingest a dream with no city at
    // all: the map_ingested marker would lock it out of a later, better ingest.
    if (!resolvedCity.cityId && params.requireCity) {
      return { ok: true, skipped: true, reason: "no_city", sourceType };
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
          ...(resolvedCity.source === "ip" && resolvedCity.cityId
            ? {
                currentCityId: resolvedCity.cityId,
                currentCity: resolvedCity.city,
                currentCountry: resolvedCity.country,
                currentAdmin1: resolvedCity.admin1 || null,
                citySource: "ip",
                cityUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }
            : {}),
        },
        { merge: true }
      );

      if (resolvedCity.cityId) {
        tx.set(itemRef, cityWriteFields(resolvedCity), { merge: true });
      }

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

      if (resolvedCity.cityId && !skipCity) {
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
            ...(typeof resolvedCity.lat === "number" ? { lat: resolvedCity.lat } : {}),
            ...(typeof resolvedCity.lng === "number" ? { lng: resolvedCity.lng } : {}),
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
        // false when the city was already counted by the guest pin (skipCity);
        // the admin emoji re-pick uses this to know which counters to move.
        cityCounted: !!resolvedCity.cityId && !skipCity,
        dateKey,
        createdAtMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        emojisCount: natives.length,
      });
    });

    if (resolvedCity.cityId) resolveCityCoordsIfNeeded(params.baseUrl, resolvedCity.cityId);

    // skipCity === true means this dream was first pinned as a guest (homepage
    // Ask before sign-in) and is now being imported into users/{uid}/dreams.
    // Link the guest_dreams snapshot to the real document so the admin list
    // does not show the same dream twice.
    if (skipCity && sourceType === "dream") {
      const guestId = params.guestId;
      if (guestId) {
        try {
          const snap = await db
            .collection("guest_dreams")
            .where("guestId", "==", guestId)
            .where("imported", "==", false)
            .get();
          const newest = snap.docs
            .map((d) => ({ ref: d.ref, createdAtMs: Number(d.data()?.createdAtMs ?? 0) }))
            .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
          if (newest) {
            await newest.ref.set(
              {
                imported: true,
                importedUid: uid,
                importedDreamId: itemId,
                importedAtMs: Date.now(),
              },
              { merge: true }
            );
          }
        } catch (e) {
          console.warn("guest_dreams link failed", e);
        }
      }
    }

    return {
      ok: true,
      cityId: resolvedCity.cityId || null,
      dateKey,
      sourceType,
      citySource: resolvedCity.source,
    };
}

/**
 * Repair for an item that was ingested without any city (map_ingested.cityId
 * empty): find a city (item → user's current city → user's other dreams), pin
 * it on the item and count the item's emojis for that city, once.
 */
export async function pinMissingCity(params: {
  uid: string;
  itemId: string;
  sourceType: SourceType;
  baseUrl: string | null;
}): Promise<{ ok: true; cityId: string | null; reason?: string }> {
  const { uid, itemId, sourceType } = params;
  const db = adminFirestore();
  const ingestId = sourceType === "story" ? `${uid}_story_${itemId}` : `${uid}_${itemId}`;
  const ingestRef = db.collection("map_ingested").doc(ingestId);
  const userRef = db.collection("users").doc(uid);
  const itemRef = userRef.collection(sourceType === "story" ? "stories" : "dreams").doc(itemId);

  const [ingSnap, itemSnap, userSnap] = await Promise.all([ingestRef.get(), itemRef.get(), userRef.get()]);
  if (!ingSnap.exists || !itemSnap.exists) return { ok: true, cityId: null, reason: "not_ingested" };
  if (s(ingSnap.data()?.cityId)) return { ok: true, cityId: s(ingSnap.data()?.cityId), reason: "already" };

  const item = itemSnap.data() ?? {};
  let city = getItemCity(item);
  if (!city.cityId) city = getUserCity(userSnap.exists ? userSnap.data() : {});
  if (!city.cityId) city = await cityFromHistory(userRef, itemId);
  if (!city.cityId) return { ok: true, cityId: null, reason: "no_city" };

  const natives = (Array.isArray(item.emojis) ? item.emojis : [])
    .map((e: any) => s(e?.native))
    .filter(Boolean);
  const dateKey = s(ingSnap.data()?.dateKey) || s(item.dateKey) || todayKeyUTC(Number(item.createdAtMs ?? Date.now()));
  const emojiPrefix = emojiFieldPrefix(sourceType);
  const totalKey = totalField(sourceType);
  const inc = admin.firestore.FieldValue.increment;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const ing = await tx.get(ingestRef);
    if (!ing.exists || s(ing.data()?.cityId)) return;

    tx.set(itemRef, cityWriteFields(city), { merge: true });

    const cityStatsRef = db.collection("city_emoji_stats").doc(city.cityId);
    const cityDailyRef = db.collection("city_emoji_daily").doc(`${city.cityId}_${dateKey}`);
    tx.set(
      cityStatsRef,
      {
        cityId: city.cityId,
        city: city.city,
        country: city.country,
        admin1: city.admin1,
        [totalKey]: inc(1),
        updatedAt: now,
        ...(typeof city.lat === "number" ? { lat: city.lat } : {}),
        ...(typeof city.lng === "number" ? { lng: city.lng } : {}),
      },
      { merge: true }
    );
    tx.set(cityDailyRef, { cityId: city.cityId, dateKey, [totalKey]: inc(1), updatedAt: now }, { merge: true });
    for (const em of natives) {
      tx.set(cityStatsRef, { [`${emojiPrefix}.${em}`]: inc(1) }, { merge: true });
      tx.set(cityDailyRef, { [`${emojiPrefix}.${em}`]: inc(1) }, { merge: true });
    }
    tx.update(ingestRef, { cityId: city.cityId, cityCounted: true, cityPinnedLaterAtMs: Date.now() });
  });

  resolveCityCoordsIfNeeded(params.baseUrl, city.cityId);
  return { ok: true, cityId: city.cityId };
}
