import assert from "node:assert/strict";
import test from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { allowGuestFirstAnalysisWithoutAd, consumeGuestAsk, refundGuestAsk, guestAdReward, hashIp } from "../app/api/dreams/_lib/guestQuota";
import { guestAnalysisAccess } from "./guestAnalysisAccess";
import { POST as analyze } from "../app/api/dreams/analyze/route";
import { POST as quickSymbol } from "../app/api/dreams/quick-symbol/route";
import { guestAskDedupId } from "../app/api/dreams/_lib/guestDedup";
import { GET, POST } from "../app/api/dreams/guest-ad-reward/route";

test("guests try ads first, with no-fill free only for the first analysis", () => {
  assert.equal(guestAnalysisAccess(0, 0, 0), "first_ad");
  assert.equal(guestAnalysisAccess(0, 0, 0, true), "free");
  assert.equal(guestAnalysisAccess(1, 0, 0, true), "guest_limit");
  assert.equal(guestAnalysisAccess(100, 0, 0), "guest_limit");
  assert.equal(guestAnalysisAccess(0, 1, 0, true), "ip_limit");
  assert.equal(guestAnalysisAccess(1, 5, 1), "ad");
  assert.equal(guestAnalysisAccess(0, 0, 1), "ad");
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
    create: (ref: { path: string }, data: Record<string, unknown>) => {
      if (records.has(ref.path)) throw new Error("ALREADY_EXISTS");
      records.set(ref.path, data);
    },
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
  // POST needs a fresh replay key per watched ad (lib/rewardedReceipt.ts).
  let seq = 0;
  const grant = () => new Request("http://localhost/api/dreams/guest-ad-reward", {
    method: "POST",
    headers: { cookie: `dreamly_guest=${id}`, "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ rewardId: `9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c${String(++seq).padStart(2, "0")}` }),
  });

  assert.equal((await GET(new Request("http://localhost/api/dreams/guest-ad-reward"))).status, 401);
  assert.deepEqual(await consumeGuestAsk(id, ip), { ok: false, reason: "first_ad" });
  const fallback = await POST(new Request("http://localhost/api/dreams/guest-ad-reward", {
    method: "POST", headers: { cookie: `dreamly_guest=${id}`, "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ kind: "analysis", noAdAvailable: true }),
  }));
  assert.equal(fallback.status, 200);
  const free = await consumeGuestAsk(id, ip);
  assert.ok(free.ok);
  assert.equal(free.charge, "free");
  assert.deepEqual(await consumeGuestAsk("another-cookie", ip), { ok: false, reason: "ip_limit" });
  await refundGuestAsk(id, ip, free);
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${today}`)?.used, 0);
  assert.ok((await consumeGuestAsk(id, ip)).ok);
  // Even a legacy cached answer cannot bypass today's exhausted network quota.
  const text = "I am floating through an unfamiliar corridor and every door is humming.";
  records.set(`guestAskDedup/${guestAskDedupId(ip, text)}`, { analysis: "legacy answer" });
  const refPrototype = Object.getPrototypeOf(db.doc("guestAskDedup/example"));
  t.mock.method(refPrototype, "get", async function (this: { path: string }) {
    return { exists: records.has(this.path), data: () => records.get(this.path) };
  });
  const ask = (cookie = "") => new Request("http://localhost/api/dreams/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, cookie },
    body: JSON.stringify({ text, lang: "en", lens: "psychological" }),
  });
  // Both AI entry points require trying an ad even on a fresh network.
  for (const [route, body] of [
    [analyze, { text, lang: "en", lens: "psychological" }],
    [quickSymbol, { query: "zxqvplmn" }],
  ] as const) {
    const first = await route(new Request("http://localhost/api/dreams/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.50" },
      body: JSON.stringify(body),
    }));
    assert.equal(first.status, 401);
    assert.equal((await first.json()).reason, "first_ad");
    assert.match(first.headers.get("set-cookie") ?? "", /dreamly_guest=/);
  }
  for (const cookie of ["", `dreamly_guest=${id}`]) {
    const blocked = await analyze(ask(cookie));
    assert.equal(blocked.status, 401);
    assert.equal((await blocked.json()).code, "GUEST_LIMIT_REACHED");
    assert.match(blocked.headers.get("set-cookie") ?? "", /dreamly_guest=/);
  }
  const quickBlocked = await quickSymbol(new Request("http://localhost/api/dreams/quick-symbol", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, cookie: `dreamly_guest=${id}` },
    body: JSON.stringify({ query: "zxqvplmn" }),
  }));
  assert.equal(quickBlocked.status, 401);
  assert.equal((await quickBlocked.json()).code, "GUEST_LIMIT_REACHED");

  assert.deepEqual(await consumeGuestAsk(id, ip), { ok: false, reason: "ip_limit" });
  assert.equal(await allowGuestFirstAnalysisWithoutAd(id, ip), false);
  const laterFallback = await POST(new Request("http://localhost/api/dreams/guest-ad-reward", {
    method: "POST", headers: { cookie: `dreamly_guest=${id}`, "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ kind: "analysis", noAdAvailable: true }),
  }));
  assert.equal(laterFallback.status, 403);
  assert.deepEqual(await (await GET(request())).json(), { credits: 0, leftToday: 3 });
  assert.deepEqual(await (await POST(grant())).json(), { credits: 1, leftToday: 2 });
  // A retried reward request cannot accumulate an extra unspent credit.
  assert.deepEqual(await (await POST(grant())).json(), { credits: 1, leftToday: 2 });
  const earned = await consumeGuestAsk(id, ip);
  assert.ok(earned.ok);
  assert.equal(earned.charge, "ad");
  assert.deepEqual(await consumeGuestAsk(id, ip), { ok: false, reason: "ip_limit" });
  await refundGuestAsk(id, ip, earned);
  assert.equal(records.get(`guestQuickSymbol/${id}`)?.used, 1);
  assert.equal(records.get(`guestQuickSymbol/${id}`)?.adAnalysisCredits, 1);
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${today}`)?.used, 1);
  assert.ok((await consumeGuestAsk(id, ip)).ok);
  for (let n = 0; n < 2; n++) {
    assert.equal((await POST(grant())).status, 200);
    assert.ok((await consumeGuestAsk(id, ip)).ok);
  }
  assert.equal((await POST(grant())).status, 429);
  // Resetting cookies does not bypass the network ad cap.
  assert.deepEqual(await guestAdReward("another-guest", ip, true, "9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c90"), { credits: 0, leftToday: 0 });

  const networkIp = "192.0.2.2";
  records.set(`guestQuickSymbolIp/${hashIp(networkIp)}_${today}`, { used: 5 });
  assert.deepEqual(await consumeGuestAsk("network-guest", networkIp), { ok: false, reason: "ip_limit" });
  await guestAdReward("network-guest", networkIp, true, "9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c91");
  const networkEarned = await consumeGuestAsk("network-guest", networkIp);
  assert.ok(networkEarned.ok);
  assert.equal(networkEarned.charge, "ad");

  // A free request crossing midnight refunds its original day, not today's IP quota.
  const yesterday = "2000-01-01";
  records.set(`guestQuickSymbolIp/${hashIp(ip)}_${yesterday}`, { used: 1 });
  await refundGuestAsk(id, ip, { ok: true, used: 1, charge: "free", dayKey: yesterday });
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${yesterday}`)?.used, 0);
  assert.equal(records.get(`guestQuickSymbolIp/${hashIp(ip)}_${today}`)?.used, 4);

  // A returning guest gets no new free fallback on a new day/network.
  records.set(`guestQuickSymbol/${id}`, { used: 50, adAnalysisCredits: 1 });
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  t.mock.timers.tick(86_400_000);
  const tomorrowAd = await consumeGuestAsk(id, ip);
  assert.ok(tomorrowAd.ok);
  assert.equal(tomorrowAd.charge, "ad");
  assert.equal(records.get(`guestQuickSymbol/${id}`)?.adAnalysisCredits, 0);
  assert.deepEqual(await consumeGuestAsk(id, "192.0.2.99"), { ok: false, reason: "guest_limit" });
  assert.equal(await allowGuestFirstAnalysisWithoutAd(id, "192.0.2.99"), false);

  // Watching an ad for the very first analysis must also use up first eligibility.
  const firstAdGuest = "first-ad-guest";
  const firstAdIp = "192.0.2.3";
  await guestAdReward(firstAdGuest, firstAdIp, true, "9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c92");
  const firstAd = await consumeGuestAsk(firstAdGuest, firstAdIp);
  assert.ok(firstAd.ok);
  assert.equal(firstAd.charge, "ad");
  assert.equal(await allowGuestFirstAnalysisWithoutAd(firstAdGuest, "192.0.2.4"), false);
  await refundGuestAsk(firstAdGuest, firstAdIp, firstAd);
  assert.equal(records.get(`guestQuickSymbol/${firstAdGuest}`)?.used, 0);
  assert.equal(records.get(`guestQuickSymbol/${firstAdGuest}`)?.adAnalysisCredits, 1);
});
