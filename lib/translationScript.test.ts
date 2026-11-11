import assert from "node:assert/strict";
import test from "node:test";

import { translationMatchesTarget } from "./translationScript";

const arabic = "أنا حلمت كأني ذهبت مع خالي محمد إلى السوق";
const editedArabic = "أنا حلمت كأنني ذهبت مع خالي محمد إلى السوق";

test("a corrected copy of an Arabic dream is not a Russian translation", () => {
  assert.equal(translationMatchesTarget(editedArabic, "ru", arabic, "ar"), false);
  assert.equal(translationMatchesTarget(arabic, "ru", arabic, "ar"), false);
});

test("a Russian translation is accepted and an unchanged English source is not Spanish", () => {
  assert.equal(translationMatchesTarget("Мне приснилось, что я пошла с дядей Мухаммадом на рынок.", "ru", arabic, "ar"), true);
  assert.equal(translationMatchesTarget("I went to the market.", "es", "I went to the market.", "en"), false);
  assert.equal(translationMatchesTarget("Fui al mercado con mi tío.", "es", "I went to the market.", "en"), true);
});
