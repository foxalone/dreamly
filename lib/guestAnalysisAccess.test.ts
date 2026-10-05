import assert from "node:assert/strict";
import test from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { consumeGuestAsk, refundGuestAsk, guestAdReward, hashIp } from "../app/api/dreams/_lib/guestQuota";
import { guestAnalysisAccess } from "./guestAnalysisAccess";
import { GET, POST } from "../app/api/dreams/guest-ad-reward/route";

test("guest analysis: free limits and earned credits", () => {
  assert.equal(guestAnalysisAccess(0, 0, 0), "free");
  assert.equal(guestAnalysisAccess(1, 1, 0), "guest_limit");
  assert.equal(guestAnalysisAccess(0, 5, 0), "ip_limit");
  assert.equal(guestAnalysisAccess(1, 5, 1), "ad");
});

test("guest quota and reward routes preserve balances and enforce daily caps", async (t) => {
  // Exercise real quota/route logic against an in-memory transaction adapter.
  // No credentials or external Firebase requests are used.
  const app = initializeApp({ projectId: "demo-guest-quota" }, "project-server");
  const db = getFirestore(app);
  const records = new Map<string, Record<string, unknown>>();
  const write = (ref: { path: string }, data: Record<string, unknown>) => {
    const result = { ...records.get(ref.path) };
    for (const [key, value] of Object.entries(data)) {
      result[key] = value instanceof FieldValue && value.isEqual(FieldValue.increment(1))
        ? Number(result[key] ?? 0) + 1
        : value instanceof FieldValue && value.isEqual(FieldValue.increment(-1))
          ? Number(result[key] ?? 0) - 1 : value;
    }
    records.set(ref.path, result);
  };
  const tx = {
    get: async (ref: { path: string }) => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
    set: write,
  };
  t.mock.method(db, "runTransaction", async (fn: (transaction: typeof tx) => unknown) => fn(tx));
  t.mock.method(db, "batch", () => ({ set: write, commit: async () => [] }));
  t.after(async () => { t.mock.restoreAll(); await deleteApp(app); });
  const ip = "192.0.2.1";
  const id = "12345678-abcd-1234-abcd-123456789abc";
  const today = new Date().toISOString().slice(0, 10);
  const request = () => new Request("http://localhost/api/dreams/guest-ad-reward", {
    headers: { cookie: `dreamly_guest=${id}`, "x-forwarded-for": ip },
  });

  assert.equal((await GET(new Request("http://localhost/api/dreams/guest-ad-reward"))).status, 401);
  const free = await consumeGuestAsk(id, ip);
  assert.ok(free.ok);
  assert.equal(free.charge, "free");
  assert.deepEqual(await consumeGuestAsk(id, ip), { ok: false, reason: "guest_limit" });
  assert.deepEqual(await (await GET(request())).json(), { credits: 0, leftToday: 3 });
  assert.deepEqual(await (await POST(request())).json(), { credits: 1, leftToday: 2 });
  // A retried reward request cannot accumulate an extra unspent credit.
  assert.deepEqual(await (await POST(request())).json(), { credits: 1, leftToday: 2 });
  const earned = await consumeGuestAsk(id, ip);
  assert.ok(earned.ok);
  assert.equal(earned.charge, "ad");
  assert.deepEqual(await consumeGuestAsk(id, ip), { ok: false, reason: "guest_limit" });
  await refundGuestAsk(id, ip, earned);
  assert.equal(records.get(`guestQuickSymbol/${id}`)?.used, 1);
  assert.equal(records.get(`guestQuickSymbol/${id}`)?.adAnalysisCredits, 1);
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${today}`)?.used, 1);
  assert.ok((await consumeGuestAsk(id, ip)).ok);
  for (let n = 0; n < 2; n++) {
    assert.equal((await POST(request())).status, 200);
    assert.ok((await consumeGuestAsk(id, ip)).ok);
  }
  assert.equal((await POST(request())).status, 429);
  // Resetting cookies does not bypass the network ad cap.
  assert.deepEqual(await guestAdReward("another-guest", ip, true), { credits: 0, leftToday: 0 });

  const networkIp = "192.0.2.2";
  records.set(`guestQuickSymbolIp/${hashIp(networkIp)}_${today}`, { used: 5 });
  assert.deepEqual(await consumeGuestAsk("network-guest", networkIp), { ok: false, reason: "ip_limit" });
  await guestAdReward("network-guest", networkIp, true);
  const networkEarned = await consumeGuestAsk("network-guest", networkIp);
  assert.ok(networkEarned.ok);
  assert.equal(networkEarned.charge, "ad");

  // A free request crossing midnight refunds its original day, not today's IP quota.
  const yesterday = "2000-01-01";
  records.set(`guestQuickSymbolIp/${hashIp(ip)}_${yesterday}`, { used: 1 });
  await refundGuestAsk(id, ip, { ...free, dayKey: yesterday });
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${yesterday}`)?.used, 0);
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${today}`)?.used, 1);
});
