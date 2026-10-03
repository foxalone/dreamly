// Dream Kingdoms — server-side player state (Firestore: kingdom_players/{ownerKey}).
// The server owns the balance: taps arrive in validated batches, buildings are bought and
// collected here. Rules doc: Admin → Game.

import { adminFirestore } from "@/lib/firebaseAdmin";
import { BUILDINGS } from "@/lib/game/buildings";
import { CREATURE_TIERS, openTier } from "@/lib/game/creatureTiers";
import { KINGDOM_COLLECTION } from "@/lib/game/kingdomPlacement";
import { allowedTaps, buildingStorage, distribute, perTapFor, ratePerMin } from "@/lib/game/economy";
import type { Owner } from "./owner";

export const PLAYER_COLLECTION = "kingdom_players";

/** One-time import from the old browser-only save is capped, so it cannot be used to mint creatures. */
const IMPORT_CAP = 3_000;

export type PlayerDoc = {
  ownerKey: string;
  uid: string | null;
  guestId: string | null;
  creatures: number;
  lifetime: number;
  caught: Record<string, number>;
  recent: string[];
  taps: number;
  lastSyncAt: number;
  /** null until the first building stands. Fallback for buildings without their own collectedAt. */
  lastCollectAt: number | null;
  /** When each building's storage ("cube") was last emptied. */
  collectedAt: Record<string, number>;
  /** Copies of each building (missing = 1 for a placed building). */
  owned: Record<string, number>;
  /** buildingId → city name */
  placed: Record<string, string>;
  cityId: string | null;
  city: string | null;
  lastRank: number | null;
  importedLocal: boolean;
  mergedInto: string | null;
  createdAt: number;
  updatedAt: number;
};

export type PlayerState = {
  creatures: number;
  lifetime: number;
  caught: Record<string, number>;
  recent: string[];
  placed: Record<string, string>;
  rate: number;
  lastCollectAt: number | null;
  collectedAt: Record<string, number>;
  owned: Record<string, number>;
  /** Per building and in total; the client keeps counting from serverNow. */
  storage: { amount: number; full: boolean; by: Record<string, { amount: number; full: boolean }> };
  serverNow: number;
  signedIn: boolean;
  importedLocal: boolean;
};

export function playerRef(ownerKey: string) {
  return adminFirestore().collection(PLAYER_COLLECTION).doc(ownerKey);
}

