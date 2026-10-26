import assert from "node:assert/strict";
import test from "node:test";
import { isAiVideoMode } from "./adminAiVideo";
import { isAiImageProvider, sourceLabelForImage } from "./adminAiImage";
import { aiVideoConfig } from "../app/api/admin/ai-video/_lib";
import { aiImageConfig } from "../app/api/admin/ai-image/_lib";

test("generation accepts Veo and rejects retired Sora modes and providers", () => {
  assert.equal(isAiVideoMode("veo"), true);
  assert.equal(isAiImageProvider("veo"), true);
  for (const value of ["preview", "standard", "combined", "sora", "", null, undefined]) {
    assert.equal(isAiVideoMode(value), false);
    assert.equal(isAiImageProvider(value), false);
  }
});

test("generation configuration only advertises Veo pricing", () => {
  assert.deepEqual(Object.keys(aiVideoConfig().prices), ["veo"]);
  assert.deepEqual(Object.keys(aiImageConfig().prices), ["veo"]);
  assert.equal("model" in aiVideoConfig(), false);
  assert.equal("soraModel" in aiImageConfig(), false);
});

test("existing images keep their original library source labels", () => {
  assert.equal(sourceLabelForImage("sora"), "Image · Sora");
  assert.equal(sourceLabelForImage("veo"), "Image · Veo");
});
