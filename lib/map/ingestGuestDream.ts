import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { guestAskDedupRef } from "@/app/api/dreams/_lib/guestDedup";
import { guestDreamSnapshotId } from "@/app/api/dreams/_lib/guestDreamSnapshot";
import { hashIp, readClientIp } from "@/app/api/dreams/_lib/guestQuota";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { mapCoordinates } from "@/lib/geo/mapCoordinates";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { resolveMapCity } from "./resolveMapCity";

const GUEST_MAP_IP_DAILY_LIMIT = 8;

export type GuestMapDream = {
  emojis?: { native?: string; id?: string; name?: string }[];
  text?: string;
  analysis?: string;
  lang?: string;
  lens?: string;
  iconsEn?: string[];
  rootsEn?: string[];
};

type GuestMapResult = {
  ok: boolean;
  skipped?: boolean;
  deduped?: boolean;
  error?: string;
  cityId?: string;
  city?: string;
  country?: string;
  admin1?: string;
  dateKey?: string;
};

const trimmed = (value: unknown) => String(value ?? "").trim();

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(trimmed).filter(Boolean).slice(0, 12) : [];
}

export async function ingestGuestDream(
  req: Request, guestId: string, dream: GuestMapDream, perDream: boolean,
  getDb: () => Firestore = adminFirestore,
): Promise<GuestMapResult> {
  const emojis = (Array.isArray(dream?.emojis) ? dream.emojis : []).map((emoji) => ({
    native: trimmed(emoji?.native),
    ...(trimmed(emoji?.id) ? { id: trimmed(emoji?.id) } : {}),
    ...(trimmed(emoji?.name) ? { name: trimmed(emoji?.name) } : {}),
  })).filter((emoji) => emoji.native).slice(0, 6);
  if (!emojis.length) return { ok: false, error: "Missing emojis" };

  const geo = await resolveIpCity(req, 4000);
  if (!geo) return { ok: false, skipped: true, error: "Could not resolve city from IP" };
  const { cityId, city, country, admin1 } = geo;
  const cityFields = { cityId, city, country, admin1 };
  const coordinates = mapCoordinates(geo.lat, geo.lng);
  const text = trimmed(dream.text);
  const clientIp = readClientIp(req);
  const now = Date.now();
  const dateKey = new Date(now).toISOString().slice(0, 10);
  const dailyId = `guest_${guestId}_${dateKey}`;
  const guestDreamId = text ? guestDreamSnapshotId(guestId, text) : dailyId;
  const ingestId = perDream ? guestDreamId : dailyId;
  const db = getDb();
  const ingestRef = db.collection("map_ingested").doc(ingestId);
  const ipRef = db.collection("guestMapIngestIp").doc(`${hashIp(geo.ip || clientIp)}_${dateKey}`);
  const cityStatsRef = db.collection("city_emoji_stats").doc(cityId);
  const cityDailyRef = db.collection("city_emoji_daily").doc(`${cityId}_${dateKey}`);
  const guestDreamRef = db.collection("guest_dreams").doc(guestDreamId);
  const dedupRef = text ? guestAskDedupRef(db, clientIp, text, dateKey) : null;

  const result = await db.runTransaction<GuestMapResult>(async (tx) => {
    const [ingested, snapshot, ipUsage] = await tx.getAll(ingestRef, guestDreamRef, ipRef);
    const saved = snapshot.data();
    if (saved?.deleted === true) return { ok: true, skipped: true };
    if (saved?.mapIngestId && (perDream || saved.mapIngestId === guestDreamId || saved.dateKey === dateKey)) {
      // A web import needs to know that this exact dream was already counted.
      return {
        ok: true, cityId: trimmed(saved.cityId), city: trimmed(saved.city), country: trimmed(saved.country),
        admin1: trimmed(saved.admin1), dateKey: trimmed(saved.dateKey),
      };
    }
    if (dedupRef && (await tx.get(dedupRef)).data()?.guestDreamId) {
      return { ok: true, skipped: true, deduped: true };
    }
    if (ingested.exists) return { ok: true, skipped: true, ...cityFields, dateKey };
    if (Number(ipUsage.data()?.used ?? 0) >= GUEST_MAP_IP_DAILY_LIMIT) {
      return { ok: false, skipped: true, error: "IP limit reached" };
    }

    const increments: Record<string, ReturnType<typeof FieldValue.increment>> = {};
    const counts = new Map<string, number>();
    for (const { native } of emojis) counts.set(native, (counts.get(native) ?? 0) + 1);
    for (const [native, count] of counts) increments[`emojis.${native}`] = FieldValue.increment(count);
    const stats = { totalDreams: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(), ...increments };
    tx.set(cityStatsRef, { ...cityFields, ...coordinates, ...stats }, { merge: true });
    tx.set(cityDailyRef, { cityId, dateKey, ...stats }, { merge: true });
    tx.set(ingestRef, {
      uid: null, guestId, dreamId: null, guestDreamId, sourceType: "dream", cityId, dateKey,
      createdAtMs: now, createdAt: FieldValue.serverTimestamp(), emojisCount: emojis.length,
    });
    tx.set(guestDreamRef, {
      ...(!snapshot.exists ? {
        guestId, sourceType: "guest", text: text.slice(0, 4000), analysis: trimmed(dream.analysis).slice(0, 12000),
        lang: trimmed(dream.lang) || null, lens: trimmed(dream.lens) || null, emojis,
        createdAtMs: now, createdAt: FieldValue.serverTimestamp(), shared: false, deleted: false, imported: false,
      } : {}),
      ...(dream.iconsEn !== undefined ? { iconsEn: strings(dream.iconsEn) } : {}),
      ...(dream.rootsEn !== undefined ? { rootsEn: strings(dream.rootsEn) } : {}),
      ...cityFields, admin1: admin1 || null, citySource: "ip", dateKey, mapIngestId: ingestId,
    }, { merge: true });
    tx.set(ipRef, { used: FieldValue.increment(1), dayKey: dateKey, lastAt: FieldValue.serverTimestamp() }, { merge: true });
    if (dedupRef) {
      tx.set(dedupRef, { guestDreamId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return { ok: true, ...cityFields, dateKey };
  });

  if (result.ok && !result.skipped && result.cityId && (!coordinates || result.cityId !== cityId)) {
    const stats = (await db.collection("city_emoji_stats").doc(result.cityId).get()).data();
    if (!mapCoordinates(stats?.lat, stats?.lng)) {
      await resolveMapCity(result.cityId, db).catch((error) => console.warn("Guest map city lookup failed", error));
    }
  }
  return result;
}
