import assert from "node:assert/strict";
import test from "node:test";
import { EN_GUEST_SHARE_COPY, normalizeGuestShareCopy } from "./guestShareCopy";

test("guest sign-in copy keeps both badge placeholders and rank names", () => {
  assert.deepEqual(normalizeGuestShareCopy(EN_GUEST_SHARE_COPY), EN_GUEST_SHARE_COPY);
  assert.equal(normalizeGuestShareCopy({ ...EN_GUEST_SHARE_COPY, done: "Welcome, {badge}" }), null);
  assert.equal(normalizeGuestShareCopy({ ...EN_GUEST_SHARE_COPY, wizard: "" }), null);
});
