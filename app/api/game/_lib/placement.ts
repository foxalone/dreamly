import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { KINGDOM_COLLECTION, jitterLatLng } from "@/lib/game/kingdomPlacement";
import { PLAYER_COLLECTION, readPlayer, type PlayerDoc } from "./player";
import type { Owner } from "./owner";

export type BuildingCity = { cityId: string; city: string; country: string; admin1: string; lat: number; lng: number };

/** Prefer the signed-in account's known city; geolocation is always optional. */
export async function resolveBuildingCity(req: Request, owner: Owner): Promise<BuildingCity | null> {
  const db = adminFirestore();
  if (owner.uid) {
    const user = (await db.collection("users").doc(owner.uid).get()).data();
    if (user?.currentCityId) {
      const city = (await db.collection("city_emoji_stats").doc(String(user.currentCityId)).get()).data();
      if (Number.isFinite(city?.lat) && Number.isFinite(city?.lng)) return {
        cityId: String(user.currentCityId), city: String(user.currentCity ?? city?.city ?? ""),
        country: String(user.currentCountry ?? ""), admin1: String(user.currentAdmin1 ?? ""),
        lat: Number(city!.lat), lng: Number(city!.lng),
      };
    }
  }
  const geo = await resolveIpCity(req, 1500).catch(() => null);
  if (!geo?.cityId) return null;
  let { lat, lng } = geo;
  if (lat == null || lng == null) {
    const city = (await db.collection("city_emoji_stats").doc(geo.cityId).get()).data();
    lat = Number.isFinite(city?.lat) ? Number(city!.lat) : null;
    lng = Number.isFinite(city?.lng) ? Number(city!.lng) : null;
  }
  return lat != null && lng != null ? { ...geo, lat, lng } : null;
}

export function buildingMapData(owner: Owner, buildingId: string, count: number, city: BuildingCity) {
  const spot = jitterLatLng(city.lat, city.lng, `${owner.ownerKey}|${buildingId}`);
  return {
    ownerKey: owner.ownerKey, ownerType: owner.uid ? "user" : "guest", uid: owner.uid,
    guestId: owner.uid ? null : owner.guestId, buildingId, count,
    cityId: city.cityId, city: city.city, country: city.country, admin1: city.admin1,
    lat: spot.lat, lng: spot.lng, placedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/** Empty city names in placed are purchased, producing buildings awaiting a map location. */
export async function settlePendingBuildings(owner: Owner, city: BuildingCity, db = adminFirestore()): Promise<PlayerDoc | null> {
  if (!owner.uid) return null;
  return db.runTransaction(async tx => {
    const ref = db.collection(PLAYER_COLLECTION).doc(owner.ownerKey);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const player = readPlayer(snapshot.data(), owner, Date.now());
    const ids = Object.keys(player.placed).filter(id => !player.placed[id]);
    const refs = ids.map(id => db.collection(KINGDOM_COLLECTION).doc(`${owner.ownerKey}_${id}`));
    const buildings = await Promise.all(refs.map(ref => tx.get(ref)));
    ids.forEach((id, i) => {
      // Idempotent: a retry never charges again, changes production clocks, or adds copies.
      if (!buildings[i].exists) tx.set(refs[i], buildingMapData(owner, id, Math.max(1, player.owned[id] ?? 1), city));
      player.placed[id] = String(buildings[i].data()?.city || city.city);
    });
    if (ids.length) {
      player.cityId ??= city.cityId;
      player.city ??= city.city;
      player.updatedAt = Date.now();
      tx.set(ref, player);
    }
    return player;
  });
}
