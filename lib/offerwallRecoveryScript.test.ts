import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { OFFERWALL_RECOVERY_SCRIPT } from "./offerwallRecoveryScript";

test("completed receipt recovery suppresses only another Offerwall before AdSense loads", () => {
  const now = Date.now();
  const pending = { kind: "analysis", atMs: now, dreamText: "The dream" };
  const session = { pendingAtMs: now, dreamText: pending.dreamText, status: "completed" };
  function run(action: unknown, saved: unknown, pathname = "/ad/unlock") {
    const googlefc: { MessageTypeEnum: { OFFERWALL: number }; controlledMessagingFunction?: (message: { proceed: (...args: unknown[]) => void }) => void } = { MessageTypeEnum: { OFFERWALL: 3 } };
    vm.runInNewContext(OFFERWALL_RECOVERY_SCRIPT, {
      location: { pathname }, window: { googlefc },
      sessionStorage: { getItem: (key: string) => JSON.stringify(key === "dreamly.adUnlock" ? action : saved) },
    });
    const calls: unknown[][] = [];
    googlefc.controlledMessagingFunction?.({ proceed: (...args) => { calls.push(args); } });
    return JSON.parse(JSON.stringify(calls)) as unknown[][];
  }
  assert.deepEqual(run(pending, session), [[false, [3]]]);
  assert.deepEqual(run({ ...pending, dreamText: "Different dream" }, session), []);
  assert.deepEqual(run(pending, { ...session, status: "watching" }), []);
  assert.deepEqual(run({ ...pending, atMs: now - 660000 }, session), []);
  assert.deepEqual(run(pending, session, "/app/dreams"), []);
  assert.deepEqual(run({ ...pending, ready: true }, null), [[false, [3]]]);
});
