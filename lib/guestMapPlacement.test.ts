import assert from "node:assert/strict";
import test from "node:test";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { guestDreamSnapshotId } from "../app/api/dreams/_lib/guestDreamSnapshot";
import { mapCoordinates } from "./geo/mapCoordinates";
import { resolveIpCity } from "./geo/resolveIpCity";
import { ingestGuestDream } from "./map/ingestGuestDream";

const cityId = "IL|Tel Aviv";
const cityStats = `city_emoji_stats/${cityId}`;
const coordinates = { lat: 32.0853, lng: 34.7818 };

function request(lat?: string, lng?: string) {
  const headers = new Headers({
    "x-vercel-ip-country": "IL", "x-vercel-ip-city": "Tel%20Aviv", "x-forwarded-for": "192.0.2.1",
  });
  if (lat !== undefined) headers.set("x-vercel-ip-latitude", lat);
  if (lng !== undefined) headers.set("x-vercel-ip-longitude", lng);
  return new Request("https://dreamly.art/api/map/ingest-guest", { headers });
}

function fixture() {
  type Ref = { path: string };
  type Row = Record<string, unknown>;
  const rows = new Map<string, Row>();
  const writes: { path: string; data: Row }[] = [];
  const get = async ({ path }: Ref) => ({ exists: rows.has(path), data: () => rows.get(path) });
  let pending: Promise<unknown> = Promise.resolve();
  const db = {
    collection: (collection: string) => ({
      doc(id: string) {
        const ref = { path: `${collection}/${id}` };
        return { ...ref, get: () => get(ref) };
      },
    }),
    runTransaction<T>(run: (tx: unknown) => Promise<T>) {
      const result = pending.then(() => run({
        get,
        getAll: (...refs: Ref[]) => Promise.all(refs.map(get)),
        set({ path }: Ref, data: Row, options?: { merge: boolean }) {
          writes.push({ path, data });
          rows.set(path, options?.merge ? { ...rows.get(path), ...data } : data);
        },
      }));
      pending = result.catch(() => {});
      return result;
    },
  } as unknown as Firestore;
  return { db, rows, writes };
}

test("IP geolocation leaves missing and invalid coordinates unset, including the null-island placeholder", async () => {
  for (const [lat, lng] of [[undefined, undefined], ["32", ""], ["0", "0"], ["91", "34"]]) {
    const result = await resolveIpCity(request(lat, lng));
    assert.equal(result?.cityId, cityId);
    assert.equal(result.lat, null);
    assert.equal(result.lng, null);
  }
  const equator = await resolveIpCity(request("0", "34"));
  assert.equal(equator?.lat, 0);
  assert.equal(equator.lng, 34);
});

test("Android records each distinct analyzed guest dream only once, including concurrent retries", async () => {
  const { db, rows, writes } = fixture();
  const req = request(String(coordinates.lat), String(coordinates.lng));
  const first = { text: "Quiet house", emojis: [{ native: "🏠" }] };
  const second = { text: "Dark forest", emojis: [{ native: "🌳" }] };
  const id = guestDreamSnapshotId("guest", first.text);
  rows.set(`guest_dreams/${id}`, { analysis: "Verified reading", shared: true });

  await Promise.all([
    ingestGuestDream(req, "guest", first, true, () => db),
    ingestGuestDream(req, "guest", first, true, () => db),
    ingestGuestDream(req, "guest", second, true, () => db),
  ]);
  const duplicateNetworkRequest = await ingestGuestDream(req, "new-cookie", first, true, () => db);
  assert.equal(duplicateNetworkRequest.deduped, true);
  const cityWrites = writes.filter(({ path }) => path === cityStats);
  assert.equal(cityWrites.length, 2);
  assert.deepEqual(cityWrites.map(({ data }) => [data.lat, data.lng]), [[coordinates.lat, coordinates.lng], [coordinates.lat, coordinates.lng]]);
  assert.ok(FieldValue.increment(1).isEqual(cityWrites[0]!.data["emojis.🏠"] as FieldValue));
  assert.ok(FieldValue.increment(1).isEqual(cityWrites[1]!.data["emojis.🌳"] as FieldValue));
  assert.equal(rows.get(`guest_dreams/${id}`)?.cityId, cityId);
  assert.equal(rows.get(`guest_dreams/${id}`)?.analysis, "Verified reading");
  assert.equal(rows.get(`guest_dreams/${id}`)?.shared, true);
});

test("web guest map keeps its daily limit and a repeat identifies the already-counted dream", async () => {
  const { db, rows, writes } = fixture();
  const req = request(String(coordinates.lat), String(coordinates.lng));
  const first = { text: "A quiet room", emojis: [{ native: "🏠" }], iconsEn: ["house"], rootsEn: ["room"] };
  const accepted = await ingestGuestDream(req, "guest", first, false, () => db);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.cityId, cityId);
  const repeat = await ingestGuestDream(req, "guest", first, false, () => db);
  assert.equal(repeat.cityId, cityId);
  assert.notEqual(repeat.skipped, true);
  await ingestGuestDream(req, "guest", first, true, () => db);
  const other = await ingestGuestDream(req, "guest", { ...first, text: "Another room" }, false, () => db);
  assert.equal(other.skipped, true);
  assert.equal(writes.filter(({ path }) => path === cityStats).length, 1);
  const stats = rows.get(cityStats);
  assert.deepEqual(mapCoordinates(stats?.lat, stats?.lng), coordinates);
  const snapshot = rows.get(`guest_dreams/${guestDreamSnapshotId("guest", first.text)}`);
  assert.deepEqual(snapshot?.iconsEn, ["house"]);
  assert.deepEqual(snapshot?.rootsEn, ["room"]);
});

test("guest stats leave missing coordinates unset and repair legacy zero coordinates from a cached city", async () => {
  const { db, rows, writes } = fixture();
  rows.set(`cities/${cityId}`, coordinates);
  rows.set(cityStats, { lat: 0, lng: 0 });
  await ingestGuestDream(request(), "guest", { text: "A cloud", emojis: [{ native: "☁️" }] }, true, () => db);
  const cityWrites = writes.filter(({ path }) => path === cityStats);
  assert.equal(cityWrites.length, 2);
  assert.equal(cityWrites[0]?.data.lat, undefined);
  assert.equal(cityWrites[0]?.data.lng, undefined);
  assert.equal(rows.get(cityStats)?.lat, coordinates.lat);
  assert.equal(rows.get(cityStats)?.lng, coordinates.lng);
});
