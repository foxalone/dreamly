import assert from "node:assert/strict";
import test from "node:test";

import { isAdminJobActive } from "../app/app/profile/admin-dashboard/useAdminActivePolling";

test("admin polling treats only queued and processing jobs as active", () => {
  assert.equal(isAdminJobActive("queued"), true);
  assert.equal(isAdminJobActive("processing"), true);
  assert.equal(isAdminJobActive("completed"), false);
  assert.equal(isAdminJobActive("failed"), false);
  assert.equal(isAdminJobActive(""), false);
  assert.equal(isAdminJobActive(undefined), false);
});
