import assert from "node:assert/strict";
import test from "node:test";
import { DREAM_ANALYSIS_FALLBACK_MODEL, DREAM_ANALYSIS_MODEL } from "./aiModels";
import { dreamAnalysisErrorCode, generateDreamAnalysis } from "./dreamAnalysisProvider";
import { dreamAnalysisErrorMessage } from "./i18n/dreamAnalysisErrors";
import { LOCALES } from "./i18n/config";

test("temporary provider rate limit uses the backup model once", async () => {
  const models: string[] = [];
  const result = await generateDreamAnalysis(async (model) => {
    models.push(model);
    if (model === DREAM_ANALYSIS_MODEL) throw { status: 429, code: "rate_limit_exceeded" };
    return "A useful interpretation";
  });
  assert.deepEqual(models, [DREAM_ANALYSIS_MODEL, DREAM_ANALYSIS_FALLBACK_MODEL]);
  assert.deepEqual(result, { analysis: "A useful interpretation", model: DREAM_ANALYSIS_FALLBACK_MODEL });
});

test("account balance and unrelated provider failures do not trigger another billable request", async () => {
  for (const error of [{ status: 429, code: "insufficient_quota" }, { status: 503 }]) {
    let calls = 0;
    await assert.rejects(generateDreamAnalysis(async () => { calls++; throw error; }), (caught) => caught === error);
    assert.equal(calls, 1);
  }
  assert.equal(dreamAnalysisErrorCode({ status: 429, code: "insufficient_quota" }), "AI_QUOTA_EXHAUSTED");
  assert.equal(dreamAnalysisErrorCode({ status: 429, code: "rate_limit_exceeded" }), "AI_RATE_LIMITED");
});

test("provider failures have visitor copy in every supported language", () => {
  for (const locale of LOCALES) {
    for (const code of ["AI_QUOTA_EXHAUSTED", "AI_RATE_LIMITED", "AI_TIMEOUT", "AI_UNAVAILABLE"]) {
      assert.ok(dreamAnalysisErrorMessage(code, locale));
    }
    assert.equal(dreamAnalysisErrorMessage("UNRECOGNIZED", locale), null);
  }
});
