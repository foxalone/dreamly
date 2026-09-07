import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyImageSocialError,
  imageSocialsAllPublished,
  imageSocialsAnyPublished,
} from "./imageSocialPublish";

test("treats already-published and disconnected errors as skippable", () => {
  assert.equal(classifyImageSocialError("This image is already published to Instagram"), "already");
  assert.equal(classifyImageSocialError("Facebook Page is not connected. Reconnect Meta."), "disconnected");
  assert.equal(classifyImageSocialError("Instagram is not linked. Convert the account."), "disconnected");
  assert.equal(classifyImageSocialError("Threads is not configured"), "disconnected");
  assert.equal(classifyImageSocialError("Graph API timeout"), "failed");
});

test("detects full and partial image social publish state", () => {
  assert.equal(imageSocialsAnyPublished({ instagram: true }), true);
  assert.equal(imageSocialsAllPublished({ instagram: true, facebook: true }), false);
  assert.equal(
    imageSocialsAllPublished({ instagram: true, facebook: true, threads: true, pinterest: true }),
    true,
  );
});
