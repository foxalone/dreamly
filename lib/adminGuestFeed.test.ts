import assert from "node:assert/strict";
import test from "node:test";
import { matchingGuestFeedEntries } from "./adminGuestFeed";

test("an unshared guest dream does not inherit another dream's legacy share", () => {
  const entries = [{ id: "guest_visitor", sharedAtMs: 1, text: "A dream about a forest" }];
  assert.deepEqual(matchingGuestFeedEntries({ text: "A dream about flying" }, entries), []);
  assert.deepEqual(matchingGuestFeedEntries({ text: "A dream about a forest" }, entries), entries);
});

test("deleted shares do not count as being in the public feed", () => {
  const entries = [{ id: "guest_visitor_flying", sharedAtMs: 1, text: "A dream about flying", deleted: true }];
  assert.deepEqual(matchingGuestFeedEntries({ sharedId: entries[0].id, text: entries[0].text }, entries), []);
});
