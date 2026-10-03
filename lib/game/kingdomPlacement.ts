import { createHash } from "node:crypto";

/** Firestore collection with one doc per placed building: `${ownerKey}_${buildingId}`. */
export const KINGDOM_COLLECTION = "kingdom_buildings";

/** Guests may place only the first building; the rest need an account. */
export const GUEST_BUILDING_IDS = new Set(["hut"]);

/**
 * City-level placement with a stable offset (0.8–4 km) per owner, so buildings of one
 * city do not stack and nobody's exact location is ever stored.
 */
export function jitterLatLng(lat: number, lng: number, ownerKey: string): { lat: number; lng: number } {
  const h = createHash("sha256").update(ownerKey).digest();
  const angle = (h.readUInt16BE(0) / 65535) * Math.PI * 2;
  const meters = 800 + (h.readUInt16BE(2) / 65535) * 3200;
  const dLat = (meters * Math.sin(angle)) / 111_320;
  const dLng = (meters * Math.cos(angle)) / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { lat: lat + dLat, lng: lng + dLng };
}
