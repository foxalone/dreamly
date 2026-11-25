import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { mapCoordinates } from "@/lib/geo/mapCoordinates";

export function parseMapCityId(cityId: string) {
  const [country = "", ...parts] = cityId.split("|").map((part) => part.trim()).filter(Boolean);
  const [first = "", ...rest] = parts;
  return rest.length ? { country, admin1: first, city: rest.join("|") } : { country, admin1: "", city: first };
}

async function geocodeCity(city: ReturnType<typeof parseMapCityId>) {
  const token = (process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();
  if (!token) throw new Error("Missing MAPBOX_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN");

  const query = [city.city, city.admin1, city.country].filter(Boolean).join(", ");
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.search = new URLSearchParams({ access_token: token, limit: "1", types: "place", language: "en" }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? "Mapbox geocoding failed");

  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  const center = feature?.center;
  const coordinates = Array.isArray(center) ? mapCoordinates(center[1], center[0]) : null;
  if (!coordinates) throw new Error("No valid geocoding coordinates");
  return { ...coordinates, placeName: String(feature?.place_name ?? "") || null };
}

export async function resolveMapCity(cityId: string, db: Firestore = adminFirestore()) {
  const city = parseMapCityId(cityId);
  const cityRef = db.collection("cities").doc(cityId);
  const statsRef = db.collection("city_emoji_stats").doc(cityId);
  const cached = (await cityRef.get()).data();
  const cachedCoordinates = mapCoordinates(cached?.lat, cached?.lng);
  const lookup = cachedCoordinates ? { ...cachedCoordinates, placeName: undefined } : await geocodeCity(city);

  return db.runTransaction(async (tx) => {
    const [citySnapshot, statsSnapshot] = await tx.getAll(cityRef, statsRef);
    const current = citySnapshot.data();
    const currentCoordinates = mapCoordinates(current?.lat, current?.lng);
    const coordinates = currentCoordinates ?? lookup;
    const { lat, lng } = coordinates;

    if (!currentCoordinates) {
      tx.set(cityRef, {
        ...city, cityId, admin1: city.admin1 || null, lat, lng,
        ...(lookup.placeName !== undefined ? { placeName: lookup.placeName } : {}),
        updatedAt: FieldValue.serverTimestamp(),
        ...(!citySnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
      }, { merge: true });
    }

    const stats = statsSnapshot.data();
    if (!mapCoordinates(stats?.lat, stats?.lng) && (statsSnapshot.exists || !currentCoordinates)) {
      tx.set(statsRef, { lat, lng, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    return { lat, lng, ...(currentCoordinates ? { skipped: true } : {}) };
  });
}
