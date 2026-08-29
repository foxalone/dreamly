import assert from "node:assert/strict";
import test from "node:test";

import {
  gscDateWindow,
  gscQueryDocId,
  gscRangeWindow,
  gscSearchAnalyticsUrl,
  latestDateFromGscDateRows,
  normalizeGscQueryRow,
  parseGscRange,
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

test("builds data-relative ranges from the latest GSC day, not the calendar", () => {
  assert.deepEqual(gscRangeWindow("2026-08-27", "1d"), {
    startDate: "2026-08-27",
    endDate: "2026-08-27",
  });
  assert.deepEqual(gscRangeWindow("2026-08-27", "3d"), {
    startDate: "2026-08-25",
    endDate: "2026-08-27",
  });
  assert.deepEqual(gscRangeWindow("2026-08-27", "7d"), {
    startDate: "2026-08-21",
    endDate: "2026-08-27",
  });
  assert.deepEqual(gscRangeWindow("2026-08-27", "30d"), {
    startDate: "2026-07-29",
    endDate: "2026-08-27",
  });
});

test("picks the newest date row as the last day of data", () => {
  assert.equal(
    latestDateFromGscDateRows([
      { keys: ["2026-08-25"] },
      { keys: ["2026-08-27"] },
      { keys: ["2026-08-26"] },
    ]),
    "2026-08-27",
  );
  assert.equal(latestDateFromGscDateRows([{ keys: ["nope"] }]), null);
});

test("defaults unknown range keys to the last data day", () => {
  assert.equal(parseGscRange("7d"), "7d");
  assert.equal(parseGscRange("week"), "1d");
  assert.equal(parseGscRange(null), "1d");
});

test("hashes queries for Firestore document ids", () => {
  assert.equal(gscQueryDocId("dreamly ai").length, 64);
  assert.equal(gscQueryDocId("dreamly ai"), gscQueryDocId("dreamly ai"));
  assert.notEqual(gscQueryDocId("dreamly ai"), gscQueryDocId("dreamly"));
});
