import assert from "node:assert/strict";
import { test } from "node:test";
import { lifePath, parseBirthDate, zodiacSign } from "./loveCompatibility";

test("validates dates and uses the expected zodiac boundaries", () => {
  assert.equal(parseBirthDate("2025-02-30"), null);
  assert.equal(zodiacSign("1995-03-20"), "pisces");
  assert.equal(zodiacSign("1995-03-21"), "aries");
  assert.equal(zodiacSign("1995-12-22"), "capricorn");
  assert.equal(lifePath("1995-05-12"), 5);
});

test("profile helpers derive symbols without assigning a compatibility score", () => {
  assert.equal(zodiacSign("1995-05-12"), "taurus");
  assert.equal(zodiacSign("1996-09-18"), "virgo");
  assert.equal(lifePath("1995-05-12"), 5);
  assert.equal(lifePath("1996-09-18"), 7);
  assert.equal(zodiacSign("2025-02-30"), null);
});
