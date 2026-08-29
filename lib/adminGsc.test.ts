import assert from "node:assert/strict";
import test from "node:test";

import {
  gscDateWindow,
  gscQueryDocId,
  gscSearchAnalyticsUrl,
  normalizeGscQueryRow,
  pickGscSite,
} from "./adminGsc";

test("picks the dreamly Search Console property", () => {
  assert.equal(
    pickGscSite(["https://other.example/", "sc-domain:dreamly.art"]),
    "sc-domain:dreamly.art",
  );
  assert.equal(
    pickGscSite(["https://dreamly.art/"], "https://dreamly.art/"),
    "https://dreamly.art/",
  );
  assert.equal(pickGscSite(["https://unrelated.test/"]), "https://unrelated.test/");
});

test("encodes the property URL for searchAnalytics.query", () => {
  assert.equal(
    gscSearchAnalyticsUrl("sc-domain:dreamly.art"),
    "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Adreamly.art/searchAnalytics/query",
  );
});

test("maps GSC rows and skips empty queries", () => {
  assert.deepEqual(
    normalizeGscQueryRow({
      keys: ["dreamly ai"],
      clicks: 22,
      impressions: 372,
      ctr: 0.0591,
      position: 4.2,
    }),
    {
      query: "dreamly ai",
      clicks: 22,
      impressions: 372,
      ctr: 0.0591,
      position: 4.2,
    },
  );
  assert.equal(normalizeGscQueryRow({ keys: [""], clicks: 1 }), null);
});

test("uses a stable 90-day window ending two UTC days ago", () => {
  const window = gscDateWindow(new Date("2026-08-29T10:20:00Z"), 90, 2);
  assert.equal(window.endDate, "2026-08-27");
  assert.equal(window.startDate, "2026-05-30");
});

test("hashes queries for Firestore document ids", () => {
  assert.equal(gscQueryDocId("dreamly ai").length, 64);
  assert.equal(gscQueryDocId("dreamly ai"), gscQueryDocId("dreamly ai"));
  assert.notEqual(gscQueryDocId("dreamly ai"), gscQueryDocId("dreamly"));
});
