import assert from "node:assert/strict";
import test from "node:test";
import { guestNoteImportFields, guestNoteImportId } from "./guestNoteImportFields";

test("guest story and diary imports keep their own id, day and privacy", () => {
  const user = { uid: "user-1", displayName: "Dima", email: "dima@example.com" };
  const written = new Date(2026, 9, 31, 16, 10).getTime();
  const story = guestNoteImportFields("story", { text: "A story about the sea", createdAtMs: written }, user);
  const journal = guestNoteImportFields("journal", { text: "Walked by the sea", createdAtMs: written }, user);

  assert.equal(guestNoteImportId("story", written), `guest_story_${written}`);
  assert.equal(guestNoteImportId("journal", written), `guest_journal_${written}`);
  assert.notEqual(guestNoteImportId("story", written), guestNoteImportId("journal", written));

  assert.equal(story.sourceType, "story");
  assert.equal(journal.sourceType, "journal");
  assert.equal(story.text, "A story about the sea");
  assert.equal(journal.text, "Walked by the sea");
  assert.equal(story.dateKey, "2026-10-31");
  assert.equal(journal.dateKey, "2026-10-31");
  assert.equal(story.createdAtMs, written);
  assert.equal(story.shared, false);
  assert.equal(journal.shared, false);
  assert.equal("analysisText" in story, false);
  assert.equal("analysisText" in journal, false);
});
