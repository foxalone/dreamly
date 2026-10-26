import assert from "node:assert/strict";
import test from "node:test";
import { clearAdUnlockPending, setAdUnlockPending, takeAdUnlockPending } from "./adUnlock";
import { captureOfferwallDeparture, recoverOfferwallSession, startOfferwallSession, updateOfferwallSession } from "./offerwallSession";
import { localePath } from "./i18n/path";

test("a completed guest ad survives Safari back/restore and reuses its reward receipt in every locale", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } });
  try {
    for (const locale of ["en", "es", "ar", "pt", "de", "ru"] as const) {
      values.clear();
      const next = localePath("/app/dreams", locale);
      setAdUnlockPending({ kind: "analysis", dreamText: "The dream awaiting analysis" });
      const session = startOfferwallSession(next, "receipt-for-this-ad", "FCOEC=old-entitlement");
      assert.ok(session);
      // Opening/leaving the page, or an entitlement left by an earlier ad,
      // must never buy a new analysis.
      assert.equal(recoverOfferwallSession("FCOEC=new-entitlement")?.status, "watching");
      updateOfferwallSession({ shown: true });
      // Source forms can mount before recovery. They must leave the pending
      // dream and receipt intact while Google has not confirmed completion.
      assert.equal(takeAdUnlockPending("analysis", "The dream awaiting analysis"), null);
      assert.equal(recoverOfferwallSession("")?.status, "watching");
      assert.equal(recoverOfferwallSession("FCOEC=old-entitlement")?.status, "watching");
      assert.equal(captureOfferwallDeparture("FCOEC=old-entitlement", true)?.status, "watching");
      assert.equal(startOfferwallSession(next, "another-receipt", "FCOEC=old-entitlement")?.rewardId, session.rewardId);

      // The Google entitlement can arrive as Safari leaves the ad page, before
      // the polling callback notices the overlay disappearing.
      const completed = recoverOfferwallSession("other=cookie; FCOEC=new-entitlement");
      assert.equal(completed?.status, "completed");
      // Even a completed ad still needs a successful server credit grant.
      assert.equal(takeAdUnlockPending("analysis", "The dream awaiting analysis"), null);
      assert.equal(completed?.next, next);
      assert.equal(startOfferwallSession(next, "reload-receipt", "FCOEC=new-entitlement")?.rewardId, session.rewardId);
      updateOfferwallSession({ status: "granted" });
      assert.equal(recoverOfferwallSession("")?.status, "granted");

      // Only the matching dream consumes the action; after consumption a
      // cached source page cannot reopen the ad or repeat the grant.
      assert.equal(takeAdUnlockPending("analysis", "Another dream"), null);
      assert.ok(takeAdUnlockPending("analysis", "The dream awaiting analysis"));
      assert.equal(recoverOfferwallSession("FCOEC=new-entitlement"), null);

      // Capture a close followed immediately by navigation, before another
      // animation frame or cookie update. The return still needs to book credit.
      setAdUnlockPending({ kind: "analysis", dreamText: "Ad closed during navigation" });
      startOfferwallSession(next, "departure-receipt", "");
      assert.equal(captureOfferwallDeparture("", false)?.status, "watching");
      updateOfferwallSession({ shown: true });
      assert.equal(captureOfferwallDeparture("", true)?.status, "watching");
      assert.equal(captureOfferwallDeparture("", false)?.status, "completed");
      assert.equal(takeAdUnlockPending("analysis", "Ad closed during navigation"), null);
      assert.equal(startOfferwallSession(next, "do-not-replace-receipt", "")?.rewardId, "departure-receipt");
      updateOfferwallSession({ status: "granted" });
      assert.ok(takeAdUnlockPending("analysis", "Ad closed during navigation"));

      // Unavailable/cancelled flows clear the pending action and cannot revive.
      setAdUnlockPending({ kind: "analysis", dreamText: "Another dream" });
      startOfferwallSession(next, "cancelled-receipt", "");
      clearAdUnlockPending();
      assert.equal(recoverOfferwallSession("FCOEC=new-entitlement"), null);

      setAdUnlockPending({ kind: "analysis", dreamText: "A newly submitted dream" });
      const fresh = startOfferwallSession(next, "fresh-receipt", "FCOEC=new-entitlement");
      assert.equal(fresh?.rewardId, "fresh-receipt");
      assert.equal(fresh?.status, "watching");
      const pending = JSON.parse(values.get("dreamly.adUnlock")!);
      values.set("dreamly.adUnlock", JSON.stringify({ ...pending, atMs: Date.now() - 11 * 60_000 }));
      assert.equal(recoverOfferwallSession("FCOEC=another-entitlement"), null);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
