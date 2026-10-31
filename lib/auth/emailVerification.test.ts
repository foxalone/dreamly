import assert from "node:assert/strict";
import test from "node:test";
import { passwordNeedsEmailVerification } from "./emailVerification";

test("only an unconfirmed password account needs an inbox link", () => {
  assert.equal(passwordNeedsEmailVerification(null), false);
  assert.equal(passwordNeedsEmailVerification({ emailVerified: true, providerData: [{ providerId: "password" }] }), false);
  assert.equal(passwordNeedsEmailVerification({ emailVerified: false, providerData: [{ providerId: "password" }] }), true);
  assert.equal(passwordNeedsEmailVerification({ emailVerified: false, providerData: [{ providerId: "google.com" }] }), false);
  assert.equal(passwordNeedsEmailVerification({ emailVerified: true, providerData: [{ providerId: "google.com" }, { providerId: "password" }] }), false);
});
