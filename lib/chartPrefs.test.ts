import assert from "node:assert/strict";
import test from "node:test";
import { parseHiddenMetrics } from "./chartPrefs";

test("saved chart chips keep only real metrics", () => {
  assert.deepEqual(parseHiddenMetrics('["dreams","nope",1,"moon"]'), ["dreams", "moon"]);
  assert.deepEqual(parseHiddenMetrics("nope"), []);
  assert.deepEqual(parseHiddenMetrics(null), []);
  assert.deepEqual(parseHiddenMetrics("[]"), []);
});
