import test from "node:test";
import assert from "node:assert/strict";
import { mergeGuestIntoUser, readPlayer, toState } from "../app/api/game/_lib/player";
import { settlePendingBuildings, type BuildingCity } from "../app/api/game/_lib/placement";
import type { Owner } from "../app/api/game/_lib/owner";

const owner: Owner = { ownerKey: "u_player", uid: "player", guestId: "visitor", newGuest: false };
const guest: Owner = { ownerKey: "g_visitor", uid: null, guestId: "visitor", newGuest: false };
const city: BuildingCity = { cityId: "IL|TA|Tel Aviv", city: "Tel Aviv", country: "IL", admin1: "TA", lat: 32.08, lng: 34.78 };

/** Exercise the production transactions without credentials or writes to real player data. */
function database(initial: Record<string, object>) {
  const docs = new Map(Object.entries(structuredClone(initial)));
  let writes = 0;
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
    runTransaction: async <T>(run: (tx: unknown) => Promise<T>) => {
      const changes: Array<() => void> = [];
      const result = await run({
        get: async (ref: { path: string }) => {
          assert.equal(changes.length, 0, "Firestore requires all reads before writes");
          return { exists: docs.has(ref.path), data: () => structuredClone(docs.get(ref.path)) };
        },
        set: (ref: { path: string }, data: object) => changes.push(() => { docs.set(ref.path, structuredClone(data)); writes++; }),
        delete: (ref: { path: string }) => changes.push(() => { docs.delete(ref.path); writes++; }),
      });
      changes.forEach(commit => commit());
      return result;
    },
  };
  return { docs, db: db as unknown as FirebaseFirestore.Firestore, writes: () => writes };
}

function purchased(who: Owner, copies = 1, location = "") {
  const now = Date.now();
  return { ...readPlayer(undefined, who, now), taps: 10, lifetime: 30, creatures: 15, placed: { hut: location }, owned: { hut: copies }, collectedAt: { hut: now }, lastCollectAt: now };
}

test("a saved building without a city survives reload and produces creatures", () => {
  const saved = purchased(guest);
  const reloaded = readPlayer(JSON.parse(JSON.stringify(saved)), guest, Date.now());
  const state = toState(reloaded, saved.collectedAt.hut + 5 * 60_000);
  assert.deepEqual(state.placed, { hut: "" });
  assert.equal(state.owned.hut, 1);
  assert.equal(state.rate, 1);
  assert.equal(state.storage.by.hut.amount, 5);
});

test("sign-in transfers a pending guest purchase without requiring a map document", async () => {
  const { db, docs } = database({ "kingdom_players/g_visitor": purchased(guest) });
  await mergeGuestIntoUser(owner, db);
  const player = readPlayer(docs.get("kingdom_players/u_player"), owner, Date.now());
  assert.deepEqual(player.placed, { hut: "" });
  assert.equal(player.owned.hut, 1);
  assert.equal(toState(player, Date.now()).rate, 1);
  assert.equal(docs.has("kingdom_buildings/u_player_hut"), false);
  const mergedGuest = readPlayer(docs.get("kingdom_players/g_visitor"), guest, Date.now());
  assert.equal(mergedGuest.mergedInto, owner.uid);
  assert.deepEqual(mergedGuest.placed, {});
  await mergeGuestIntoUser(owner, db);
  assert.equal(readPlayer(docs.get("kingdom_players/u_player"), owner, Date.now()).owned.hut, 1);
});

test("guest copies are preserved when the account already owns the same building", async () => {
  const { db, docs } = database({
    "kingdom_players/g_visitor": purchased(guest),
    "kingdom_players/u_player": purchased(owner, 2, "Tel Aviv"),
    "kingdom_buildings/u_player_hut": { buildingId: "hut", city: "Tel Aviv", count: 2, lat: 32, lng: 34 },
  });
  await mergeGuestIntoUser(owner, db);
  const player = readPlayer(docs.get("kingdom_players/u_player"), owner, Date.now());
  assert.equal(player.owned.hut, 3);
  assert.equal(player.placed.hut, "Tel Aviv");
  assert.deepEqual(docs.get("kingdom_buildings/u_player_hut"), {
    buildingId: "hut", city: "Tel Aviv", count: 3, lat: 32, lng: 34,
    ownerKey: owner.ownerKey, ownerType: "user", uid: owner.uid, guestId: null,
  });
});

test("a located guest building still moves to the account", async () => {
  const { db, docs } = database({
    "kingdom_players/g_visitor": purchased(guest, 1, "Tel Aviv"),
    "kingdom_buildings/g_visitor_hut": { buildingId: "hut", city: "Tel Aviv", count: 1, lat: 32, lng: 34 },
  });
  await mergeGuestIntoUser(owner, db);
  assert.equal(docs.has("kingdom_buildings/g_visitor_hut"), false);
  assert.equal(docs.has("kingdom_buildings/u_player_hut"), true);
  assert.equal(readPlayer(docs.get("kingdom_players/u_player"), owner, Date.now()).placed.hut, "Tel Aviv");
});

test("learning the city places all saved copies once, without charging or resetting income", async () => {
  const saved = purchased(owner, 3);
  const { db, docs, writes } = database({ "kingdom_players/u_player": saved });
  const placed = await settlePendingBuildings(owner, city, db);
  assert.equal(placed?.placed.hut, "Tel Aviv");
  assert.equal(placed?.creatures, saved.creatures);
  assert.equal(placed?.owned.hut, 3);
  assert.equal(placed?.collectedAt.hut, saved.collectedAt.hut);
  const map = docs.get("kingdom_buildings/u_player_hut") as Record<string, unknown>;
  assert.equal(map.count, 3);
  assert.equal(map.cityId, city.cityId);
  assert.equal(map.uid, owner.uid);
  assert.ok(Number.isFinite(map.lat));
  assert.ok(Number.isFinite(map.lng));
  const previousWrites = writes();
  await settlePendingBuildings(owner, city, db);
  assert.equal(writes(), previousWrites);
  assert.equal(docs.size, 2);
});
