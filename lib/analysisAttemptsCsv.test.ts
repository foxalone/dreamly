import assert from "node:assert/strict";
import { test } from "node:test";
import { analysisAttemptsCsv, ATTEMPT_CSV_COLUMNS } from "./analysisAttemptsCsv";

test("exports full attempt details and event history as spreadsheet-safe CSV", () => {
  const csv = analysisAttemptsCsv([{
    id: "attempt-1", status: "failed", reason: "ai_rate_limited", updatedAtMs: 1_800_000_000_000,
    text: '=HYPERLINK("bad","click")\r\nDream', analysis: "Answer, with a quote: \"yes\"",
    uid: "user-1", httpStatus: 500, requestCount: 2, emojis: [{ native: "🌙" }],
    events: [
      { event: "analysis_submitted", atMs: 1_799_999_999_000, source: "server" },
      { event: "auth_google_started", atMs: 1_799_999_999_500, source: "browser" },
    ],
  }], 1_800_000_100_000);

  assert.ok(csv.startsWith(`\uFEFF${ATTEMPT_CSV_COLUMNS.map((column) => `"${column}"`).join(",")}\r\n`));
  assert.match(csv, /"'=HYPERLINK\(""bad"",""click""\)\r\nDream"/);
  assert.match(csv, /"Answer, with a quote: ""yes"""/);
  assert.match(csv, /"service","server_failed","ai_rate_limited","500","auth_google_started"/);
  assert.match(csv, /"\[\{""event"":""analysis_submitted""/);
  assert.match(csv, /"\[\{""native"":""🌙""\}\]"/);
  assert.ok(csv.endsWith("\r\n"));
});
