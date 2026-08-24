import assert from "node:assert/strict";
import test from "node:test";

import { DREAMLY_SOCIAL_CTA_HEADLINE, DREAMLY_SOCIAL_URL } from "./socialCta";
import {
  buildDreamImageCaption,
  dreamPageUrl,
  firstInterpretationSentence,
  subjectToDreamSlug,
} from "./socialImageCaption";

test("builds a dream page URL from a slug and falls back to the homepage", () => {
  assert.equal(dreamPageUrl("dog-and-snake"), `${DREAMLY_SOCIAL_URL}/dreams/dog-and-snake`);
  assert.equal(dreamPageUrl(""), DREAMLY_SOCIAL_URL);
});

test("slugifies a subject onto a dictionary path", () => {
  assert.equal(subjectToDreamSlug("Dog and Snake"), "dog-and-snake");
});

test("takes only the first sentence of the interpretation", () => {
  assert.equal(
    firstInterpretationSentence(
      "A dog and snake in the same dream place trust beside suspicion. The dog usually represents loyalty.",
    ),
    "A dog and snake in the same dream place trust beside suspicion.",
  );
});

test("puts the site invitation and page URL before the interpretation sentence", () => {
  const caption = buildDreamImageCaption(
    "https://dreamly.art/dreams/dog-and-snake",
    "A dog and snake in the same dream place trust beside suspicion.",
  );
  assert.equal(
    caption,
    `${DREAMLY_SOCIAL_CTA_HEADLINE}\n👉 https://dreamly.art/dreams/dog-and-snake\n\nA dog and snake in the same dream place trust beside suspicion.`,
  );
  const invitationAt = caption.indexOf(DREAMLY_SOCIAL_CTA_HEADLINE);
  const urlAt = caption.indexOf("https://dreamly.art/dreams/dog-and-snake");
  const sentenceAt = caption.indexOf("A dog and snake");
  assert.ok(invitationAt === 0);
  assert.ok(urlAt > invitationAt);
  assert.ok(sentenceAt > urlAt);
});
