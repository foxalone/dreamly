import assert from "node:assert/strict";
import test from "node:test";
import { tarotReturnPath } from "./returnPath";

test("returns to the exact page that opened a reading", () => {
  assert.equal(tarotReturnPath("/app/map?layer=kingdoms#city", "en"), "/app/map?layer=kingdoms#city");
  assert.equal(tarotReturnPath("/ru/moon", "en"), "/ru/moon");
});

test("direct and unsafe reading links fall back to the localized feed", () => {
  for (const back of [undefined, ["/moon"], "https://other.example/", "//other.example/", "/\\other.example/", "/ad/unlock", "/ru/ad/unlock"]) {
    assert.equal(tarotReturnPath(back, "ru"), "/ru/app/shared");
  }
});