function emptyPlayer(owner: Owner, now: number): PlayerDoc {
  return {
    ownerKey: owner.ownerKey,
    uid: owner.uid,
    guestId: owner.uid ? null : owner.guestId,
    creatures: 0,
    lifetime: 0,
    caught: {},
    recent: [],
    taps: 0,
    // A new player may already have tapped for a while before the first batch arrives.
    lastSyncAt: now - 120_000,
    lastCollectAt: null,
    collectedAt: {},
    owned: {},
    placed: {},
    cityId: null,
    city: null,
    lastRank: null,
    importedLocal: false,
    mergedInto: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function readPlayer(data: FirebaseFirestore.DocumentData | undefined, owner: Owner, now: number): PlayerDoc {
  if (!data) return emptyPlayer(owner, now);
  return { ...emptyPlayer(owner, now), ...(data as Partial<PlayerDoc>) } as PlayerDoc;
}

export function toState(p: PlayerDoc, now: number): PlayerState {
  const rate = ratePerMin(Object.keys(p.placed), p.owned);
  return {
    creatures: p.creatures,
    lifetime: p.lifetime,
    caught: p.caught,
    recent: p.recent,
    placed: p.placed,
    rate,
    lastCollectAt: p.lastCollectAt,
    collectedAt: p.collectedAt ?? {},
    owned: p.owned ?? {},
    storage: (() => {
      const st = buildingStorage(Object.keys(p.placed), p.collectedAt, p.lastCollectAt, now, p.owned);
      return { amount: st.total, full: st.anyFull, by: st.by };
    })(),
    serverNow: now,
    signedIn: Boolean(p.uid),
    importedLocal: p.importedLocal,
  };
}

/** Creature kinds that can currently come out for a player with `lifetime` catches. */
export function openSlugs(lifetime: number): string[] {
  const t = openTier(lifetime);
  return CREATURE_TIERS.filter((x) => x.tier <= t).flatMap((x) => x.slugs);
}

function addCatches(p: PlayerDoc, add: Record<string, number>) {
  for (const [slug, n] of Object.entries(add)) {
    if (n <= 0) continue;
    p.caught[slug] = (p.caught[slug] ?? 0) + n;
    if (!p.recent.includes(slug)) p.recent.push(slug);
  }
}

/**
 * Empty the storage of one building (`onlyId`) or of all of them into the balance
 * (and the collection counters). Each building keeps its own clock.
 */
export function collectInto(p: PlayerDoc, now: number, onlyId?: string): number {
  const ids = Object.keys(p.placed).filter((id) => !onlyId || id === onlyId);
  if (!ids.length) return 0;
  const st = buildingStorage(ids, p.collectedAt, p.lastCollectAt, now, p.owned);
  p.collectedAt = { ...(p.collectedAt ?? {}) };
  for (const id of ids) p.collectedAt[id] = now;
  if (!onlyId) p.lastCollectAt = now;
  const amount = st.total;
  if (amount <= 0) return 0;
  p.creatures += amount;
  addCatches(p, distribute(amount, openSlugs(p.lifetime)));
  p.lifetime += amount;
  return amount;
}

/**
 * Apply a batch of taps. Taps beyond the time-based cap are dropped; the creature kinds the
 * client reports are kept only if they are open for this player, the total always equals
 * accepted taps × per-tap.
 */
export function applyTaps(p: PlayerDoc, taps: number, catches: Record<string, number>, now: number): number {
  const accepted = Math.max(0, Math.min(Math.floor(taps), allowedTaps(now - p.lastSyncAt)));
  p.lastSyncAt = now;
  if (!accepted) return 0;
  const n = accepted * perTapFor(Boolean(p.uid));
  const open = new Set(openSlugs(p.lifetime + n));
  const clean: Record<string, number> = {};
  let sum = 0;
  for (const [slug, c] of Object.entries(catches ?? {})) {
    const k = Math.floor(Number(c));
    if (!open.has(slug) || !(k > 0) || sum >= n) continue;
    const take = Math.min(k, n - sum);
    clean[slug] = take;
    sum += take;
  }
  if (sum < n) {
    for (const [slug, c] of Object.entries(distribute(n - sum, [...open]))) clean[slug] = (clean[slug] ?? 0) + c;
  }
  addCatches(p, clean);
  p.creatures += n;
  p.lifetime += n;
  p.taps += accepted;
  return n;
}

/** One-time import of the old localStorage save (capped). */
export function importLocal(p: PlayerDoc, local: { creatures?: unknown; caught?: unknown; recent?: unknown }): number {
  if (p.importedLocal) return 0;
  p.importedLocal = true;
  const creatures = Math.max(0, Math.min(IMPORT_CAP, Math.floor(Number(local.creatures) || 0)));
  if (!creatures) return 0;
  const known = new Set(CREATURE_TIERS.flatMap((t) => t.slugs));
  const caught: Record<string, number> = {};
  let sum = 0;
  if (local.caught && typeof local.caught === "object") {
    for (const [slug, c] of Object.entries(local.caught as Record<string, unknown>)) {
      const k = Math.floor(Number(c));
      if (!known.has(slug) || !(k > 0) || sum >= IMPORT_CAP) continue;
      const take = Math.min(k, IMPORT_CAP - sum);
      caught[slug] = take;
      sum += take;
    }
  }
  const order = Array.isArray(local.recent) ? (local.recent as unknown[]).filter((s): s is string => typeof s === "string" && !!caught[s]) : [];
  for (const slug of order) if (!p.recent.includes(slug)) p.recent.push(slug);
  addCatches(p, caught);
  p.creatures += creatures;
  p.lifetime += Math.max(sum, creatures);
  return creatures;
}

/**
 * A guest signs in: their guest save is added to the account, guest buildings move over
 * (unless the account already has that building). Returns how many creatures were moved.
 */
export async function mergeGuestIntoUser(owner: Owner): Promise<number> {
  if (!owner.uid || !owner.guestId) return 0;
  const db = adminFirestore();
  const guestKey = `g_${owner.guestId}`;
  const userKey = owner.ownerKey;
  const gRef = playerRef(guestKey);
  const uRef = playerRef(userKey);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [gSnap, uSnap] = await Promise.all([tx.get(gRef), tx.get(uRef)]);
    if (!gSnap.exists) return 0;
    const g = readPlayer(gSnap.data(), { ...owner, ownerKey: guestKey, uid: null }, now);
    if (g.mergedInto) return 0;
    const u = readPlayer(uSnap.data(), owner, now);

    // Bank the guest's storage first, then move everything.
    collectInto(g, now);
    collectInto(u, now);
    u.creatures += g.creatures;
    u.lifetime += g.lifetime;
    addCatches(u, g.caught);
    u.importedLocal = u.importedLocal || g.importedLocal;

    // Firestore transactions need every read before the first write.
    const toMove = Object.keys(g.placed).filter((bId) => u.placed[bId] === undefined);
    const fromRefs = toMove.map((bId) => db.collection(KINGDOM_COLLECTION).doc(`${guestKey}_${bId}`));
    const fromSnaps = await Promise.all(fromRefs.map((r) => tx.get(r)));

    const moved: string[] = [];
    toMove.forEach((bId, i) => {
      const fromSnap = fromSnaps[i];
      if (!fromSnap.exists) return;
      tx.set(db.collection(KINGDOM_COLLECTION).doc(`${userKey}_${bId}`), {
        ...fromSnap.data(),
        ownerKey: userKey,
        ownerType: "user",
        uid: owner.uid,
        guestId: null,
      });
      tx.delete(fromRefs[i]);
      u.placed[bId] = g.placed[bId];
      u.collectedAt = { ...(u.collectedAt ?? {}), [bId]: now };
      u.owned = { ...(u.owned ?? {}), [bId]: Math.max(1, g.owned?.[bId] ?? 1) };
      moved.push(bId);
    });
    if (moved.length) {
      u.cityId = u.cityId ?? g.cityId;
      u.city = u.city ?? g.city;
      if (u.lastCollectAt == null) u.lastCollectAt = now;
    }
    u.updatedAt = now;

    tx.set(uRef, u);
    tx.set(gRef, { ...g, creatures: 0, mergedInto: owner.uid, updatedAt: now });
    return g.creatures;
  });
}

/**
 * The player's rank in their city by kingdom power (creatures per minute of all buildings).
 * Returns null when they have no buildings yet.
 */
export async function cityRank(p: PlayerDoc): Promise<{ rank: number; total: number; city: string } | null> {
  if (!p.cityId || !Object.keys(p.placed).length) return null;
  const snap = await adminFirestore().collection(KINGDOM_COLLECTION).where("cityId", "==", p.cityId).limit(3000).get();
  const power = new Map<string, number>();
  for (const d of snap.docs) {
    const x = d.data();
    const b = BUILDINGS.find((bb) => bb.id === x.buildingId);
    if (!b) continue;
    const copies = Math.max(1, Math.floor(Number(x.count) || 1));
    power.set(String(x.ownerKey), (power.get(String(x.ownerKey)) ?? 0) + b.perMin * copies);
  }
  const mine = power.get(p.ownerKey) ?? ratePerMin(Object.keys(p.placed), p.owned);
  let rank = 1;
  for (const [k, v] of power) if (k !== p.ownerKey && v > mine) rank++;
  return { rank, total: Math.max(power.size, 1), city: p.city ?? "" };
}
